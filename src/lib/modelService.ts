import OpenAI from "openai";
import { analyzeDocument } from "./riskEngine";
import { DocumentReview, DocumentType, KnowledgeItem, RecipientType, RewriteMode, ReviewScenario } from "./types";

type AnalyzeInput = {
  title: string;
  originalText: string;
  scenario: ReviewScenario;
  documentType: DocumentType;
  recipientType: RecipientType;
  submitter: string;
  department: string;
  mode: RewriteMode;
  knowledgeBase: KnowledgeItem[];
  sourceFileName?: string;
  sourceFileType?: string;
};

function client() {
  if (!process.env.OPENAI_API_KEY) return null;

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
  });
}

function extractJson(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenced?.[1] ?? trimmed);
}

export async function riskAnalyze(input: AnalyzeInput): Promise<DocumentReview> {
  const fallback = analyzeDocument(input);
  fallback.sourceFileName = input.sourceFileName;
  fallback.sourceFileType = input.sourceFileType;

  const openai = client();
  if (!openai) {
    fallback.modelStatus = "rule_fallback";
    return fallback;
  }

  try {
    const citations = input.knowledgeBase
      .filter((item) => item.enabled)
      .slice(0, 8)
      .map((item) => `${item.type}｜${item.title}｜${item.content}`)
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "你是企业商业秘密合规审查专家。只返回 JSON，不要 Markdown。字段包括 riskLevel, score, tags, legalBasis, recommendation, sanitizedText, findings, remediationTasks。"
        },
        {
          role: "user",
          content: JSON.stringify({
            scenario: input.scenario,
            documentType: input.documentType,
            recipientType: input.recipientType,
            knowledge: citations,
            text: input.originalText
          })
        }
      ]
    });

    const data = extractJson(completion.choices[0]?.message.content ?? "{}");
    const merged: DocumentReview = {
      ...fallback,
      riskLevel: data.riskLevel ?? fallback.riskLevel,
      score: Number.isFinite(data.score) ? Math.max(0, Math.min(100, Number(data.score))) : fallback.score,
      tags: Array.isArray(data.tags) ? data.tags : fallback.tags,
      legalBasis: data.legalBasis ?? fallback.legalBasis,
      recommendation: data.recommendation ?? fallback.recommendation,
      findings: Array.isArray(data.findings) && data.findings.length ? data.findings.map((finding: Record<string, unknown>, index: number) => ({
        id: `ai_finding_${index}_${Math.random().toString(36).slice(2, 7)}`,
        snippet: String(finding.snippet ?? ""),
        tag: String(finding.tag ?? fallback.tags[0] ?? "客户信息") as DocumentReview["tags"][number],
        reason: String(finding.reason ?? "模型识别为潜在商业秘密风险。"),
        legalBasis: String(finding.legalBasis ?? fallback.legalBasis),
        action: String(finding.action ?? "建议脱敏并提交法务复核。")
      })) : fallback.findings,
      sanitizedVersions: [
        {
          ...fallback.sanitizedVersions[0],
          text: data.sanitizedText ?? fallback.sanitizedVersions[0]?.text ?? input.originalText
        }
      ],
      modelStatus: "ai_generated",
      sourceFileName: input.sourceFileName,
      sourceFileType: input.sourceFileType
    };

    return merged;
  } catch (error) {
    fallback.modelStatus = "ai_error_fallback";
    fallback.recommendation = `${fallback.recommendation} 模型调用失败，已自动降级为本地规则审查。`;
    fallback.sourceFileName = input.sourceFileName;
    fallback.sourceFileType = input.sourceFileType;
    return fallback;
  }
}

export async function rewriteSafe(input: AnalyzeInput) {
  return riskAnalyze(input);
}

export async function generateTrainingCase(input: AnalyzeInput) {
  return riskAnalyze(input);
}

export async function extractKnowledgeMetadata(content: string) {
  const keywords = Array.from(new Set(content.match(/[\u4e00-\u9fa5A-Za-z0-9]{2,}/g)?.slice(0, 12) ?? []));
  return {
    keywords,
    tags: ["客户信息", "报价策略", "技术方案"].filter((tag) => content.includes(tag))
  };
}
