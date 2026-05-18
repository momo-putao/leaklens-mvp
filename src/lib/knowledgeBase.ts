import { KnowledgeItem } from "./types";

const updatedAt = "2026-05-19T00:00:00.000Z";

export const defaultKnowledgeBase: KnowledgeItem[] = [
  {
    id: "law_anti_unfair_competition_9",
    type: "法律法规",
    title: "《反不正当竞争法》第九条：商业秘密保护",
    source: "法律法规库 / 商业秘密",
    content:
      "经营者不得以盗窃、贿赂、欺诈、胁迫、电子侵入或者其他不正当手段获取权利人的商业秘密，也不得披露、使用或者允许他人使用以前项手段获取的商业秘密。商业秘密通常包括不为公众所知悉、具有商业价值并经权利人采取相应保密措施的技术信息、经营信息等商业信息。",
    keywords: ["商业秘密", "技术信息", "经营信息", "披露", "使用", "保密措施", "客户", "报价", "技术方案"],
    tags: ["客户信息", "报价策略", "技术方案", "经营数据", "未公开商业计划"],
    riskWeight: 8,
    enabled: true,
    updatedAt
  },
  {
    id: "law_trade_secret_interpretation",
    type: "法律法规",
    title: "商业秘密司法解释：客户信息与经营信息识别",
    source: "法律法规库 / 司法解释",
    content:
      "客户名称、地址、联系方式、交易习惯、交易内容、特定需求等深度客户信息，在符合秘密性、价值性和保密性条件时，可以作为商业秘密保护。报价、采购条件、供应链安排、经营计划等经营信息，也应结合是否公开、是否具有竞争价值和是否采取保密措施进行判断。",
    keywords: ["客户名称", "客户", "交易习惯", "报价", "采购", "供应链", "经营计划", "竞争价值"],
    tags: ["客户信息", "报价策略", "供应商信息", "经营数据"],
    riskWeight: 7,
    enabled: true,
    updatedAt
  },
  {
    id: "policy_external_review",
    type: "企业制度",
    title: "外发材料分级审批制度",
    source: "企业制度库 / 外发审批",
    content:
      "对外发送材料前，应按照公开、内部、敏感、核心敏感四级进行分类。涉及客户名单、报价底线、供应商条件、未公开经营数据、技术实现细节的材料，原则上不得直接外发；确需外发的，应完成业务负责人和法务复核，并保留审批记录。",
    keywords: ["外发", "客户名单", "报价底线", "供应商条件", "经营数据", "技术实现", "法务复核", "审批记录"],
    tags: ["客户信息", "报价策略", "技术方案", "经营数据", "供应商信息"],
    riskWeight: 9,
    enabled: true,
    updatedAt
  },
  {
    id: "policy_data_classification",
    type: "企业制度",
    title: "数据分类分级与最小必要披露规则",
    source: "企业制度库 / 数据合规",
    content:
      "外部沟通应遵循最小必要原则。能够用概括性描述替代的，不得披露具体客户、价格、成本、模型参数、接口路径、供应商报价、未公开战略计划等细节。对敏感信息应优先采取匿名化、区间化、摘要化处理。",
    keywords: ["最小必要", "概括", "客户", "价格", "成本", "模型参数", "接口", "供应商", "匿名化", "区间化"],
    tags: ["客户信息", "报价策略", "技术方案", "供应商信息", "未公开商业计划"],
    riskWeight: 6,
    enabled: true,
    updatedAt
  },
  {
    id: "case_supplier_price_leak",
    type: "历史案例",
    title: "供应商报价泄露导致采购谈判优势受损",
    source: "历史案例库 / 采购场景",
    content:
      "某业务团队将供应商返利比例、付款周期、采购底价发送给外部合作方，导致后续谈判中供应商调整报价并要求重新议价。复盘结论为：供应商商业条款属于敏感经营信息，应删除具体金额、比例和付款条件。",
    keywords: ["供应商", "返利比例", "付款周期", "采购底价", "报价", "重新议价"],
    tags: ["供应商信息", "报价策略"],
    riskWeight: 8,
    enabled: true,
    updatedAt
  },
  {
    id: "case_poc_architecture_leak",
    type: "历史案例",
    title: "POC 技术架构外发引发技术秘密风险",
    source: "历史案例库 / 技术方案",
    content:
      "项目组在 POC 材料中披露自研算法参数、模型阈值和接口调用链路。法务意见认为，功能价值可以介绍，但核心参数、部署架构和接口路径应仅在签署 NDA 后按最小必要范围披露。",
    keywords: ["POC", "自研", "算法", "参数", "模型阈值", "接口调用", "NDA", "部署架构"],
    tags: ["技术方案"],
    riskWeight: 8,
    enabled: true,
    updatedAt
  },
  {
    id: "contract_nda_customer_a",
    type: "合同条款",
    title: "客户合作 NDA：披露范围与接收方限制",
    source: "合同条款库 / NDA 模板",
    content:
      "接收方仅可为评估合作目的使用保密信息，不得向无关第三方披露。披露方提供的客户资料、报价、产品路线图、技术文档、经营计划均属于保密信息；超出合作目的的披露需取得书面同意。",
    keywords: ["NDA", "接收方", "第三方", "客户资料", "报价", "产品路线图", "技术文档", "经营计划", "书面同意"],
    tags: ["客户信息", "报价策略", "技术方案", "未公开商业计划"],
    riskWeight: 7,
    enabled: true,
    updatedAt
  },
  {
    id: "rule_trade_secret_tags",
    type: "标签规则",
    title: "商业秘密风险标签规则",
    source: "标签规则库 / v1",
    content:
      "客户信息、报价策略、技术方案、经营数据、供应商信息、未公开商业计划六类信息应作为商业秘密泄露审查的核心标签。命中两类以上标签，或同时出现具体客户与报价/技术参数，应提高一级审批强度。",
    keywords: ["客户信息", "报价策略", "技术方案", "经营数据", "供应商信息", "未公开商业计划", "提高一级"],
    tags: ["客户信息", "报价策略", "技术方案", "经营数据", "供应商信息", "未公开商业计划"],
    riskWeight: 5,
    enabled: true,
    updatedAt
  }
];

export function createKnowledgeItem(input: Omit<KnowledgeItem, "id" | "updatedAt" | "enabled" | "riskWeight">): KnowledgeItem {
  return {
    ...input,
    id: `kb_${Math.random().toString(36).slice(2, 10)}`,
    enabled: true,
    riskWeight: 5,
    updatedAt: new Date().toISOString()
  };
}
