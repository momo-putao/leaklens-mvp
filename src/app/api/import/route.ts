import { NextResponse } from "next/server";
import { createKnowledgeItem } from "@/lib/knowledgeBase";
import { parseDocumentFile } from "@/lib/documentParser";
import { extractKnowledgeMetadata } from "@/lib/modelService";
import { createKnowledge } from "@/lib/repository";
import { KnowledgeType, RiskTag } from "@/lib/types";

function inferType(fileName: string): KnowledgeType {
  if (/合同|NDA|保密/i.test(fileName)) return "合同条款";
  if (/案例|事件|复盘/i.test(fileName)) return "历史案例";
  if (/法律|法规|反不正当竞争/i.test(fileName)) return "法律法规";
  if (/标签|规则/i.test(fileName)) return "标签规则";
  return "企业制度";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const files = form.getAll("files").filter((item): item is File => item instanceof File);
  const imported = [];

  for (const file of files) {
    const parsed = await parseDocumentFile(file);
    const metadata = await extractKnowledgeMetadata(parsed.text);
    const item = createKnowledgeItem({
      type: inferType(file.name),
      title: file.name.replace(/\.[^.]+$/, ""),
      source: `资料导入中心 / ${file.name}`,
      content: parsed.text.slice(0, 3000),
      keywords: metadata.keywords,
      tags: (metadata.tags.length ? metadata.tags : ["客户信息"]) as RiskTag[]
    });
    imported.push(await createKnowledge(item));
  }

  return NextResponse.json({ imported });
}
