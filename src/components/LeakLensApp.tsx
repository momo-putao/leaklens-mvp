"use client";

import {
  AlertTriangle,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  Gauge,
  Library,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  analyzeDocument,
  generateTrainingCases,
  riskLevelLabel,
  rewriteModes,
  sampleTexts,
  scenarios
} from "@/lib/riskEngine";
import { createKnowledgeItem } from "@/lib/knowledgeBase";
import { loadKnowledgeBase, loadReviews, saveKnowledgeBase, saveReviews } from "@/lib/storage";
import { DocumentReview, KnowledgeItem, KnowledgeType, RewriteMode, RiskTag, ReviewScenario } from "@/lib/types";

const navigation = [
  { id: "workbench", label: "风险审查", icon: Search },
  { id: "rewrite", label: "脱敏改写", icon: WandSparkles },
  { id: "approval", label: "审批留痕", icon: ClipboardCheck },
  { id: "cases", label: "案例库", icon: Database },
  { id: "training", label: "培训题库", icon: BookOpenCheck },
  { id: "knowledge", label: "知识库", icon: Library }
] as const;

type TabId = (typeof navigation)[number]["id"];

const tagColor: Record<RiskTag, string> = {
  客户信息: "bg-sky-50 text-sky-800 border-sky-200",
  报价策略: "bg-amber-50 text-amber-800 border-amber-200",
  技术方案: "bg-indigo-50 text-indigo-800 border-indigo-200",
  经营数据: "bg-emerald-50 text-emerald-800 border-emerald-200",
  供应商信息: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200",
  未公开商业计划: "bg-rose-50 text-rose-800 border-rose-200"
};

const levelStyles = {
  high: "bg-red-50 text-red-800 border-red-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  low: "bg-emerald-50 text-emerald-800 border-emerald-200"
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function HighlightedText({ review }: { review: DocumentReview }) {
  if (!review.findings.length) {
    return <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{review.originalText}</p>;
  }

  let remaining = review.originalText;
  const parts: { text: string; hit?: boolean }[] = [];

  for (const finding of review.findings) {
    const index = remaining.indexOf(finding.snippet);
    if (index >= 0) {
      if (index > 0) parts.push({ text: remaining.slice(0, index) });
      parts.push({ text: finding.snippet, hit: true });
      remaining = remaining.slice(index + finding.snippet.length);
    }
  }

  if (remaining) parts.push({ text: remaining });

  return (
    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
      {parts.map((part, index) =>
        part.hit ? (
          <mark key={index} className="rounded bg-amber-100 px-1 py-0.5 text-amber-950">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </p>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone
}: {
  label: string;
  value: string;
  icon: typeof Gauge;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-white/90 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-md ${tone}`}>
          <Icon size={17} />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}

export function LeakLensApp() {
  const [tab, setTab] = useState<TabId>("workbench");
  const [reviews, setReviews] = useState<DocumentReview[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [title, setTitle] = useState("客户沟通材料审查");
  const [text, setText] = useState(sampleTexts[1].text);
  const [scenario, setScenario] = useState<ReviewScenario>("客户沟通");
  const [mode, setMode] = useState<RewriteMode>("平衡表达");
  const [submitter, setSubmitter] = useState("销售部 李明");
  const [department, setDepartment] = useState("销售一部");
  const [filter, setFilter] = useState("全部");
  const [error, setError] = useState("");

  useEffect(() => {
    const loaded = loadReviews();
    setReviews(loaded);
    setSelectedId(loaded[0]?.id ?? "");
    setKnowledgeBase(loadKnowledgeBase());
  }, []);

  useEffect(() => {
    saveReviews(reviews);
  }, [reviews]);

  useEffect(() => {
    if (knowledgeBase.length) saveKnowledgeBase(knowledgeBase);
  }, [knowledgeBase]);

  const selectedReview = reviews.find((review) => review.id === selectedId) ?? reviews[0];

  const stats = useMemo(() => {
    const high = reviews.filter((review) => review.riskLevel === "high").length;
    const medium = reviews.filter((review) => review.riskLevel === "medium").length;
    const training = reviews.reduce((sum, review) => sum + review.trainingCases.length, 0);
    const tags = reviews.flatMap((review) => review.tags);
    const topTag = tags.length
      ? Object.entries(
          tags.reduce<Record<string, number>>((acc, tag) => {
            acc[tag] = (acc[tag] ?? 0) + 1;
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1])[0][0]
      : "暂无";

    const enabledKnowledge = knowledgeBase.filter((item) => item.enabled).length;

    return { high, medium, training, topTag, enabledKnowledge };
  }, [knowledgeBase, reviews]);

  const filteredReviews = useMemo(() => {
    if (filter === "全部") return reviews;
    return reviews.filter((review) => review.tags.includes(filter as RiskTag));
  }, [filter, reviews]);

  function handleAnalyze() {
    if (text.trim().length < 8) {
      setError("请输入至少 8 个字符的审查文本。");
      return;
    }

    setError("");
    const review = analyzeDocument({
      title,
      originalText: text,
      scenario,
      submitter,
      department,
      mode,
      knowledgeBase
    });

    setReviews((current) => [review, ...current]);
    setSelectedId(review.id);
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".txt")) {
      setError("当前浏览器 MVP 可直接读取 .txt 文件；PDF/DOCX 已作为正式系统能力预留。");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setTitle(file.name.replace(/\.[^.]+$/, ""));
      setText(String(reader.result ?? ""));
      setError("");
    };
    reader.readAsText(file);
  }

  function handleGenerateTraining() {
    if (!selectedReview) return;
    const trainingCases = generateTrainingCases(selectedReview);
    setReviews((current) =>
      current.map((review) => (review.id === selectedReview.id ? { ...review, trainingCases } : review))
    );
    setTab("training");
  }

  function handleRewrite(newMode: RewriteMode) {
    if (!selectedReview) return;
    const review = analyzeDocument({
      title: selectedReview.title,
      originalText: selectedReview.originalText,
      scenario: selectedReview.scenario,
      submitter: selectedReview.submitter,
      department: selectedReview.department,
      mode: newMode,
      knowledgeBase
    });

    setReviews((current) =>
      current.map((item) =>
        item.id === selectedReview.id
          ? {
              ...item,
              sanitizedVersions: [
                ...item.sanitizedVersions,
                {
                  ...review.sanitizedVersions[0],
                  mode: newMode
                }
              ]
            }
          : item
      )
    );
  }

  return (
    <div className="min-h-screen p-4 text-ink lg:p-6">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border border-line bg-white/92 p-4 shadow-soft backdrop-blur">
          <div className="flex items-center gap-3 border-b border-line pb-5">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-brand text-white">
              <LockKeyhole size={22} />
            </div>
            <div>
              <div className="text-lg font-semibold">LeakLens</div>
              <div className="text-xs text-slate-500">AI 商业秘密合规工具</div>
            </div>
          </div>

          <nav className="mt-5 grid gap-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.id === tab;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`focus-ring flex h-11 items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition ${
                    active ? "bg-ink text-white" : "text-slate-600 hover:bg-panel hover:text-ink"
                  }`}
                  type="button"
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 rounded-lg border border-line bg-panel p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck size={16} />
              合规闭环
            </div>
            <div className="space-y-3 text-xs leading-5 text-slate-600">
              <p>风险识别 - 法律解释 - 脱敏改写 - 审批建议 - 案例沉淀。</p>
              <p>本 MVP 使用本地规则模拟 AI 输出，结构与正式模型接口保持一致。</p>
            </div>
          </div>
        </aside>

        <main className="space-y-4">
          <header className="rounded-lg border border-line bg-white/92 p-5 shadow-soft backdrop-blur">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-brand">
                  <BriefcaseBusiness size={16} />
                  企业外发材料合规审查工作台
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink">
                  商业秘密泄露风险识别、脱敏与审批留痕
                </h1>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricCard label="高风险材料" value={`${stats.high}`} icon={AlertTriangle} tone="bg-red-50 text-red-700" />
                <MetricCard label="待复核材料" value={`${stats.medium}`} icon={ClipboardCheck} tone="bg-amber-50 text-amber-700" />
                <MetricCard label="培训题目" value={`${stats.training}`} icon={BookOpenCheck} tone="bg-sky-50 text-sky-700" />
                <MetricCard label="知识来源" value={`${stats.enabledKnowledge}`} icon={Library} tone="bg-purple-50 text-purple-700" />
              </div>
            </div>
          </header>

          {tab === "workbench" && (
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
              <div className="rounded-lg border border-line bg-white/94 p-5 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">风险审查工作台</h2>
                    <p className="mt-1 text-sm text-slate-500">粘贴外发文本，选择场景并生成结构化审查结果。</p>
                  </div>
                  <label className="focus-ring inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-line bg-panel px-3 text-sm font-medium text-slate-700 hover:bg-white">
                    <Upload size={16} />
                    上传 TXT
                    <input className="hidden" type="file" accept=".txt" onChange={handleFile} />
                  </label>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    材料标题
                    <input
                      className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    审查场景
                    <select
                      className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm"
                      value={scenario}
                      onChange={(event) => setScenario(event.target.value as ReviewScenario)}
                    >
                      {scenarios.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    提交人
                    <input
                      className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm"
                      value={submitter}
                      onChange={(event) => setSubmitter(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    部门
                    <input
                      className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm"
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                    />
                  </label>
                </div>

                <label className="mt-4 grid gap-2 text-sm font-medium text-slate-700">
                  外发文本
                  <textarea
                    className="focus-ring min-h-[220px] resize-y rounded-md border border-line bg-white p-3 text-sm leading-7"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="粘贴邮件、宣传稿、客户沟通材料或供应商沟通内容..."
                  />
                </label>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {sampleTexts.map((sample) => (
                    <button
                      key={sample.title}
                      type="button"
                      onClick={() => {
                        setTitle(sample.title);
                        setText(sample.text);
                      }}
                      className="focus-ring rounded-md border border-line bg-panel px-3 py-2 text-xs font-medium text-slate-600 hover:bg-white"
                    >
                      {sample.title}
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                  <div className="flex rounded-md border border-line bg-panel p-1">
                    {rewriteModes.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setMode(item)}
                        className={`focus-ring rounded px-3 py-2 text-xs font-medium ${
                          mode === item ? "bg-white text-ink shadow-sm" : "text-slate-500"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    className="focus-ring inline-flex h-11 items-center gap-2 rounded-md bg-brand px-5 text-sm font-semibold text-white hover:bg-[#185D58]"
                  >
                    <Sparkles size={17} />
                    开始 AI 审查
                  </button>
                </div>

                {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              </div>

              <ResultPanel review={selectedReview} onGenerateTraining={handleGenerateTraining} />
            </section>
          )}

          {tab === "rewrite" && <RewritePanel review={selectedReview} onRewrite={handleRewrite} />}
          {tab === "approval" && <ApprovalPanel review={selectedReview} />}
          {tab === "cases" && (
            <CasesPanel
              reviews={filteredReviews}
              selectedId={selectedReview?.id ?? ""}
              filter={filter}
              onFilter={setFilter}
              onSelect={(id) => {
                setSelectedId(id);
                setTab("workbench");
              }}
            />
          )}
          {tab === "training" && <TrainingPanel reviews={reviews} onGenerate={handleGenerateTraining} selectedReview={selectedReview} />}
          {tab === "knowledge" && <KnowledgePanel items={knowledgeBase} onChange={setKnowledgeBase} />}
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white/75 p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-panel text-slate-500">
        <FileText size={22} />
      </div>
      <h3 className="mt-4 text-base font-semibold">还没有审查记录</h3>
      <p className="mt-2 text-sm text-slate-500">在风险审查工作台提交一段文本后，这里会展示风险报告。</p>
    </div>
  );
}

function ResultPanel({
  review,
  onGenerateTraining
}: {
  review?: DocumentReview;
  onGenerateTraining: () => void;
}) {
  if (!review) return <EmptyState />;

  return (
    <div className="rounded-lg border border-line bg-white/94 p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">审查结果</h2>
          <p className="mt-1 text-sm text-slate-500">
            {review.submitter} · {review.scenario} · {formatDate(review.createdAt)}
          </p>
        </div>
        <span className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${levelStyles[review.riskLevel]}`}>
          {riskLevelLabel(review.riskLevel)} · {review.score}
        </span>
      </div>

      <div className="mt-5 rounded-lg border border-line bg-panel p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <FileText size={16} />
          敏感片段高亮
        </div>
        <HighlightedText review={review} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {review.tags.length ? (
          review.tags.map((tag) => (
            <span key={tag} className={`rounded-full border px-3 py-1 text-xs font-semibold ${tagColor[tag]}`}>
              {tag}
            </span>
          ))
        ) : (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            未发现明显敏感标签
          </span>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {review.findings.map((finding) => (
          <div key={finding.id} className="rounded-lg border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{finding.tag}</span>
              <span className="text-xs text-slate-500">建议动作</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{finding.reason}</p>
            <p className="mt-2 rounded-md bg-panel p-3 text-sm leading-6 text-slate-700">{finding.action}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-line bg-white p-4">
        <div className="text-sm font-semibold">法律与制度解释</div>
        <p className="mt-2 text-sm leading-7 text-slate-700">{review.legalBasis}</p>
      </div>

      <div className="mt-4 rounded-lg border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">引用依据</div>
          <span className="text-xs text-slate-500">{(review.citations ?? []).length} 条命中</span>
        </div>
        <div className="mt-3 grid gap-3">
          {(review.citations ?? []).length ? (
            (review.citations ?? []).map((citation) => (
              <div key={citation.id} className="rounded-md border border-line bg-panel p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{citation.title}</div>
                  <span className="rounded bg-white px-2 py-1 text-xs font-medium text-slate-600">{citation.type}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{citation.source}</div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">{citation.excerpt}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {citation.matchedKeywords.slice(0, 5).map((keyword) => (
                    <span key={keyword} className="rounded-full bg-white px-2 py-1 text-xs text-slate-600">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-md bg-panel p-3 text-sm text-slate-500">未命中知识库条目，系统仅使用基础风险规则完成审查。</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-sm font-semibold">审批建议</div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{review.recommendation}</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-sm font-semibold">案例沉淀</div>
          <p className="mt-2 text-sm leading-6 text-slate-700">该审查已进入案例库，可生成培训题用于员工保密意识训练。</p>
          <button
            type="button"
            onClick={onGenerateTraining}
            className="focus-ring mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <BookOpenCheck size={15} />
            生成培训题
          </button>
        </div>
      </div>
    </div>
  );
}

function RewritePanel({ review, onRewrite }: { review?: DocumentReview; onRewrite: (mode: RewriteMode) => void }) {
  if (!review) return <EmptyState />;

  return (
    <section className="rounded-lg border border-line bg-white/94 p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">AI 脱敏改写</h2>
          <p className="mt-1 text-sm text-slate-500">生成不同强度的低风险表达，并解释每处改写原因。</p>
        </div>
        <div className="flex rounded-md border border-line bg-panel p-1">
          {rewriteModes.map((item) => (
            <button
              key={item}
              onClick={() => onRewrite(item)}
              type="button"
              className="focus-ring rounded px-3 py-2 text-xs font-medium text-slate-600 hover:bg-white"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel p-4">
          <div className="mb-3 text-sm font-semibold">原文</div>
          <HighlightedText review={review} />
        </div>
        <div className="space-y-4">
          {review.sanitizedVersions.map((version) => (
            <div key={version.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{version.mode}</span>
                <span className="text-xs text-slate-500">{formatDate(version.createdAt)}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-md bg-panel p-3 text-sm leading-7 text-slate-700">{version.text}</p>
              <div className="mt-3 space-y-2">
                {version.changes.map((change) => (
                  <div key={change} className="flex gap-2 text-sm leading-6 text-slate-700">
                    <CheckCircle2 className="mt-1 shrink-0 text-brand" size={15} />
                    {change}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ApprovalPanel({ review }: { review?: DocumentReview }) {
  if (!review) return <EmptyState />;

  return (
    <section className="rounded-lg border border-line bg-white/94 p-5 shadow-soft">
      <h2 className="text-lg font-semibold">审批流模拟与审查留痕</h2>
      <p className="mt-1 text-sm text-slate-500">系统按风险等级自动给出审批动作，形成可追溯记录。</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-lg border border-line bg-panel p-4">
          <div className="text-sm font-semibold">当前材料</div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">标题</span>
              <span className="font-medium">{review.title}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">状态</span>
              <span className="font-medium">{review.status}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">风险</span>
              <span className="font-medium">{riskLevelLabel(review.riskLevel)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">提交部门</span>
              <span className="font-medium">{review.department}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {review.approvalRecords.map((record, index) => (
            <div key={record.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-brand text-white">{index + 1}</div>
                  <div>
                    <div className="text-sm font-semibold">{record.status}</div>
                    <div className="text-xs text-slate-500">
                      {record.handler} · {formatDate(record.createdAt)}
                    </div>
                  </div>
                </div>
                <ClipboardCheck size={18} className="text-slate-500" />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{record.suggestion}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CasesPanel({
  reviews,
  selectedId,
  filter,
  onFilter,
  onSelect
}: {
  reviews: DocumentReview[];
  selectedId: string;
  filter: string;
  onFilter: (value: string) => void;
  onSelect: (id: string) => void;
}) {
  const tags: (RiskTag | "全部")[] = ["全部", "客户信息", "报价策略", "技术方案", "经营数据", "供应商信息", "未公开商业计划"];

  return (
    <section className="rounded-lg border border-line bg-white/94 p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">风险标签与案例库</h2>
          <p className="mt-1 text-sm text-slate-500">每次审查都会沉淀为可复盘案例。</p>
        </div>
        <select
          value={filter}
          onChange={(event) => onFilter(event.target.value)}
          className="focus-ring h-10 rounded-md border border-line bg-white px-3 text-sm"
        >
          {tags.map((tag) => (
            <option key={tag}>{tag}</option>
          ))}
        </select>
      </div>

      <div className="mt-5 grid gap-3">
        {reviews.length ? (
          reviews.map((review) => (
            <button
              key={review.id}
              type="button"
              onClick={() => onSelect(review.id)}
              className={`focus-ring rounded-lg border p-4 text-left transition hover:border-brand ${
                selectedId === review.id ? "border-brand bg-emerald-50" : "border-line bg-white"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{review.title}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {review.department} · {review.scenario} · {formatDate(review.createdAt)}
                  </div>
                </div>
                <span className={`rounded-md border px-3 py-1 text-xs font-semibold ${levelStyles[review.riskLevel]}`}>
                  {riskLevelLabel(review.riskLevel)} · {review.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {review.tags.length ? (
                  review.tags.map((tag) => (
                    <span key={tag} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tagColor[tag]}`}>
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    低风险样本
                  </span>
                )}
              </div>
            </button>
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}

function TrainingPanel({
  reviews,
  selectedReview,
  onGenerate
}: {
  reviews: DocumentReview[];
  selectedReview?: DocumentReview;
  onGenerate: () => void;
}) {
  const cases = reviews.flatMap((review) => review.trainingCases);

  return (
    <section className="rounded-lg border border-line bg-white/94 p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">保密培训题生成</h2>
          <p className="mt-1 text-sm text-slate-500">将高风险文本转化为员工保密意识训练题。</p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!selectedReview}
          className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Sparkles size={16} />
          为当前案例生成
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        {cases.length ? (
          cases.map((item) => (
            <div key={item.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-md bg-panel px-3 py-1 text-xs font-semibold text-slate-700">{item.type}</span>
                <BookOpenCheck size={18} className="text-brand" />
              </div>
              <h3 className="mt-3 text-base font-semibold">{item.question}</h3>
              {item.options && (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {item.options.map((option) => (
                    <div key={option} className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-slate-700">
                      {option}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
                <strong>答案：</strong>
                {item.answer}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{item.explanation}</p>
            </div>
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}

function KnowledgePanel({
  items,
  onChange
}: {
  items: KnowledgeItem[];
  onChange: (items: KnowledgeItem[]) => void;
}) {
  const [type, setType] = useState<KnowledgeType>("企业制度");
  const [title, setTitle] = useState("新增外发审查规则");
  const [source, setSource] = useState("企业制度库 / 自定义");
  const [content, setContent] = useState("涉及客户名称、项目报价、技术参数、供应商条款的材料，外发前需完成脱敏和法务复核。");
  const [keywords, setKeywords] = useState("客户,报价,技术参数,供应商,法务复核");
  const [selectedTags, setSelectedTags] = useState<RiskTag[]>(["客户信息", "报价策略"]);
  const [filterType, setFilterType] = useState<KnowledgeType | "全部">("全部");

  const allTags: RiskTag[] = ["客户信息", "报价策略", "技术方案", "经营数据", "供应商信息", "未公开商业计划"];
  const types: KnowledgeType[] = ["法律法规", "企业制度", "历史案例", "合同条款", "标签规则"];
  const visibleItems = filterType === "全部" ? items : items.filter((item) => item.type === filterType);

  function toggleTag(tag: RiskTag) {
    setSelectedTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  }

  function addItem() {
    if (!title.trim() || !content.trim()) return;

    const next = createKnowledgeItem({
      type,
      title,
      source,
      content,
      keywords: keywords
        .split(/[,，\s]+/)
        .map((item) => item.trim())
        .filter(Boolean),
      tags: selectedTags
    });

    onChange([next, ...items]);
  }

  function toggleItem(id: string) {
    onChange(items.map((item) => (item.id === id ? { ...item, enabled: !item.enabled, updatedAt: new Date().toISOString() } : item)));
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <div className="rounded-lg border border-line bg-white/94 p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <Library size={18} className="text-brand" />
          <h2 className="text-lg font-semibold">知识库管理</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">把法律法规、企业制度、历史案例和合同条款接入审查引擎。</p>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            资料类型
            <select
              className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm"
              value={type}
              onChange={(event) => setType(event.target.value as KnowledgeType)}
            >
              {types.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            标题
            <input className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            来源
            <input className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm" value={source} onChange={(event) => setSource(event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            正文摘要
            <textarea
              className="focus-ring min-h-[120px] resize-y rounded-md border border-line bg-white p-3 text-sm leading-6"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            检索关键词
            <input
              className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm"
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              placeholder="用逗号分隔，例如：客户,报价,NDA"
            />
          </label>

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">关联风险标签</div>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`focus-ring rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    selectedTags.includes(tag) ? tagColor[tag] : "border-line bg-panel text-slate-500"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-[#185D58]"
          >
            <Plus size={16} />
            添加到知识库
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white/94 p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">法律法规与企业资料库</h2>
            <p className="mt-1 text-sm text-slate-500">审查时会优先检索启用的资料，并在报告中展示引用依据。</p>
          </div>
          <select
            className="focus-ring h-10 rounded-md border border-line bg-white px-3 text-sm"
            value={filterType}
            onChange={(event) => setFilterType(event.target.value as KnowledgeType | "全部")}
          >
            <option>全部</option>
            {types.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="mt-5 grid gap-3">
          {visibleItems.map((item) => (
            <div key={item.id} className={`rounded-lg border p-4 ${item.enabled ? "border-line bg-white" : "border-slate-200 bg-slate-50 opacity-70"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-panel px-2.5 py-1 text-xs font-semibold text-slate-700">{item.type}</span>
                    <h3 className="font-semibold">{item.title}</h3>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{item.source}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="focus-ring h-9 rounded-md border border-line bg-panel px-3 text-xs font-semibold text-slate-700 hover:bg-white"
                  >
                    {item.enabled ? "已启用" : "已停用"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="focus-ring grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-slate-500 hover:text-red-700"
                    aria-label="删除资料"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-700">{item.content}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tagColor[tag]}`}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.keywords.map((keyword) => (
                  <span key={keyword} className="rounded-full bg-panel px-2.5 py-1 text-xs text-slate-600">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
