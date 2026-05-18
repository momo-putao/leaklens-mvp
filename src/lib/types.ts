export type RiskLevel = "low" | "medium" | "high";

export type ReviewScenario =
  | "员工外发"
  | "宣传内容"
  | "客户沟通"
  | "供应商沟通"
  | "内部报告";

export type RiskTag =
  | "客户信息"
  | "报价策略"
  | "技术方案"
  | "经营数据"
  | "供应商信息"
  | "未公开商业计划";

export type RewriteMode = "保守脱敏" | "平衡表达" | "保留商务语气";

export type KnowledgeType = "法律法规" | "企业制度" | "历史案例" | "合同条款" | "标签规则";

export type RecipientType = "内部同事" | "客户" | "供应商" | "合作伙伴" | "公众渠道";

export type DocumentType = "邮件正文" | "合同条款" | "报价文件" | "宣传文案" | "技术方案" | "投标材料" | "会议纪要";

export type KnowledgeItem = {
  id: string;
  type: KnowledgeType;
  title: string;
  source: string;
  content: string;
  keywords: string[];
  tags: RiskTag[];
  riskWeight: number;
  enabled: boolean;
  updatedAt: string;
};

export type LegalCitation = {
  id: string;
  type: KnowledgeType;
  title: string;
  source: string;
  excerpt: string;
  matchedKeywords: string[];
  tags: RiskTag[];
};

export type RiskFinding = {
  id: string;
  snippet: string;
  tag: RiskTag;
  reason: string;
  legalBasis: string;
  action: string;
};

export type SanitizedVersion = {
  id: string;
  mode: RewriteMode;
  text: string;
  changes: string[];
  createdAt: string;
};

export type ApprovalRecord = {
  id: string;
  status: "自动通过" | "法务复核" | "禁止外发";
  suggestion: string;
  handler: string;
  createdAt: string;
};

export type TrainingCase = {
  id: string;
  type: "选择题" | "判断题" | "案例分析题";
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  sourceReviewId: string;
};

export type RemediationTask = {
  id: string;
  owner: string;
  action: string;
  due: string;
  status: "待处理" | "处理中" | "已完成";
  priority: "P0" | "P1" | "P2";
};

export type RiskSummary = {
  exposure: "内部可控" | "有限外部披露" | "高外部扩散";
  confidence: number;
  decision: "可外发" | "修改后外发" | "禁止外发";
  nextBestAction: string;
};

export type ParsedDocumentBlock = {
  id: string;
  source: string;
  text: string;
};

export type ParsedDocument = {
  id: string;
  fileName: string;
  fileType: string;
  text: string;
  blocks: ParsedDocumentBlock[];
  createdAt: string;
};

export type ModelStatus = "ai_generated" | "rule_fallback" | "ai_error_fallback";

export type DocumentReview = {
  id: string;
  title: string;
  originalText: string;
  scenario: ReviewScenario;
  documentType: DocumentType;
  recipientType: RecipientType;
  submitter: string;
  department: string;
  riskLevel: RiskLevel;
  score: number;
  summary: RiskSummary;
  status: "待处理" | "已通过" | "待复核" | "已拦截";
  tags: RiskTag[];
  findings: RiskFinding[];
  legalBasis: string;
  citations: LegalCitation[];
  recommendation: string;
  modelStatus?: ModelStatus;
  sourceFileName?: string;
  sourceFileType?: string;
  auditSerial?: string;
  sanitizedVersions: SanitizedVersion[];
  approvalRecords: ApprovalRecord[];
  remediationTasks: RemediationTask[];
  trainingCases: TrainingCase[];
  createdAt: string;
};
