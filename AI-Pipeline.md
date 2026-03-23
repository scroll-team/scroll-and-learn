# LearnAnything — AI Pipeline Documentation

This document describes how the multi-agent AI pipeline works: how PDFs become a complete study plan with slideshows, story cards, and quizzes.

---

## Architecture Overview

All AI processing runs **on the user's device** (client-side) via the [OpenRouter](https://openrouter.ai) API. There is no server-side AI orchestration — this decision was made to avoid timeout limits on serverless functions and to leverage the reliability of direct client-to-API calls.

**Current model:** `google/gemini-2.5-flash`  
**API base:** `https://openrouter.ai/api/v1/chat/completions`

---

## Pipeline Flow

```
User taps "Generate Study Plan"
         │
         ▼
[Step 1] Create study_plan row in Supabase (status: generating)
         │
         ▼
[Step 2] PDF Extraction — Agent 0 (Extractor)
         │  Reads each PDF locally from device cache
         │  Sends to OpenRouter with pdf-text plugin
         │  Saves extracted text + outline → document_extracts table
         ▼
[Step 3] Architect Agent
         │  Receives: document metadata (titles + topic outlines) — NO raw text
         │  Outputs: lesson structure with document/topic references
         │  System assembles source text per lesson programmatically
         ▼
[Step 4] Content Creator Agents (parallel, batches of 3)
         │  Each lesson → 1 Creator Agent call
         │  Outputs: slideshow cards + story cards + quiz
         ▼
[Step 5] Judge Agent
         │  Reviews ALL lessons vs their source text
         │  Outputs: approved / rejected + feedback per lesson
         ▼
[Step 6] Retry rejected lessons (max 2 attempts)
         │  Failed lessons are regenerated with Judge feedback
         │  Individual lesson retries: up to 2 internal retries per lesson
         ▼
[Step 7] Save to Supabase
         │  Auth session is refreshed first
         │  Each lesson and quiz saved with retry logic (3 attempts)
         ▼
[Step 8] Mark study_plan + collection → status: ready
```

---

## Critical Rule: Source-Only Content

**Every agent in this pipeline is strictly forbidden from using outside knowledge.**  
All content generated — slide text, story cards, quiz questions, explanations — must come exclusively from the user's uploaded documents. This rule is enforced in every prompt.

---

## Agent 0 — PDF Extractor

**File:** `lib/ai/providers/openrouter.ts` → `extractTextFromPdf()`  
**When it runs:** Step 2. Skipped per document if an extract already exists in `document_extracts`.

**How it works:**
- Reads the PDF from the local device cache as a base64 data URL
- Sends the file to OpenRouter using the `file-parser` plugin with `pdf-text` engine
- The model extracts text and returns structured JSON with the full text and a topic outline

**Prompt:**
```
You are a document text extractor. Extract the full text from this PDF.

RULES:
- Extract ONLY what is written in the document
- Do NOT add outside knowledge
- Do NOT summarize — preserve the full content
- You MUST respond with ONLY valid JSON, no other text before or after

JSON structure (required):
{
  "extractedText": "The full text content of the document",
  "outline": {
    "mainSubject": "The primary subject of the document",
    "totalPages": null,
    "topics": [
      {
        "title": "Section title",
        "startSection": "First few words of this section",
        "endSection": "First few words of where this section ends",
        "summary": "1-2 sentence summary from the document only"
      }
    ]
  }
}
```

**Output stored in:** `document_extracts` table (`extracted_text`, `outline` columns)

**Fallback:** If the model returns plain text instead of JSON, the raw text is used directly as `extractedText` with an empty outline.

---

## Agent 1 — Architect

**File:** `lib/ai/pipeline.ts` → `designCurriculum()`  
**When it runs:** Step 3, once per study plan.

**How it works:**
- Receives a compact summary of each document: title, subject, and topic names — **no raw text**
- Decides how many lessons to create: `min(numDocs × 2, 8)`, minimum 3
- Outputs lesson structure with references (document title + topic names) to indicate which source material each lesson covers
- The system then **programmatically assembles** the actual source text for each lesson from `document_extracts` using those references — the AI never copies raw text, which prevents LaTeX escape sequences from corrupting JSON

**Prompt:**
```
You are an expert curriculum designer. Below are the topics and structure of {N} document(s)
from a study collection called "{collectionTitle}".

CRITICAL RULES:
- Only create lessons about topics ACTUALLY PRESENT in the documents listed below
- Do NOT invent topics or add outside knowledge
- Every lesson objective must reference content from the listed documents

Design exactly {numLessons} lessons.
[language / focus constraints]

For each lesson, specify:
1. A clear title
2. 2-3 learning objectives grounded in the documents
3. Which documents and topic titles each lesson should cover
   (so the source text can be retrieved)

IMPORTANT: Do NOT copy or quote any document text. Only reference document titles and topic names.

Respond with ONLY valid JSON (no other text):
{
  "title": "Curriculum title",
  "description": "2-3 sentence overview of the full curriculum",
  "lessons": [
    {
      "title": "Lesson title",
      "objectives": ["Objective 1", "Objective 2"],
      "orderIndex": 0,
      "sources": [
        {
          "documentTitle": "Exact document title from the list below",
          "topicTitles": ["Exact topic title 1", "Exact topic title 2"]
        }
      ]
    }
  ]
}

AVAILABLE DOCUMENTS:
{docSummary}
```

**Source text assembly (after Architect responds):**
- For each lesson, `assembleSourceText()` looks up the referenced document/topics in the stored extracts and slices the relevant sections
- If no matching section is found, it falls back to splitting all document text evenly across lessons
- Each lesson's source text is capped at **12,000 characters**

**Output:** A `Curriculum` object with `lessons[]`, each containing `title`, `objectives`, `sourceText`, `orderIndex`

---

## Agent 2 — Content Creator

**File:** `lib/ai/pipeline.ts` → `createLessonContent()` / `createAllLessonContent()`  
**When it runs:** Step 4. One agent call per lesson, run in **parallel batches of 3**.

**How it works:**
- Receives: lesson title, objectives, and the assembled source text (≤ 12,000 chars)
- Produces: slideshow cards (mini-lecture), story cards (TikTok-style), and a 5-question quiz
- If called during a retry (Step 6), the Judge's feedback is appended to the prompt

**Prompt:**
```
You are an expert educational content creator. Create learning content for one lesson.

ABSOLUTE RULE: Use ONLY information from the SOURCE TEXT below. Do NOT add outside knowledge.

LESSON: "{lesson.title}"
OBJECTIVES: {objectives joined by "; "}

{languageRule}
{focusRule}
{difficultyGuide}
{retryClause — only present on retry, includes Judge's feedback}

Create the following and respond with ONLY valid JSON:
{
  "summary": "2-3 sentence summary of what this lesson teaches (from source text only)",
  "slideshowCards": [
    {
      "title": "Slide title",
      "body": "2-4 sentence explanation",
      "keyPoints": ["Key point 1", "Key point 2"],
      "example": "Optional example from source",
      "order": 0
    }
  ],
  "storyCards": [
    { "headline": "Short punchy headline", "body": "1-2 sentences", "emoji": "📚", "order": 0 }
  ],
  "quiz": {
    "title": "Quiz title",
    "questions": [
      {
        "question": "Question text",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": 0,
        "explanation": "Why this is correct per the source text"
      }
    ]
  }
}

Rules:
- slideshowCards: 6-10 slides (mini-lecture)
- storyCards: 4-6 cards (TikTok-style, one emoji each)
- quiz: exactly 5 multiple-choice questions

SOURCE TEXT:
{lesson.sourceText}
```

**Difficulty guide injected into prompt:**
| Difficulty | Instruction |
|------------|-------------|
| `easy`     | Questions should test basic recall. Slideshows should use the simplest possible language. |
| `medium`   | Questions should require understanding and application of concepts. |
| `hard`     | Questions should challenge deep understanding and require analysis. |

**Retry logic:**  
`createLessonContent()` wraps `_createLessonContent()` with up to **2 internal retries** if JSON parsing fails. This handles transient cases where the model returns malformed JSON for a specific lesson.

**Output:** `LessonContent` object with `slideshowCards[]`, `storyCards[]`, `quiz`, `summary`

---

## Agent 3 — Judge

**File:** `lib/ai/pipeline.ts` → `judgeLessons()`  
**When it runs:** Step 5, once per study plan after all Creator agents finish.

**How it works:**
- Receives: a summarized view of all lessons (first 2,000 chars of source text + slide/story/quiz previews)
- Reviews each lesson for source fidelity, factual accuracy, and question quality
- Returns a verdict (approved/rejected) and specific feedback for each lesson
- Rejected lessons are sent back to the Creator agent for regeneration (max **2 retry rounds**)

**Prompt:**
```
You are a quality reviewer for educational content. Your job: verify AI-generated materials
are faithful to their source documents.

REVIEW CRITERIA (most important first):
1. SOURCE FIDELITY: Every fact, claim, and quiz answer must come ONLY from the provided
   source text. Any outside knowledge = REJECT.
2. FACTUAL ACCURACY: Quiz answers must be correct per the source.
3. QUESTION QUALITY: Questions must be clear with exactly one correct answer.
4. CONTENT COVERAGE: Lesson should reasonably cover its source material.

For each lesson output approved (true/false) and feedback.

Respond with ONLY valid JSON:
{
  "verdicts": [
    { "lessonIndex": 0, "approved": true, "feedback": "OK" },
    { "lessonIndex": 1, "approved": false, "feedback": "Specific issues to fix" }
  ]
}

LESSONS:
{lessonSummaries — for each lesson: source preview + slide titles + story headlines + quiz questions}
```

**Fallback:** If the Judge returns fewer verdicts than there are lessons, the missing ones are automatically marked as approved.

---

## User-Configurable Settings

When tapping "Generate Study Plan", the user can configure:

| Setting | Values | Effect |
|---------|--------|--------|
| **Language** | Auto / any language | All agents write output in the specified language |
| **Difficulty** | Easy / Medium / Hard | Passed to Creator agent; changes question complexity |
| **Focus** | Free text ("focus on the math part") | Injected into Architect and Creator prompts to bias topic selection |

---

## JSON Parsing — Resilience Layer

AI models occasionally produce invalid JSON (e.g., LaTeX commands like `\chapter` create invalid escape sequences). `safeJsonParse()` in `lib/ai/pipeline.ts` tries three strategies before failing:

1. **Direct parse** — standard `JSON.parse()`
2. **Escape sanitization** — replaces `\X` (where X is not a valid JSON escape) with `\\X`
3. **Aggressive sanitization** — protects all valid escape sequences, then double-escapes every remaining lone backslash

---

## Data Storage

| Step | Table | What is stored |
|------|-------|----------------|
| Step 2 | `document_extracts` | `extracted_text`, `outline` per PDF |
| Step 3 | `study_plans` | `title`, `description`, `pipeline_step` (updated at each step) |
| Step 7 | `lessons` | `title`, `summary`, `slideshow_cards`, `story_cards`, `order_index` |
| Step 7 | `quizzes` | `title`, `questions`, `difficulty` |
| Step 8 | `study_plans` | `status: ready` |
| Step 8 | `collections` | `status: ready` |

---

## Save Reliability

After a long pipeline run (20-30 min), the network connection to Supabase can drop. Before saving, the pipeline:
1. Calls `supabase.auth.refreshSession()` to re-establish the connection
2. Wraps every `lessons` and `quizzes` insert in `saveWithRetry()` — up to **3 attempts** with exponential back-off (2s → 5s → 10s)
