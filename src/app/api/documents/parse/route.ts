import { NextResponse } from "next/server";
import { parseDocumentFile } from "@/lib/documentParser";
import { appendAuditLog } from "@/lib/serverMemory";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传文件。" }, { status: 400 });
    }

    const parsed = await parseDocumentFile(file);
    appendAuditLog({
      action: "PARSE_DOCUMENT",
      target: parsed.fileName,
      detail: { fileType: parsed.fileType, blocks: parsed.blocks.length }
    });
    return NextResponse.json({ document: parsed });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "文件解析失败。" }, { status: 400 });
  }
}
