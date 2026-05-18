import { NextResponse } from "next/server";
import { createKnowledgeItem } from "@/lib/knowledgeBase";
import { createKnowledge, listKnowledge } from "@/lib/repository";

export async function GET() {
  const knowledge = await listKnowledge();
  return NextResponse.json({ knowledge });
}

export async function POST(request: Request) {
  const body = await request.json();
  const item = createKnowledgeItem({
    type: body.type,
    title: body.title,
    source: body.source,
    content: body.content,
    keywords: body.keywords ?? [],
    tags: body.tags ?? []
  });
  const saved = await createKnowledge(item);
  return NextResponse.json({ item: saved });
}
