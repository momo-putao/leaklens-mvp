import {
  ApprovalRecord,
  DocumentReview,
  KnowledgeItem,
  LegalCitation,
  RewriteMode,
  RiskFinding,
  RiskLevel,
  RiskTag,
  ReviewScenario,
  SanitizedVersion,
  TrainingCase
} from "./types";

type KeywordRule = {
  tag: RiskTag;
  keywords: string[];
  weight: number;
  reason: string;
  action: string;
};

export const scenarios: ReviewScenario[] = [
  "员工外发",
  "宣传内容",
  "客户沟通",
  "供应商沟通",
  "内部报告"
];

export const rewriteModes: RewriteMode[] = ["保守脱敏", "平衡表达", "保留商务语气"];

export const sampleTexts = [
  {
    title: "低风险日程沟通",
    text: "各位同事好，明天下午三点召开项目例会，请大家提前准备近期工作进展。本次会议不涉及客户名单、报价策略或未公开经营数据。"
  },
  {
    title: "客户报价邮件",
    text: "王总您好，附件是我们给华东区三家核心客户的年度报价策略，A 客户底价为 82 万，B 客户可让利 12%，请勿转发给其他供应商。"
  },
  {
    title: "技术方案外发",
    text: "本次 POC 采用内部自研的特征提取算法和部署架构，核心参数、模型阈值、接口调用链路如下，可直接提供给合作方评估。"
  },
  {
    title: "供应商议价记录",
    text: "我们与两家供应商的采购底价已经确认，明细包括返利比例、付款周期和下一轮压价空间，建议发给客户作为谈判筹码。"
  },
  {
    title: "经营数据汇总",
    text: "Q3 未公开营收预计增长 31%，重点客户续约率为 88%，下季度计划裁撤低毛利产品线并启动海外渠道并购。"
  }
];

const rules: KeywordRule[] = [
  {
    tag: "客户信息",
    keywords: ["客户", "名单", "续约率", "核心客户", "A 客户", "B 客户"],
    weight: 18,
    reason: "文本涉及可识别客户关系或客户经营信息，可能构成企业采取保密措施保护的商业信息。",
    action: "隐藏客户名称、数量、续约率等可识别信息，仅保留沟通目的。"
  },
  {
    tag: "报价策略",
    keywords: ["报价", "底价", "让利", "毛利", "压价", "返利"],
    weight: 22,
    reason: "报价、底价和让利空间会直接影响交易谈判优势，泄露后可能损害竞争利益。",
    action: "删除具体价格、让利比例和谈判底线，改为区间或审批后单独发送。"
  },
  {
    tag: "技术方案",
    keywords: ["技术方案", "算法", "模型", "架构", "参数", "接口", "阈值", "自研"],
    weight: 20,
    reason: "技术路径、架构和核心参数可能体现研发成果或技术秘密。",
    action: "保留功能描述，移除核心参数、接口链路和实现细节。"
  },
  {
    tag: "经营数据",
    keywords: ["营收", "增长", "经营数据", "Q3", "利润", "并购", "裁撤", "产品线"],
    weight: 20,
    reason: "未公开经营数据和战略计划可能影响市场判断与商业谈判。",
    action: "删除未公开财务指标和战略动作，改为已公开口径或概括性表述。"
  },
  {
    tag: "供应商信息",
    keywords: ["供应商", "采购", "付款周期", "返利比例", "采购底价"],
    weight: 18,
    reason: "供应商条件、采购价格和付款安排属于供应链谈判敏感信息。",
    action: "隐藏供应商名称和商业条款，仅保留需求背景。"
  },
  {
    tag: "未公开商业计划",
    keywords: ["未公开", "计划", "下季度", "海外渠道", "上市", "投标", "并购"],
    weight: 19,
    reason: "未公开商业计划泄露后可能削弱企业先发优势或触发合规风险。",
    action: "删除时间表、区域、对象和执行路径，转为内部审批材料。"
  }
];

const legalBasis =
  "依据《反不正当竞争法》第九条关于商业秘密保护的原则，经营信息、技术信息等不为公众所知悉、具有商业价值并经权利人采取保密措施的信息，应避免未经授权披露。企业内部保密制度通常要求外发前完成必要性、最小化和审批留痕审查。";

const now = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

function levelFromScore(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function approvalForLevel(level: RiskLevel): ApprovalRecord {
  if (level === "high") {
    return {
      id: makeId("approval"),
      status: "禁止外发",
      suggestion: "禁止直接外发。建议由业务负责人补充必要性说明，法务复核后重新生成脱敏版本。",
      handler: "系统风控引擎",
      createdAt: now()
    };
  }

  if (level === "medium") {
    return {
      id: makeId("approval"),
      status: "法务复核",
      suggestion: "建议进入法务复核队列，确认敏感片段是否可以进一步概括化表达。",
      handler: "系统风控引擎",
      createdAt: now()
    };
  }

  return {
    id: makeId("approval"),
    status: "自动通过",
    suggestion: "未发现明显商业秘密泄露风险，可保留审查记录后外发。",
    handler: "系统风控引擎",
    createdAt: now()
  };
}

function retrieveCitations(text: string, tags: RiskTag[], knowledgeBase: KnowledgeItem[]): LegalCitation[] {
  return knowledgeBase
    .filter((item) => item.enabled)
    .map((item) => {
      const matchedKeywords = item.keywords.filter((keyword) => text.includes(keyword));
      const tagHits = item.tags.filter((tag) => tags.includes(tag));
      const score = matchedKeywords.length * 2 + tagHits.length;

      return { item, matchedKeywords, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ item, matchedKeywords }) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      source: item.source,
      excerpt: item.content,
      matchedKeywords,
      tags: item.tags
    }));
}

function composeLegalBasis(citations: LegalCitation[]) {
  if (!citations.length) return legalBasis;

  const legal = citations.find((item) => item.type === "法律法规");
  const policy = citations.find((item) => item.type === "企业制度");
  const contract = citations.find((item) => item.type === "合同条款");

  const parts = [
    legal ? `法律依据参考 ${legal.title}，该材料需判断秘密性、商业价值和保密措施。` : legalBasis,
    policy ? `企业制度命中 ${policy.title}，外发前应适用最小必要披露和审批留痕。` : "",
    contract ? `合同条款命中 ${contract.title}，需确认接收方、披露目的和书面授权范围。` : ""
  ].filter(Boolean);

  return parts.join("");
}

function citationScore(citations: LegalCitation[], knowledgeBase: KnowledgeItem[]) {
  return citations.reduce((sum, citation) => {
    const source = knowledgeBase.find((item) => item.id === citation.id);
    return sum + Math.min(10, source?.riskWeight ?? 3);
  }, 0);
}

function createFindings(text: string): RiskFinding[] {
  return rules.flatMap((rule) => {
    const hit = rule.keywords.find((keyword) => text.includes(keyword));
    if (!hit) return [];

    const index = text.indexOf(hit);
    const start = Math.max(0, index - 18);
    const end = Math.min(text.length, index + hit.length + 28);

    return [
      {
        id: makeId("finding"),
        snippet: text.slice(start, end),
        tag: rule.tag,
        reason: rule.reason,
        legalBasis,
        action: rule.action
      }
    ];
  });
}

function sanitize(text: string, mode: RewriteMode, findings: RiskFinding[]): SanitizedVersion {
  let output = text;
  const changes: string[] = [];

  const replacements: Record<RiskTag, string> = {
    客户信息: mode === "保守脱敏" ? "相关客户信息" : "部分合作客户信息",
    报价策略: mode === "保留商务语气" ? "商务报价安排" : "价格敏感信息",
    技术方案: mode === "保留商务语气" ? "方案能力概述" : "技术实现细节",
    经营数据: mode === "平衡表达" ? "阶段性经营表现" : "未公开经营数据",
    供应商信息: mode === "保留商务语气" ? "供应链合作条件" : "供应商敏感信息",
    未公开商业计划: mode === "平衡表达" ? "后续业务安排" : "未公开商业计划"
  };

  for (const finding of findings) {
    const replacement = `[已脱敏：${replacements[finding.tag]}]`;
    output = output.replace(finding.snippet, replacement);
    changes.push(`${finding.tag}：${finding.action}`);
  }

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (output.includes(keyword)) {
        output = output.replaceAll(keyword, `[${rule.tag}]`);
      }
    }
  }

  if (!changes.length) {
    changes.push("未发现必须改写的敏感片段，仅建议保留审查留痕。");
  }

  return {
    id: makeId("sanitized"),
    mode,
    text: output,
    changes,
    createdAt: now()
  };
}

export function analyzeDocument(params: {
  title: string;
  originalText: string;
  scenario: ReviewScenario;
  submitter: string;
  department: string;
  mode: RewriteMode;
  knowledgeBase?: KnowledgeItem[];
}): DocumentReview {
  const findings = createFindings(params.originalText);
  const tags = Array.from(new Set(findings.map((finding) => finding.tag)));
  const knowledgeBase = params.knowledgeBase ?? [];
  const citations = retrieveCitations(params.originalText, tags, knowledgeBase);
  const baseScore = findings.reduce((sum, finding) => {
    const rule = rules.find((item) => item.tag === finding.tag);
    return sum + (rule?.weight ?? 10);
  }, 0);
  const scenarioBonus = params.scenario === "员工外发" || params.scenario === "客户沟通" ? 8 : 4;
  const score = Math.min(100, findings.length ? baseScore + scenarioBonus + findings.length * 4 + citationScore(citations, knowledgeBase) : 12);
  const riskLevel = levelFromScore(score);
  const approval = approvalForLevel(riskLevel);
  const sanitized = sanitize(params.originalText, params.mode, findings);

  const status: DocumentReview["status"] =
    approval.status === "自动通过" ? "已通过" : approval.status === "法务复核" ? "待复核" : "已拦截";

  return {
    id: makeId("review"),
    title: params.title || "未命名审查材料",
    originalText: params.originalText,
    scenario: params.scenario,
    submitter: params.submitter || "业务提交人",
    department: params.department || "业务部门",
    riskLevel,
    score,
    status,
    tags,
    findings,
    legalBasis: composeLegalBasis(citations),
    citations,
    recommendation: approval.suggestion,
    sanitizedVersions: [sanitized],
    approvalRecords: [approval],
    trainingCases: [],
    createdAt: now()
  };
}

export function generateTrainingCases(review: DocumentReview): TrainingCase[] {
  const primaryTag = review.tags[0] ?? "客户信息";
  const snippet = review.findings[0]?.snippet ?? review.originalText.slice(0, 80);

  return [
    {
      id: makeId("case"),
      type: "选择题",
      question: `员工准备外发包含“${snippet}”的材料时，最合适的处理方式是？`,
      options: ["直接发送，提高沟通效率", "删除或概括敏感信息，并完成必要审批", "只在邮件标题写明保密即可", "转发给个人邮箱后再发送"],
      answer: "删除或概括敏感信息，并完成必要审批",
      explanation: `${primaryTag} 可能构成商业秘密或保密信息，外发前应遵循最小必要、脱敏和审批留痕原则。`,
      sourceReviewId: review.id
    },
    {
      id: makeId("case"),
      type: "判断题",
      question: "只要接收方是合作伙伴，包含报价底线、客户信息或技术参数的材料就可以不经审批直接发送。",
      answer: "错误",
      explanation: "合作关系不等于自动授权披露，仍应根据保密制度和材料敏感程度完成审查。",
      sourceReviewId: review.id
    },
    {
      id: makeId("case"),
      type: "案例分析题",
      question: `请分析该文本为什么存在 ${review.riskLevel === "high" ? "高" : "中"}风险，并提出两项整改措施。`,
      answer: "识别敏感信息类别；删除或概括敏感片段；必要时进入法务复核或禁止外发。",
      explanation: "案例分析应同时覆盖风险识别、法律依据、脱敏改写和审批动作。",
      sourceReviewId: review.id
    }
  ];
}

export function riskLevelLabel(level: RiskLevel) {
  return level === "high" ? "高风险" : level === "medium" ? "中风险" : "低风险";
}
