import "server-only";
import { env } from "@/lib/env";
import { parseGeminiInteractionResponse, parseOpenAiWebSearchResponse, parsePerplexitySonarResponse } from "@/lib/providers/parsers";
import { normalizePublicUrl } from "@/lib/url-security";
import { isUrlInput } from "@/lib/input-kind";

const MAX_INPUT_LENGTH = 160;
const MAX_CANDIDATES = 5;

export type InputResolutionCandidate = {
  url: string;
  title: string;
  reason: string;
};

export type InputResolution = {
  input: string;
  kind: "url" | "name";
  candidates: InputResolutionCandidate[];
  provider?: "openai" | "gemini" | "perplexity";
};

type ProviderResult = {
  provider: NonNullable<InputResolution["provider"]>;
  rawText: string;
  citations: Array<{ url: string; title?: string }>;
};

function cleanInput(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_INPUT_LENGTH);
}

function searchPrompt(input: string) {
  return `あなたは公開Webの調査担当です。入力された会社名・店舗名・サービス名・クリエイター・インフルエンサー・活動名に対応する、診断対象にできる公開サイトや公式アカウントの候補を探してください。

必ず次のJSONだけを返してください。説明文、Markdown、コードフェンスは不要です。
{"candidates":[{"url":"https://example.com/","title":"表示名","reason":"この候補と入力名が対応する公開情報上の理由"}]}

ルール:
- 公式のサイト、製品・サービス紹介ページ、公式SNS（X/Instagram/YouTube）、リンク集（lit.link等）、Googleビジネスプロフィールの情報を優先する
- 入力に地域名（例: 高崎、世田谷、大田区など）が含まれる場合、必ずその地域に実在する店舗・会社を厳密に特定し、同名他地域の別店舗と混同しないこと
- 検索エンジンの検索結果一覧ページ、汎用比較サイト、求人サイト、Wikipediaは候補にしない
- 候補が複数ある場合は最大5件。入力と無関係な候補を埋めない
- URLは実在する公開ページ・アカウントのみを書き、架空のURLを捏造（ハルシネーション）しないこと
- 断定できないときは候補を空配列にする
- 日本語の入力には日本語で答える

入力: ${input}`;
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || data?.detail?.[0]?.msg || `検索Provider ${response.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function searchWithOpenAi(input: string): Promise<ProviderResult> {
  const data = await fetchJson("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${env.openAiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: env.openAiDiscoveryModel,
      input: searchPrompt(input),
      tools: [{ type: "web_search" }],
      tool_choice: "required",
      include: ["web_search_call.action.sources"],
    }),
  });
  const parsed = parseOpenAiWebSearchResponse(data);
  return { provider: "openai", rawText: parsed.rawText, citations: parsed.citations };
}

async function searchWithGemini(input: string): Promise<ProviderResult> {
  const data = await fetchJson("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.geminiKey },
    body: JSON.stringify({ model: env.geminiModel, input: searchPrompt(input), tools: [{ type: "google_search" }] }),
  });
  const parsed = parseGeminiInteractionResponse(data);
  return { provider: "gemini", rawText: parsed.rawText, citations: parsed.citations };
}

async function searchWithPerplexity(input: string): Promise<ProviderResult> {
  const data = await fetchJson("https://api.perplexity.ai/v1/sonar", {
    method: "POST",
    headers: { authorization: `Bearer ${env.perplexityKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: env.perplexityModel,
      messages: [{ role: "user", content: searchPrompt(input) }],
      web_search_options: { search_mode: "web" },
      language_preference: "ja",
      temperature: 0.1,
    }),
  });
  const parsed = parsePerplexitySonarResponse(data);
  return { provider: "perplexity", rawText: parsed.rawText, citations: parsed.citations };
}

function parseJsonLike(text: string): any {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const starts = [cleaned.indexOf("{"), cleaned.indexOf("[")].filter((index) => index >= 0);
  if (!starts.length) return null;
  const source = cleaned.slice(Math.min(...starts));
  try { return JSON.parse(source); } catch {
    const end = Math.max(source.lastIndexOf("}"), source.lastIndexOf("]"));
    if (end < 0) return null;
    try { return JSON.parse(source.slice(0, end + 1)); } catch { return null; }
  }
}

function urlsFromText(text: string) {
  return [...text.matchAll(/https?:\/\/[^\s<>"'`]+/gi)].map((match) => match[0].replace(/[),.;:!?]+$/, ""));
}

const EXCLUDED_HOSTS = new Set([
  "google.com", "www.google.com", "bing.com", "www.bing.com", "search.yahoo.co.jp", "yahoo.co.jp",
  "wikipedia.org", "ja.wikipedia.org",
  "g2.com", "www.g2.com", "crunchbase.com", "www.crunchbase.com", "prtimes.jp", "www.prtimes.jp",
]);

function isExcludedHost(host: string) {
  const normalized = host.replace(/^www\./, "");
  return [...EXCLUDED_HOSTS].some((excluded) => {
    const root = excluded.replace(/^www\./, "");
    return normalized === root || normalized.endsWith(`.${root}`);
  });
}

function candidateUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const normalized = normalizePublicUrl(value);
    const host = new URL(normalized).hostname.replace(/^www\./, "");
    if (isExcludedHost(host)) return null;
    return normalized;
  } catch {
    return null;
  }
}

function candidatesFromResult(result: ProviderResult) {
  const parsed = parseJsonLike(result.rawText);
  const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.candidates) ? parsed.candidates : [];
  const candidates: InputResolutionCandidate[] = [];
  const seenOrigins = new Set<string>();
  const add = (urlValue: unknown, titleValue?: unknown, reasonValue?: unknown) => {
    const url = candidateUrl(urlValue);
    if (!url) return;
    const parsedUrl = new URL(url);
    if (seenOrigins.has(parsedUrl.origin)) return;
    seenOrigins.add(parsedUrl.origin);
    candidates.push({
      url,
      title: typeof titleValue === "string" && titleValue.trim() ? titleValue.trim().slice(0, 180) : parsedUrl.hostname.replace(/^www\./, ""),
      reason: typeof reasonValue === "string" && reasonValue.trim() ? reasonValue.trim().slice(0, 360) : "公開Webで見つかった診断候補です。",
    });
  };

  for (const item of items) {
    if (typeof item === "string") add(item);
    else if (item && typeof item === "object") add(item.url || item.homepage || item.site, item.title || item.name, item.reason);
  }
  for (const citation of result.citations) add(citation.url, citation.title);
  for (const url of urlsFromText(result.rawText)) add(url);
  return candidates.slice(0, MAX_CANDIDATES);
}

export async function resolvePublicInput(value: string): Promise<InputResolution> {
  const input = cleanInput(value);
  if (!input) throw new Error("社名・店名・URLのどれかを入れてください。");
  if (isUrlInput(input)) {
    const url = normalizePublicUrl(input);
    return { input, kind: "url", candidates: [{ url, title: "入力された公開サイト", reason: "入力されたURLをそのまま診断します。" }] };
  }
  if (input.length < 2) throw new Error("社名・店名は2文字以上で入れてください。");

  const attempts: Array<{ provider: NonNullable<InputResolution["provider"]>; enabled: boolean; run: () => Promise<ProviderResult> }> = [
    { provider: "openai", enabled: Boolean(env.openAiKey), run: () => searchWithOpenAi(input) },
    { provider: "gemini", enabled: Boolean(env.geminiKey), run: () => searchWithGemini(input) },
    { provider: "perplexity", enabled: Boolean(env.perplexityKey), run: () => searchWithPerplexity(input) },
  ];
  if (!attempts.some((attempt) => attempt.enabled)) {
    // 検索APIキーが未設定の場合でも、自社サイトなし企業救済フローへシームレスに誘導する
    return { input, kind: "name", candidates: [] };
  }

  for (const attempt of attempts) {
    if (!attempt.enabled) continue;
    try {
      const result = await attempt.run();
      const candidates = candidatesFromResult(result);
      if (candidates.length) return { input, kind: "name", candidates, provider: result.provider };
    } catch {
      // A provider can be temporarily unavailable. Try the next configured search source.
    }
  }
  // 候補が見つからなかった場合もエラーとせず、空配列を返してサイトなし企業救済画面へ遷移させる
  return { input, kind: "name", candidates: [] };
}
