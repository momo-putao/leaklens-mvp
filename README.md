# LeakLens | AI 商业秘密泄露风险识别与脱敏合规工具

LeakLens 是一个企业合规 SaaS 风格的 Web MVP，用于模拟员工外发文本、宣传内容、客户沟通材料、供应商沟通材料中的商业秘密泄露风险识别与治理流程。

## 核心能力

- 风险审查工作台：粘贴文本或上传 `.txt` 文件，输出风险等级、分数、标签、敏感片段和法律解释。
- AI 脱敏改写：支持保守脱敏、平衡表达、保留商务语气三种模式。
- 审批流模拟：按风险等级生成自动通过、法务复核或禁止外发建议。
- 管理层态势看板：展示审查总量、平均风险分、拦截数量、部门风险排行、高频标签和重点关注队列。
- 案例库：每次审查自动沉淀为案例，支持按风险标签筛选。
- 培训题生成：把高风险文本转成选择题、判断题和案例分析题。
- 知识库增强：内置法律法规、企业制度、历史案例、合同条款和标签规则，并在审查报告中展示引用依据。
- 整改闭环：根据命中风险自动生成整改任务、负责人、优先级和处理期限。
- 报告导出：一键下载 Markdown 审查报告，用于法务留痕或作品展示。

## 技术栈

- Next.js + TypeScript
- Tailwind CSS
- lucide-react
- Prisma + PostgreSQL schema
- OpenAI 兼容模型接口
- PDF/DOCX/Excel/PPTX/TXT 文件解析
- 服务端 API + 内存 fallback
- 本地规则引擎 + 知识库检索 fallback

## 知识库设计

当前 MVP 内置以下资料类型：

- 法律法规库：如《反不正当竞争法》第九条、商业秘密司法解释摘要。
- 企业制度库：如外发材料分级审批、数据分类分级、最小必要披露规则。
- 历史案例库：如供应商报价泄露、POC 技术架构外发风险案例。
- 合同条款库：如 NDA 中的接收方限制、披露范围和书面授权要求。
- 标签规则库：商业秘密风险标签与审批强度规则。

审查时系统会根据外发文本中的关键词和风险标签检索启用的知识条目，并把命中的法规、制度、案例、合同条款作为“引用依据”写入审查报告。

## 高级审查上下文

LeakLens 不只看文本本身，还会结合：

- 材料类型：邮件正文、合同条款、报价文件、宣传文案、技术方案、投标材料、会议纪要。
- 接收方：内部同事、客户、供应商、合作伙伴、公众渠道。
- 知识库命中：法规、制度、案例、合同条款和标签规则。

系统会综合输出最终决策、外部扩散等级、判断可信度、下一步最优动作和整改任务。

## 运行

```bash
npm install
npm run prisma:generate
npm run dev
```

打开 `http://localhost:3000` 查看应用。

## 本地企业版配置

复制环境变量示例：

```bash
cp .env.example .env
```

如果需要启用 PostgreSQL/Prisma 持久化：

```bash
# .env
DATABASE_URL="postgresql://leaklens:leaklens@localhost:5432/leaklens?schema=public"
LEAKLENS_USE_DATABASE="true"
```

然后执行：

```bash
npm run prisma:migrate
```

如果 `LEAKLENS_USE_DATABASE` 不是 `true`，系统会使用服务端内存 fallback，方便本地演示。

如果需要启用真实大模型：

```bash
OPENAI_API_KEY="你的 key"
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-4o-mini"
```

也可以把 `OPENAI_BASE_URL` 换成兼容 OpenAI 协议的其他模型服务。没有 API Key 或模型返回异常时，系统会自动降级到本地规则审查。

## 企业版能力

- API 化审查：`/api/reviews/analyze`
- 文件解析：`/api/documents/parse`
- 知识库管理：`/api/knowledge`
- 企业资料导入：`/api/import`
- 审计日志：`/api/audit`
- 审批 payload：`/api/integrations/payload`
- Prisma 数据模型：用户、角色、审计日志、审查记录、风险发现、引用依据、整改任务、培训题、知识库、文档切片、集成配置。

## 后续扩展方向

- 接入 pgvector 或独立向量数据库，实现真正 embedding RAG。
- 将本地账号升级为 NextAuth/Auth.js 登录。
- 将审批 payload 实际发送至飞书、企微、邮件或企业审批系统。
- 增加对象存储保存原始文件。
- 增加更严格的租户隔离、加密、审计报表和导出水印。
