import { callOpenRouter, extractJson } from "../lib/openrouter.ts";
import type { DocumentInfo, ExtractedDocument, DocumentOutline } from "../lib/types.ts";

export async function extractTextsFromPdfs(
  apiKey: string,
  documents: DocumentInfo[],
  pdfDataUrls: Map<string, string>,
): Promise<ExtractedDocument[]> {
  const results: ExtractedDocument[] = [];
  for (const doc of documents) {
    console.log(`Extracting: ${doc.title}`);
    const result = await extractSinglePdf(apiKey, doc, pdfDataUrls.get(doc.id)!);
    results.push(result);
  }
  return results;
}

async function extractSinglePdf(
  apiKey: string,
  doc: DocumentInfo,
  pdfSource: string,
): Promise<ExtractedDocument> {
  const prompt = `You are a document analysis assistant. Your ONLY job is to extract and structure the content of this PDF document.

CRITICAL RULES:
- Extract ONLY what is actually written in the document
- Do NOT add any outside knowledge or interpretation
- Do NOT summarize — preserve the full content
- Include page markers where possible (e.g. [Page 1], [Page 2])

Respond with ONLY valid JSON in this structure:
{
  "extractedText": "The full text content of the document with [Page X] markers",
  "outline": {
    "mainSubject": "The primary subject/topic of the document",
    "totalPages": null,
    "topics": [
      {
        "title": "Topic/section title",
        "startSection": "First few words of where this topic starts",
        "endSection": "First few words of where this topic ends",
        "summary": "1-2 sentence summary of this section FROM the document only"
      }
    ]
  }
}`;

  const text = await callOpenRouter(
    apiKey,
    [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "file",
            file: { filename: `${doc.title}.pdf`, file_data: pdfSource },
          },
        ],
      },
    ],
    "google/gemini-2.5-flash",
    [{ id: "file-parser", pdf: { engine: "pdf-text" } }],
  );

  const parsed = JSON.parse(extractJson(text));

  return {
    documentId: doc.id,
    title: doc.title,
    extractedText: parsed.extractedText ?? "",
    outline: parsed.outline ?? { topics: [], totalPages: null, mainSubject: doc.title },
  };
}
