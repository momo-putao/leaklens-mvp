import { NextResponse } from "next/server";
import { updateKnowledge } from "@/lib/repository";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const item = await updateKnowledge(id, body);
  return NextResponse.json({ item });
}
