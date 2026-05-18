import { NextResponse } from "next/server";
import { riskAnalyze } from "@/lib/modelService";
import { createReview, listKnowledge } from "@/lib/repository";

export async function POST(request: Request) {
  const body = await request.json();
  const knowledgeBase = await listKnowledge();
  const review = await riskAnalyze({
    title: body.title,
    originalText: body.originalText,
    scenario: body.scenario,
    documentType: body.documentType,
    recipientType: body.recipientType,
    submitter: body.submitter,
    department: body.department,
    mode: body.mode,
    sourceFileName: body.sourceFileName,
    sourceFileType: body.sourceFileType,
    knowledgeBase
  });
  const saved = await createReview(review);
  return NextResponse.json({ review: saved });
}
