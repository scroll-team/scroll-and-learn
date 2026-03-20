import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createServiceClient, createUserClient } from "./lib/supabase.ts";
import { designCurriculum } from "./agents/architect.ts";
import { createAllLessonContent, createLessonContent } from "./agents/creator.ts";
import { judgeLessons } from "./agents/judge.ts";
import type { PipelineSettings, LessonContent } from "./lib/types.ts";

const MAX_RETRIES = 2;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  console.log("Auth header present:", !!authHeader, "length:", authHeader.length);

  const supabase = createServiceClient(authHeader);
  const userClient = createUserClient(authHeader);

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  let collectionId: string | null = null;

  try {
    const body = await req.json();
    collectionId = body.collection_id ?? null;
    const options = body.options ?? {};

    if (!collectionId) {
      return new Response(
        JSON.stringify({ error: "collection_id is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    console.log("getUser result:", user?.id ?? "null", "error:", userErr?.message ?? "none");
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: `Unauthorized: ${userErr?.message ?? "no user"}` }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const userId = user.id;
    const settings: PipelineSettings = options;

    await supabase.from("study_plans").delete().eq("collection_id", collectionId);

    const { data: planRow, error: planErr } = await supabase
      .from("study_plans")
      .insert({
        collection_id: collectionId,
        user_id: userId,
        title: "Generating…",
        status: "generating",
        pipeline_step: "planning",
        settings,
      })
      .select()
      .single();

    if (planErr) throw new Error(`Failed to create study plan: ${planErr.message}`);
    const studyPlanId = planRow.id;

    async function updateStep(step: string) {
      await supabase.from("study_plans").update({ pipeline_step: step }).eq("id", studyPlanId);
    }

    // PDF extraction is done client-side. Read pre-extracted text from DB.
    const { data: docs, error: docsErr } = await supabase
      .from("documents")
      .select("id, title")
      .eq("collection_id", collectionId);

    if (docsErr) throw new Error(docsErr.message);
    if (!docs?.length) throw new Error("No documents in this collection");

    const { data: extracts, error: extErr } = await supabase
      .from("document_extracts")
      .select("document_id, extracted_text, outline")
      .in("document_id", docs.map((d: any) => d.id));

    if (extErr) throw new Error(extErr.message);
    if (!extracts?.length) {
      throw new Error("No extracted text found. PDFs may still be processing.");
    }

    const allExtracts = extracts.map((e: any) => ({
      documentId: e.document_id,
      title: docs.find((d: any) => d.id === e.document_id)?.title ?? "",
      extractedText: e.extracted_text,
      outline: e.outline,
    }));

    // ── Step 1: Agent 1 — Architect ────────────────────────────────────────
    await updateStep("planning");
    console.log(`Found ${allExtracts.length} pre-extracted documents. Starting Architect...`);

    const collectionRow = await supabase
      .from("collections")
      .select("title")
      .eq("id", collectionId)
      .single();

    const collectionTitle = collectionRow.data?.title ?? "Study Collection";

    const curriculum = await designCurriculum(apiKey, allExtracts, collectionTitle, settings);
    console.log(`Curriculum designed: ${curriculum.lessons.length} lessons`);

    await supabase
      .from("study_plans")
      .update({ title: curriculum.title, description: curriculum.description })
      .eq("id", studyPlanId);

    // ── Step 4: Agent 2 — Content Creators (batched) ────────────────────
    await updateStep("creating");

    let lessonContents = await createAllLessonContent(apiKey, curriculum.lessons, settings);
    console.log(`Content created for ${lessonContents.length} lessons`);

    // ── Step 5: Agent 3 — Judge ──────────────────────────────────────────
    await updateStep("reviewing");

    const verdicts = await judgeLessons(apiKey, lessonContents);
    const rejectedCount = verdicts.filter((v) => !v.approved).length;
    console.log(`Judge: ${verdicts.length - rejectedCount} approved, ${rejectedCount} rejected`);

    // ── Step 6: Retry rejected lessons ──────────────────────────────────
    let rejectedIndices = verdicts.filter((v) => !v.approved).map((v) => v.lessonIndex);

    for (let attempt = 0; attempt < MAX_RETRIES && rejectedIndices.length > 0; attempt++) {
      await updateStep("retrying");
      console.log(`Retry attempt ${attempt + 1} for ${rejectedIndices.length} lessons`);

      const retryTasks = rejectedIndices.map((idx) => {
        const verdict = verdicts.find((v) => v.lessonIndex === idx);
        return createLessonContent(apiKey, curriculum.lessons[idx], settings, verdict?.feedback);
      });
      const retried = await Promise.all(retryTasks);

      for (let i = 0; i < rejectedIndices.length; i++) {
        lessonContents[rejectedIndices[i]] = retried[i];
      }

      if (attempt < MAX_RETRIES - 1) {
        const reVerdicts = await judgeLessons(apiKey, lessonContents);
        rejectedIndices = reVerdicts.filter((v) => !v.approved).map((v) => v.lessonIndex);
      } else {
        rejectedIndices = [];
      }
    }

    // ── Step 7: Save everything to DB ──────────────────────────────────
    await updateStep("saving");
    console.log("Saving lessons to database...");

    for (const lc of lessonContents) {
      const { data: lessonRow, error: lessonErr } = await supabase
        .from("lessons")
        .insert({
          study_plan_id: studyPlanId,
          user_id: userId,
          title: lc.lessonTitle,
          summary: lc.summary,
          order_index: lc.orderIndex,
          slideshow_cards: lc.slideshowCards,
          story_cards: lc.storyCards,
        })
        .select()
        .single();

      if (lessonErr) throw new Error(`Failed to save lesson: ${lessonErr.message}`);

      const { error: quizErr } = await supabase.from("quizzes").insert({
        lesson_id: lessonRow.id,
        user_id: userId,
        title: lc.quiz.title,
        questions: lc.quiz.questions,
        difficulty: settings.difficulty ?? "medium",
      });

      if (quizErr) throw new Error(`Failed to save quiz: ${quizErr.message}`);
    }

    await supabase.from("study_plans").update({ status: "ready", pipeline_step: "ready" }).eq("id", studyPlanId);
    await supabase.from("collections").update({ status: "ready" }).eq("id", collectionId);
    console.log("Pipeline complete!");

    return new Response(
      JSON.stringify({ success: true, study_plan_id: studyPlanId }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Pipeline error:", message);

    if (collectionId) {
      try {
        await supabase
          .from("study_plans")
          .update({ status: "error", pipeline_step: "error", error_message: message })
          .eq("collection_id", collectionId)
          .eq("status", "generating");

        await supabase
          .from("collections")
          .update({ status: "error" })
          .eq("id", collectionId);
      } catch (dbErr) {
        console.error("Failed to update error status:", dbErr);
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
