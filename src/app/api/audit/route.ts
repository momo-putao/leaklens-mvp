import { NextResponse } from "next/server";
import { listAuditLogs } from "@/lib/repository";

export async function GET() {
  const auditLogs = await listAuditLogs();
  return NextResponse.json({ auditLogs });
}
