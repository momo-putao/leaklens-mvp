import { defaultKnowledgeBase } from "./knowledgeBase";
import { DocumentReview, KnowledgeItem } from "./types";

type MemoryStore = {
  reviews: DocumentReview[];
  knowledge: KnowledgeItem[];
  auditLogs: Array<{
    id: string;
    action: string;
    actor: string;
    role: string;
    target?: string;
    detail?: unknown;
    createdAt: string;
  }>;
};

const globalStore = globalThis as unknown as {
  leaklensMemory?: MemoryStore;
};

export const memoryStore: MemoryStore =
  globalStore.leaklensMemory ??
  {
    reviews: [],
    knowledge: defaultKnowledgeBase,
    auditLogs: [
      {
        id: "audit_seed",
        action: "SYSTEM_BOOTSTRAP",
        actor: "LeakLens",
        role: "ADMIN",
        target: "本地企业版",
        detail: { mode: "memory_fallback" },
        createdAt: new Date().toISOString()
      }
    ]
  };

globalStore.leaklensMemory = memoryStore;

export function appendAuditLog(input: {
  action: string;
  actor?: string;
  role?: string;
  target?: string;
  detail?: unknown;
}) {
  const row = {
    id: `audit_${Math.random().toString(36).slice(2, 10)}`,
    action: input.action,
    actor: input.actor ?? "演示用户",
    role: input.role ?? "LEGAL",
    target: input.target,
    detail: input.detail,
    createdAt: new Date().toISOString()
  };
  memoryStore.auditLogs.unshift(row);
  return row;
}
