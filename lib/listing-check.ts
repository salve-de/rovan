import "server-only";
import { env } from "@/lib/env";
import { demoMode } from "@/lib/demo-mode";
import { compareListing, extractSiteContact, parseWebAnswer } from "@/lib/listing-facts";
import { parseGeminiInteractionResponse, parsePerplexitySonarResponse } from "@/lib/providers/parsers";
import type { CompanyDiscovery, CrawledPage, ListingCheck } from "@/lib/types";

const UNKNOWN: ListingCheck = { status: "unknown", items: [] };

function question(discovery: CompanyDiscovery) {
  return [
    "次の事業者の住所と電話番号を、Googleマップ・ポータルサイト・SNSなど、ネット上の公開情報で調べてください。事業者自身のホームページ以外の情報源を優先してください。",
    `事業者名: ${discovery.brandName}`,
    discovery.market ? `分野・地域: ${discovery.market}` : "",
    discovery.domain ? `ホームページ: ${discovery.domain}` : "",
    "推測はしないでください。見つからない項目は null にしてください。",
    '次のJSONだけを返してください: {"found": true または false, "phone": "電話番号" または null, "phone_source": "出典のURL" または null, "address": "住所" または null, "address_source": "出典のURL" または null}',
  ].filter(Boolean).join("\n");
}

async function askGemini(text: string, signal: AbortSignal) {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST", signal,
    headers: { "content-type": "application/json", "x-goog-api-key": env.geminiKey },
    body: JSON.stringify({ model: env.geminiModel, input: text, tools: [{ type: "google_search" }] }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  return parseGeminiInteractionResponse(data).rawText;
}

async function askPerplexity(text: string, signal: AbortSignal) {
  const response = await fetch("https://api.perplexity.ai/v1/sonar", {
    method: "POST", signal,
    headers: { authorization: `Bearer ${env.perplexityKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: env.perplexityModel, messages: [{ role: "user", content: text }], web_search_options: { search_mode: "web" }, language_preference: "ja", temperature: 0 }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Perplexity ${response.status}`);
  return parsePerplexitySonarResponse(data).rawText;
}

/**
 * 診断のついでに1回だけAIに調べさせる。Google検索が使えて無料枠のある Gemini を優先する。
 * デモ（AI未接続）・ホームページに連絡先がない・失敗したときは「比べられなかった」として画面に出さない。
 */
export async function checkListing(discovery: CompanyDiscovery, pages: CrawledPage[]): Promise<ListingCheck> {
  if (!pages.length || demoMode()) return UNKNOWN;
  const site = extractSiteContact(pages);
  if (!site.phone && !site.address) return UNKNOWN;
  const ask = env.geminiKey ? askGemini : env.perplexityKey ? askPerplexity : null;
  if (!ask) return UNKNOWN;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const text = await ask(question(discovery), controller.signal);
    return compareListing(site, parseWebAnswer(text), discovery.domain.replace(/^www\./u, ""));
  } catch {
    return UNKNOWN;
  } finally {
    clearTimeout(timer);
  }
}
