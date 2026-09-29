import "server-only";

import { env } from "@/lib/env";
import { shortHash } from "@/lib/ids";
import { buildCorePromptPanel, panelVersion } from "@/lib/prompt-panels";
import { demoMode } from "@/lib/demo-mode";
import { demoDiscovery, demoEvidence, demoPromptSeeds } from "@/lib/demo/engine";
import type {
  ActionCard,
  BuyerPrompt,
  BuyerPromptIntent,
  BuyerPromptStage,
  CompanyDiscovery,
  CrawledPage,
  EvidenceGap,
  LostPrompt,
  PromptCluster,
} from "@/lib/types";

function compactPages(pages: CrawledPage[]) {
  return pages.slice(0, 24).map((page) => ({
    url: page.url,
    title: page.title,
    description: page.description,
    headings: page.headings,
    text: page.text.slice(0, 9_000),
  }));
}

function homePage(url: string, pages: CrawledPage[]) {
  try {
    const target = new URL(url);
    const targetPath = target.pathname.replace(/\/$/u, "") || "/";
    return pages.find((page) => {
      const current = new URL(page.url);
      return current.origin === target.origin && (current.pathname.replace(/\/$/u, "") || "/") === targetPath;
    }) || pages.find((page) => {
      try {
        return new URL(page.url).pathname.replace(/\/$/u, "") === "";
      } catch {
        return false;
      }
    }) || pages[0];
  } catch {
    return pages[0];
  }
}

function responseText(data: any) {
  if (typeof data.output_text === "string") return data.output_text;
  return (Array.isArray(data.output) ? data.output : [])
    .flatMap((item: any) => item.content || [])
    .map((part: any) => part.text || "")
    .filter(Boolean)
    .join("\n");
}

function parseJson<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
  const object = cleaned.indexOf("{");
  const array = cleaned.indexOf("[");
  const starts = [object, array].filter((value) => value >= 0);
  const source = starts.length ? cleaned.slice(Math.min(...starts)) : cleaned;
  try {
    return JSON.parse(source) as T;
  } catch {
    const end = Math.max(source.lastIndexOf("}"), source.lastIndexOf("]"));
    if (end < 0) throw new Error("解析モデルがJSONを返しませんでした。");
    return JSON.parse(source.slice(0, end + 1)) as T;
  }
}

async function askJson<T>(prompt: string, webSearch = false) {
  if (!env.openAiKey) throw new Error("OPENAI_API_KEYが未設定です。");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${env.openAiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: env.openAiDiscoveryModel,
      input: prompt,
      ...(webSearch ? { tools: [{ type: "web_search" }], tool_choice: "required" } : {}),
    }),
  });
  const data = await response.json() as any;
  if (!response.ok) throw new Error(data.error?.message || `OpenAI discovery ${response.status}`);
  return parseJson<T>(responseText(data));
}

/**
 * The no-API path is deliberately conservative. A crawl can identify a name
 * and preserve the source page description, but it cannot establish a market,
 * competitor set, performance claim, or customer segment by itself.
 */
function heuristicDiscovery(url: string, pages: CrawledPage[]): CompanyDiscovery {
  const domain = new URL(url).hostname.replace(/^www\./iu, "");
  const home = homePage(url, pages);
  const brandName = (home?.title || domain).split(/[|｜–—-]/u)[0].trim().slice(0, 120) || domain;
  const sourceDescription = home?.description?.trim().slice(0, 600) || "";

  return {
    legalName: "",
    brandName,
    domain,
    summary: sourceDescription,
    market: "",
    targetCustomers: [],
    useCases: [],
    aliases: [...new Set([brandName, domain])],
    competitors: [],
    confidence: 0.2,
  };
}

export async function discoverCompany(url: string, pages: CrawledPage[]) {
  const domain = new URL(url).hostname.replace(/^www\./iu, "");
  if (demoMode()) return demoDiscovery(url, pages);
  if (!env.openAiKey) return heuristicDiscovery(url, pages);

  try {
    const raw = await askJson<any>(`あなたは公開情報の調査担当です。入力されたWebサイトと、検索で確認できる公開情報だけを使って、会社・商品・サービスの情報を整理してください。
【厳格なルール】
1. 取得したページや検索結果に書かれていない商品、実績、料金、資格、地域、顧客層を推測・作文しない。
2. 同名の別会社・別商品を混ぜない。対象URLと一致する情報だけを使う。
3. 競合候補は、同じ購入・相談場面で比較されると公開情報から確認できるものだけにする。根拠がなければ空配列にする。
4. 確認できない項目は空文字または空配列にする。
5. summary、market、targetCustomers、useCases、competitorsの各値は、参照元URLを説明できるものだけにする。
JSONだけを返してください。

形式:{"legalName":"","brandName":"","summary":"","market":"","targetCustomers":[""],"useCases":[""],"aliases":[""],"competitors":[{"name":"","domain":"","reason":"","confidence":0.0}],"confidence":0.0}

対象URL:${url}
サイト情報:${JSON.stringify(compactPages(pages))}`, true);

    const brandName = String(raw.brandName || raw.legalName || domain).trim().slice(0, 160);
    const legalName = String(raw.legalName || "").trim().slice(0, 160);
    const competitors = (Array.isArray(raw.competitors) ? raw.competitors : [])
      .slice(0, 12)
      .map((item: any) => ({
        name: String(item.name || "").trim().slice(0, 160),
        domain: item.domain ? String(item.domain).replace(/^https?:\/\//iu, "").replace(/\/$/u, "") : undefined,
        reason: String(item.reason || "").trim().slice(0, 500),
        confidence: Math.max(0, Math.min(1, Number(item.confidence || 0))),
      }))
      .filter((item: { name: string }) => item.name && item.name.toLocaleLowerCase("ja-JP") !== brandName.toLocaleLowerCase("ja-JP"));

    return {
      legalName,
      brandName,
      domain,
      summary: String(raw.summary || "").trim().slice(0, 1_200),
      market: String(raw.market || "").trim().slice(0, 160),
      targetCustomers: (Array.isArray(raw.targetCustomers) ? raw.targetCustomers : []).map((item: unknown) => String(item).trim()).filter(Boolean).slice(0, 12),
      useCases: (Array.isArray(raw.useCases) ? raw.useCases : []).map((item: unknown) => String(item).trim()).filter(Boolean).slice(0, 12),
      aliases: [...new Set([brandName, legalName, domain, ...(Array.isArray(raw.aliases) ? raw.aliases.map(String) : [])])].filter(Boolean).slice(0, 20),
      competitors,
      confidence: Math.max(0, Math.min(1, Number(raw.confidence || 0))),
    } satisfies CompanyDiscovery;
  } catch {
    return heuristicDiscovery(url, pages);
  }
}

const clusters: PromptCluster[] = ["category", "segment", "use_case", "feature", "alternative", "comparison", "value", "implementation", "trust", "support"];

function promptIntent(cluster: PromptCluster): BuyerPromptIntent {
  if (cluster === "comparison" || cluster === "value") return "compare";
  if (cluster === "alternative") return "switch";
  if (cluster === "implementation" || cluster === "support") return "implement";
  if (cluster === "trust" || cluster === "feature") return "evaluate";
  return "discover";
}

function promptStage(cluster: PromptCluster): BuyerPromptStage {
  if (cluster === "category" || cluster === "segment" || cluster === "use_case") return "認知";
  if (cluster === "comparison" || cluster === "alternative" || cluster === "value") return "比較";
  if (cluster === "implementation" || cluster === "support") return "導入";
  return "検討";
}

function promptUrgency(cluster: PromptCluster, importance: number) {
  const base = cluster === "comparison" || cluster === "value" || cluster === "implementation"
    ? 5
    : cluster === "alternative" || cluster === "trust" ? 4 : 3;
  return Math.max(1, Math.min(5, Math.max(base, importance)));
}

function enrichPrompt(input: { id: string; text: string; cluster: PromptCluster; importance: number; panel: BuyerPrompt["panel"]; version?: number }): BuyerPrompt {
  return {
    id: input.id,
    text: input.text,
    cluster: input.cluster,
    importance: input.importance,
    intent: promptIntent(input.cluster),
    stage: promptStage(input.cluster),
    urgency: promptUrgency(input.cluster, input.importance),
    panel: input.panel,
    version: input.version || 1,
  };
}

function fallbackPrompts(discovery: CompanyDiscovery, count: number, panel: BuyerPrompt["panel"]) {
  const market = discovery.market || "この分野のサービス";
  const templates: Array<[string, PromptCluster, number]> = [
    [`${market}を選ぶときに確認したいことは？`, "category", 5],
    [`${market}の候補を比較するときのポイントは？`, "comparison", 5],
    [`${market}の料金・条件を確認するには？`, "value", 5],
    [`${market}を導入・利用し始めるまでの流れは？`, "implementation", 4],
    [`${market}の公開情報や実績を確認する方法は？`, "trust", 4],
    [`${market}の相談・サポート体制を比べるには？`, "support", 4],
  ];
  return Array.from({ length: count }, (_, index) => {
    const template = templates[index % templates.length];
    const round = Math.floor(index / templates.length) + 1;
    const text = round === 1 ? template[0] : template[0].replace("は？", `を${round}つ挙げると？`);
    return enrichPrompt({
      id: shortHash(`${panel}:${index}:${text}`),
      text,
      cluster: template[1],
      importance: template[2],
      panel,
      version: panelVersion(panel),
    });
  });
}

export async function generateBuyerPrompts(discovery: CompanyDiscovery, count: number, panel: BuyerPrompt["panel"]) {
  if (panel === "core") return buildCorePromptPanel(discovery);
  if (demoMode()) {
    return demoPromptSeeds(discovery, count).map(([text, cluster, importance], index) => enrichPrompt({ id: shortHash(`${panel}:${index}:${text}`), text, cluster, importance, panel, version: panelVersion(panel) }));
  }
  if (!env.openAiKey) return fallbackPrompts(discovery, count, panel);

  try {
    const raw = await askJson<any[]>(`あなたは日本の購買調査担当です。公開情報で確認できる市場・用途だけを前提に、購入前にAIへ聞く質問を${count}件作ってください。ブランド名を直接含めず、カテゴリ、対象、用途、機能、代替、比較、費用、導入、信頼、サポートを重複なく含めます。公開情報にない具体的な事実は質問に追加しないでください。JSON配列だけ返してください。
形式:[{"text":"","cluster":"category|segment|use_case|feature|alternative|comparison|value|implementation|trust|support","importance":1-5}]
市場:${JSON.stringify(discovery)}`);
    const prompts: BuyerPrompt[] = [];
    for (const [index, item] of (Array.isArray(raw) ? raw : []).entries()) {
      const text = String(item.text || "").trim().slice(0, 500);
      if (!text || prompts.some((prompt) => prompt.text === text)) continue;
      const cluster = clusters.includes(item.cluster) ? item.cluster as PromptCluster : "category";
      prompts.push(enrichPrompt({
        id: shortHash(`${panel}:${index}:${text}`),
        text,
        cluster,
        importance: Math.max(1, Math.min(5, Number(item.importance || 3))),
        panel,
        version: panelVersion(panel),
      }));
    }
    return prompts.length >= Math.min(8, count) ? prompts.slice(0, count) : fallbackPrompts(discovery, count, panel);
  } catch {
    return fallbackPrompts(discovery, count, panel);
  }
}

function textCorpus(pages: CrawledPage[]) {
  return pages.map((page) => `${page.title} ${page.description} ${page.headings.join(" ")} ${page.text}`).join(" ").toLowerCase();
}

function actionImpactScore(action: Pick<ActionCard, "relatedPromptCount" | "confidence" | "priority">) {
  const priorityWeight = action.priority === "critical" ? 1.25 : action.priority === "high" ? 1 : .8;
  return Math.round(action.relatedPromptCount * Math.max(0, Math.min(1, action.confidence)) * priorityWeight * 100) / 100;
}

function fallbackEvidence(discovery: CompanyDiscovery, pages: CrawledPage[], lostPrompts: LostPrompt[]): { gaps: EvidenceGap[]; actions: ActionCard[] } {
  const corpus = textCorpus(pages);
  const fields: Array<[string, string, RegExp]> = [
    ["customer-proof", "導入企業・顧客実績", /導入.{0,8}(社|企業|件)|利用.{0,8}(社|企業|件)/u],
    ["implementation", "標準導入期間", /(導入|開始).{0,12}(日|週間|か月|ヶ月)/u],
    ["roi", "導入効果・削減工数", /(削減|改善|短縮|向上).{0,12}(時間|%|パーセント|工数)/u],
    ["pricing", "料金・総コスト", /(料金|価格|月額|初期費用|見積)/u],
    ["security", "セキュリティ・認証", /(iso ?27001|isms|soc ?2|セキュリティ|認証)/iu],
  ];
  const related = lostPrompts.map((item) => item.promptId);
  const gaps = fields
    .filter(([, , pattern]) => !pattern.test(corpus))
    .slice(0, 3)
    .map(([id, label], index) => ({
      id,
      label,
      whyItMatters: "この情報が公開ページから見つからず、比較する材料が足りません。",
      relatedPromptIds: related.slice(0, Math.max(1, related.length - index)),
      relatedPromptCount: Math.max(1, related.length - index),
      confidence: .55,
      status: "missing" as const,
    }));
  const actions = gaps.map((gap, index) => {
    const priority = index === 0 ? "critical" as const : "high" as const;
    return {
      id: `action-${gap.id}`,
      title: `${gap.label}を、確認できる形で整理する`,
      rationale: gap.whyItMatters,
      type: "owned" as const,
      relatedPromptIds: gap.relatedPromptIds,
      relatedPromptCount: gap.relatedPromptCount,
      priority,
      confidence: gap.confidence,
      target: "公開ページ",
      impactScore: actionImpactScore({ relatedPromptCount: gap.relatedPromptCount, confidence: gap.confidence, priority }),
      effort: "medium" as const,
      audience: discovery.targetCustomers.slice(0, 2).join("・") || "公開ページを確認する利用者",
      stage: "比較" as const,
      customerConcern: gap.label,
      placement: "サービス概要・FAQ・料金案内",
      cta: "記載内容を確認する",
      successMetric: "同じ比較質問で、自社が候補に含まれたか",
      evidenceType: "observed" as const,
    };
  });
  return { gaps, actions };
}

export async function analyzeEvidence(input: { discovery: CompanyDiscovery; pages: CrawledPage[]; lostPrompts: LostPrompt[] }) {
  if (demoMode()) {
    const { gaps, actions } = demoEvidence(input.discovery, input.lostPrompts);
    return { gaps, actions: actions.map((action) => ({ ...action, impactScore: actionImpactScore(action) })) };
  }
  if (!env.openAiKey) return fallbackEvidence(input.discovery, input.pages, input.lostPrompts);
  try {
    const raw = await askJson<any>(`あなたは公開ページの内容確認を担当します。自社公開ページと、AI回答に含まれた候補・参照元を比べ、公開Webから確認できない情報と次に確認する内容を出してください。「存在しない」と断定せず、「確認できない」と書いてください。順位上昇、売上、因果効果は推測しないでください。画面に出す文言は普通の日本語で短くしてください。JSONだけ返してください。
形式:{"gaps":[{"id":"","label":"","whyItMatters":"","relatedPromptIds":[""],"competitorEvidence":"","confidence":0.0,"status":"missing|partial"}],"actions":[{"id":"","title":"","rationale":"","type":"owned|third_party|technical|positioning|entity","relatedPromptIds":[""],"priority":"critical|high|medium","confidence":0.0,"target":"","audience":"","stage":"認知|比較|検討|導入","customerConcern":"","placement":"","cta":"","successMetric":""}]}
会社:${JSON.stringify(input.discovery)}
自社ページ:${JSON.stringify(compactPages(input.pages))}
候補外質問:${JSON.stringify(input.lostPrompts.slice(0, 10))}`);
    const gaps: EvidenceGap[] = (Array.isArray(raw.gaps) ? raw.gaps : []).slice(0, 10).map((item: any, index: number) => {
      const ids = Array.isArray(item.relatedPromptIds) ? item.relatedPromptIds.map(String) : [];
      return {
        id: String(item.id || `gap-${index}`),
        label: String(item.label || "確認できる情報の差"),
        whyItMatters: String(item.whyItMatters || "比較に必要な情報を公開ページから確認できません。"),
        relatedPromptIds: ids,
        relatedPromptCount: ids.length,
        competitorEvidence: item.competitorEvidence ? String(item.competitorEvidence) : undefined,
        confidence: Math.max(0, Math.min(1, Number(item.confidence || .6))),
        status: item.status === "partial" ? "partial" : "missing",
      };
    });
    const actions: ActionCard[] = (Array.isArray(raw.actions) ? raw.actions : []).slice(0, 10).map((item: any, index: number) => {
      const ids = Array.isArray(item.relatedPromptIds) ? item.relatedPromptIds.map(String) : [];
      const type = ["owned", "third_party", "technical", "positioning", "entity"].includes(item.type) ? item.type : "owned";
      const priority = ["critical", "high", "medium"].includes(item.priority) ? item.priority : "medium";
      const confidence = Math.max(0, Math.min(1, Number(item.confidence || .6)));
      const stage = ["認知", "比較", "検討", "導入"].includes(item.stage) ? item.stage as ActionCard["stage"] : "比較";
      return {
        id: String(item.id || `action-${index}`),
        title: String(item.title || "不足している情報を確認する"),
        rationale: String(item.rationale || "比較に必要な情報を公開ページから確認できません。"),
        type,
        relatedPromptIds: ids,
        relatedPromptCount: ids.length,
        priority,
        confidence,
        target: String(item.target || "公開ページ"),
        impactScore: actionImpactScore({ relatedPromptCount: ids.length, confidence, priority }),
        effort: type === "technical" ? "high" as const : "medium" as const,
        audience: String(item.audience || input.discovery.targetCustomers.slice(0, 2).join("・") || "公開ページを確認する利用者"),
        stage,
        customerConcern: String(item.customerConcern || "選ぶ前に確認したい情報"),
        placement: String(item.placement || item.target || "公開ページ"),
        cta: String(item.cta || "記載内容を確認する"),
        successMetric: String(item.successMetric || "同じ比較質問で、自社が候補に含まれたか"),
        evidenceType: item.evidenceType === "observed" ? "observed" : "hypothesis",
      };
    }).sort((a: ActionCard, b: ActionCard) => (b.impactScore || 0) - (a.impactScore || 0));
    return gaps.length || actions.length ? { gaps, actions } : fallbackEvidence(input.discovery, input.pages, input.lostPrompts);
  } catch {
    return fallbackEvidence(input.discovery, input.pages, input.lostPrompts);
  }
}
