import { defaultKnowledgeBase } from "./knowledgeBase";
import { databaseEnabled, prisma } from "./prisma";
import { appendAuditLog, memoryStore } from "./serverMemory";
import { DocumentReview, KnowledgeItem } from "./types";

function reviewToPrismaData(review: DocumentReview) {
  return {
    id: review.id,
    title: review.title,
    originalText: review.originalText,
    scenario: review.scenario,
    documentType: review.documentType,
    recipientType: review.recipientType,
    submitter: review.submitter,
    department: review.department,
    riskLevel: review.riskLevel,
    score: review.score,
    status: review.status,
    legalBasis: review.legalBasis,
    recommendation: review.recommendation,
    summary: review.summary,
    modelStatus: review.modelStatus ?? "rule_fallback",
    sourceFileName: review.sourceFileName,
    sourceFileType: review.sourceFileType,
    auditSerial: review.auditSerial
  };
}

export async function listReviews() {
  if (!databaseEnabled()) return memoryStore.reviews;

  const rows = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      findings: true,
      citations: true,
      sanitizedVersions: true,
      approvalRecords: true,
      remediationTasks: true,
      trainingCases: true
    }
  });

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    summary: row.summary as DocumentReview["summary"],
    tags: row.findings.map((finding) => finding.tag) as DocumentReview["tags"],
    findings: row.findings,
    citations: row.citations.map((citation) => ({
      id: citation.externalId,
      type: citation.type as KnowledgeItem["type"],
      title: citation.title,
      source: citation.source,
      excerpt: citation.excerpt,
      matchedKeywords: citation.matchedKeywords as string[],
      tags: citation.tags as DocumentReview["tags"]
    })),
    sanitizedVersions: row.sanitizedVersions.map((item) => ({
      ...item,
      mode: item.mode as DocumentReview["sanitizedVersions"][number]["mode"],
      changes: item.changes as string[],
      createdAt: item.createdAt.toISOString()
    })),
    approvalRecords: row.approvalRecords.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
    remediationTasks: row.remediationTasks,
    trainingCases: row.trainingCases.map((item) => ({ ...item, options: item.options as string[] | undefined }))
  })) as DocumentReview[];
}

export async function createReview(review: DocumentReview) {
  const auditSerial = `LL-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const enriched = { ...review, auditSerial };

  if (!databaseEnabled()) {
    memoryStore.reviews.unshift(enriched);
    appendAuditLog({
      action: "CREATE_REVIEW",
      target: enriched.title,
      detail: { riskLevel: enriched.riskLevel, score: enriched.score, auditSerial }
    });
    return enriched;
  }

  await prisma.review.create({
    data: {
      ...reviewToPrismaData(enriched),
      findings: { create: enriched.findings },
      citations: {
        create: enriched.citations.map((citation) => ({
          externalId: citation.id,
          type: citation.type,
          title: citation.title,
          source: citation.source,
          excerpt: citation.excerpt,
          matchedKeywords: citation.matchedKeywords,
          tags: citation.tags
        }))
      },
      sanitizedVersions: {
        create: enriched.sanitizedVersions.map((item) => ({
          id: item.id,
          mode: item.mode,
          text: item.text,
          changes: item.changes,
          createdAt: item.createdAt
        }))
      },
      approvalRecords: { create: enriched.approvalRecords },
      remediationTasks: { create: enriched.remediationTasks },
      trainingCases: { create: enriched.trainingCases }
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "CREATE_REVIEW",
      actor: "演示用户",
      role: "LEGAL",
      target: enriched.title,
      detail: { riskLevel: enriched.riskLevel, score: enriched.score, auditSerial }
    }
  });

  return enriched;
}

export async function listKnowledge() {
  if (!databaseEnabled()) return memoryStore.knowledge;

  const count = await prisma.knowledgeItem.count();
  if (count === 0) {
    await prisma.knowledgeItem.createMany({
      data: defaultKnowledgeBase.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        source: item.source,
        content: item.content,
        keywords: item.keywords,
        tags: item.tags,
        riskWeight: item.riskWeight,
        enabled: item.enabled
      }))
    });
  }

  const rows = await prisma.knowledgeItem.findMany({ orderBy: { updatedAt: "desc" } });
  return rows.map((row) => ({
    ...row,
    type: row.type as KnowledgeItem["type"],
    keywords: row.keywords as string[],
    tags: row.tags as KnowledgeItem["tags"],
    updatedAt: row.updatedAt.toISOString()
  })) as KnowledgeItem[];
}

export async function createKnowledge(item: KnowledgeItem) {
  if (!databaseEnabled()) {
    memoryStore.knowledge.unshift(item);
    appendAuditLog({ action: "CREATE_KNOWLEDGE", target: item.title, detail: { type: item.type } });
    return item;
  }

  await prisma.knowledgeItem.create({
    data: {
      id: item.id,
      type: item.type,
      title: item.title,
      source: item.source,
      content: item.content,
      keywords: item.keywords,
      tags: item.tags,
      riskWeight: item.riskWeight,
      enabled: item.enabled
    }
  });
  await prisma.auditLog.create({
    data: {
      action: "CREATE_KNOWLEDGE",
      actor: "演示用户",
      role: "LEGAL",
      target: item.title,
      detail: { type: item.type }
    }
  });
  return item;
}

export async function updateKnowledge(id: string, patch: Partial<KnowledgeItem>) {
  if (!databaseEnabled()) {
    const index = memoryStore.knowledge.findIndex((item) => item.id === id);
    if (index >= 0) memoryStore.knowledge[index] = { ...memoryStore.knowledge[index], ...patch, updatedAt: new Date().toISOString() };
    appendAuditLog({ action: "UPDATE_KNOWLEDGE", target: id, detail: patch });
    return memoryStore.knowledge[index];
  }

  const updated = await prisma.knowledgeItem.update({
    where: { id },
    data: {
      title: patch.title,
      source: patch.source,
      content: patch.content,
      keywords: patch.keywords,
      tags: patch.tags,
      enabled: patch.enabled,
      riskWeight: patch.riskWeight
    }
  });
  await prisma.auditLog.create({
    data: {
      action: "UPDATE_KNOWLEDGE",
      actor: "演示用户",
      role: "LEGAL",
      target: id,
      detail: patch
    }
  });
  return updated;
}

export async function listAuditLogs() {
  if (!databaseEnabled()) return memoryStore.auditLogs;
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
}
