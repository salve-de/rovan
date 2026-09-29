import type { AiCrawlerName, AiVisibilityAudit, CrawlAudit } from "@/lib/types";

/**
 * 御社のホームページを、AIのロボットが読めるかどうか。
 * robots.txt の設定と、Cloudflare などのファイアウォールでの遮断（実際にAIのロボットの名前で1回ずつ開いて確かめる）を見る。
 */

/** 実際に開いて確かめるロボット（公式の名乗り） */
export const PROBE_AGENTS: Array<[AiCrawlerName, string]> = [
  ["OAI-SearchBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.3; +https://openai.com/searchbot"],
  ["PerplexityBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)"],
];

/** 画面に出す3つのAIと、それぞれが使うロボット */
const AI_GROUPS: Array<{ ai: string; crawlers: AiCrawlerName[] }> = [
  { ai: "ChatGPT", crawlers: ["OAI-SearchBot", "ChatGPT-User"] },
  { ai: "Gemini", crawlers: ["Googlebot", "Google-Extended"] },
  { ai: "Perplexity", crawlers: ["PerplexityBot", "Perplexity-User"] },
];

/** ロボットの名前で開いたときの応答が「門前払い」かどうか */
export function probeBlocked(status: number, headers: Headers) {
  return [401, 403, 406, 451].includes(status) || headers.get("cf-mitigated") === "challenge";
}

export function isCloudflare(headers: Headers) {
  return Boolean(headers.get("cf-ray")) || /cloudflare/i.test(headers.get("server") || "");
}

export type AiAccessSummary = {
  /** blocked: 読めないAIがある / check: 外からは確かめきれない（Cloudflare） / ok: 読める */
  status: "ok" | "blocked" | "check";
  blocked: Array<{ ai: string; by: "robots" | "firewall" }>;
  cloudflare: boolean;
  /** トップページに「検索に出さない」設定（noindex）がある */
  homeNoindex: boolean;
};

/** 診断のときの取得記録から、画面に出す結論をつくる。サイトを読んでいない（ホームページなし等）ときは null */
export function summarizeAiAccess(audit?: AiVisibilityAudit | null): AiAccessSummary | null {
  const crawl: CrawlAudit | undefined = audit?.crawl;
  if (!crawl || !crawl.pagesCrawled) return null;
  const firewallBlocked = new Set(crawl.firewall?.blocked || []);
  const blocked: AiAccessSummary["blocked"] = [];
  for (const group of AI_GROUPS) {
    if (group.crawlers.some((crawler) => firewallBlocked.has(crawler))) blocked.push({ ai: group.ai, by: "firewall" });
    else if (group.crawlers.some((crawler) => crawl.crawlerAccess?.[crawler] === false)) blocked.push({ ai: group.ai, by: "robots" });
  }
  const cloudflare = crawl.firewall?.cdn === "cloudflare";
  const homeNoindex = audit?.checks.some((check) => check.id === "indexability" && check.status === "missing") || false;
  return { status: blocked.length || homeNoindex ? "blocked" : cloudflare ? "check" : "ok", blocked, cloudflare, homeNoindex };
}

/** ホームページを作った会社にそのまま渡せる、直し方の文面 */
export function aiAccessFixText(summary: AiAccessSummary, siteUrl: string) {
  const lines = [`【${siteUrl} の設定のお願い】`, "ChatGPT・Gemini・Perplexity などのAIが、このホームページを読めるようにしてください。"];
  if (summary.blocked.some((item) => item.by === "robots")) {
    lines.push("", "■ robots.txt", "次のロボットを Disallow しないでください（例）：", "User-agent: OAI-SearchBot", "User-agent: ChatGPT-User", "User-agent: PerplexityBot", "User-agent: Perplexity-User", "User-agent: Googlebot", "User-agent: Google-Extended", "Allow: /");
  }
  if (summary.blocked.some((item) => item.by === "firewall") || summary.cloudflare) {
    lines.push("", "■ Cloudflare などのファイアウォール", "AIのロボットをブロックする設定（Cloudflare の AI Crawl Control／Block AI bots など）で、OAI-SearchBot・ChatGPT-User・PerplexityBot・Perplexity-User を許可してください。学習用のロボット（GPTBot など）は止めたままでかまいません。");
  }
  if (summary.homeNoindex) {
    lines.push("", "■ トップページの noindex", "トップページに「検索に出さない」設定（meta robots の noindex）が入っています。意図したものでなければ外してください。");
  }
  return lines.join("\n");
}
