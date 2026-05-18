import { NextResponse } from "next/server";
import { listReviews } from "@/lib/repository";

export async function GET() {
  const reviews = await listReviews();
  return NextResponse.json({ reviews });
}
