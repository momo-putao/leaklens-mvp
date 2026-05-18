import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import * as XLSX from "xlsx";
import { ParsedDocument, ParsedDocumentBlock } from "./types";

const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

function makeBlocks(text: string, sourcePrefix = "正文"): ParsedDocumentBlock[] {
  return text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 80)
    .map((item, index) => ({
      id: makeId("block"),
      source: `${sourcePrefix} ${index + 1}`,
      text: item
    }));
}

function normalizeXmlText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(normalizeXmlText).join("");
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map(normalizeXmlText).join("");
  }
  return "";
}

async function parsePptx(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const parser = new XMLParser({
    ignoreAttributes: false
  });
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const blocks: ParsedDocumentBlock[] = [];
  for (const [index, slideName] of slideNames.entries()) {
    const raw = await zip.files[slideName].async("string");
    const parsed = parser.parse(raw);
    const text = normalizeXmlText(parsed).replace(/\s+/g, " ").trim();
    if (text) {
      blocks.push({
        id: makeId("block"),
        source: `幻灯片 ${index + 1}`,
        text
      });
    }
  }

  return {
    text: blocks.map((block) => `[${block.source}]\n${block.text}`).join("\n\n"),
    blocks
  };
}

export async function parseDocumentFile(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const lowerName = file.name.toLowerCase();
  let text = "";
  let blocks: ParsedDocumentBlock[] = [];

  if (lowerName.endsWith(".txt")) {
    text = buffer.toString("utf-8");
    blocks = makeBlocks(text, "TXT 段落");
  } else if (lowerName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
    blocks = makeBlocks(text, "DOCX 段落");
  } else if (lowerName.endsWith(".pdf")) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    text = result.text;
    await parser.destroy();
    blocks = makeBlocks(text, "PDF 段落");
  } else if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    blocks = workbook.SheetNames.flatMap((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      return rows.slice(0, 120).map((row, index) => ({
        id: makeId("block"),
        source: `${sheetName} 第 ${index + 1} 行`,
        text: Object.entries(row)
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join("；")
      }));
    }).filter((block) => block.text.trim());
    text = blocks.map((block) => `[${block.source}] ${block.text}`).join("\n");
  } else if (lowerName.endsWith(".pptx")) {
    const parsed = await parsePptx(buffer);
    text = parsed.text;
    blocks = parsed.blocks;
  } else {
    throw new Error("暂不支持该文件类型，请上传 PDF、DOCX、Excel、PPTX 或 TXT 文件。");
  }

  if (!text.trim()) throw new Error("未能从文件中抽取到可审查文本。");

  return {
    id: makeId("doc"),
    fileName: file.name,
    fileType: lowerName.split(".").pop()?.toUpperCase() ?? "UNKNOWN",
    text,
    blocks,
    createdAt: new Date().toISOString()
  };
}
