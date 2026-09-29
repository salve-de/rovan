import "server-only";
import { isNoSiteTarget } from "@/lib/no-site";
import { isAllowedByRobots } from "@/lib/robots";
import { safeFetchText } from "@/lib/url-security";
import type { AiCrawlerName, CrawlAudit, CrawledPage } from "@/lib/types";

const AI_CRAWLERS: AiCrawlerName[] = ["OAI-SearchBot", "PerplexityBot", "ClaudeBot", "Claude-User", "Googlebot", "Bingbot", "GPTBot"];

function decode(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, number) => String.fromCharCode(Number(number)));
}

function cleanText(html: string) {
  return decode(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function firstMatch(source: string, pattern: RegExp) {
  return decode(source.match(pattern)?.[1]?.replace(/\s+/g, " ").trim() || "");
}

function firstAttribute(source: string, tagName: string, attribute: string) {
  const tag = source.match(new RegExp(`<${tagName}\\b[^>]*>`, "i"))?.[0] || "";
  return firstMatch(tag, new RegExp(`${attribute}\\s*=\\s*["']([^"']*)["']`, "i"));
}

function metaContent(source: string, name: string) {
  for (const match of source.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const declaredName = firstMatch(tag, /(?:name|property)\s*=\s*["']([^"']*)["']/i).toLowerCase();
    if (declaredName === name.toLowerCase()) return firstMatch(tag, /content\s*=\s*["']([^"']*)["']/i);
  }
  return "";
}

function canonicalHref(source: string) {
  for (const match of source.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = firstMatch(tag, /rel\s*=\s*["']([^"']*)["']/i).toLowerCase().split(/\s+/);
    if (rel.includes("canonical")) return firstMatch(tag, /href\s*=\s*["']([^"']*)["']/i);
  }
  return "";
}

function structuredDataInfo(source: string, visibleText: string) {
  const types = new Set<string>();
  const visibleCandidates: string[] = [];
  const collect = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    const item = value as Record<string, unknown>;
    if (typeof item["@type"] === "string") types.add(item["@type"]);
    if (Array.isArray(item["@type"])) {
      item["@type"].filter((type: unknown): type is string => typeof type === "string").forEach((type) => types.add(type));
    }
    for (const key of ["name", "description", "headline", "brand"]) {
      const candidate = item[key];
      if (typeof candidate === "string" && candidate.trim().length >= 4) visibleCandidates.push(candidate.trim());
      if (candidate && typeof candidate === "object") collect(candidate);
    }
    if (item["@graph"]) collect(item["@graph"]);
  };
  for (const match of source.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collect(JSON.parse(match[1]));
    } catch { /* malformed JSON-LD is an audit finding, not a crawl failure */ }
  }
  const visible = visibleText.toLowerCase();
  return { types: [...types], matchesVisible: !visibleCandidates.length || visibleCandidates.some((candidate) => visible.includes(candidate.toLowerCase())) };
}

function parsePage(url: string, html: string, headers?: Headers): CrawledPage {
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = metaContent(html, "description");
  const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((match) => cleanText(match[1])).filter(Boolean).slice(0, 24);
  const canonical = canonicalHref(html);
  let canonicalUrl: string | undefined;
  try { if (canonical) canonicalUrl = new URL(decode(canonical), url).toString(); } catch { /* malformed canonical is handled as missing */ }
  const robotsDirectives = [metaContent(html, "robots"), headers?.get("x-robots-tag") || ""].filter(Boolean).join(", ");
  const visibleText = cleanText(html);
  const structuredData = structuredDataInfo(html, visibleText);
  return {
    url,
    title,
    description,
    headings,
    text: visibleText.slice(0, 30_000),
    canonicalUrl,
    robotsDirectives: robotsDirectives || undefined,
    noindex: /(^|[\s,])noindex([\s,]|$)/i.test(robotsDirectives),
    hasStructuredData: structuredData.types.length > 0,
    structuredDataTypes: structuredData.types,
    structuredDataMatchesVisible: structuredData.matchesVisible,
    h1Count: [...html.matchAll(/<h1\b[^>]*>/gi)].length,
    lang: firstAttribute(html, "html", "lang") || undefined,
  };
}

function linksFromHtml(base: URL, html: string) {
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]+href=["']([^"'#]+)["']/gi)) {
    try {
      const url = new URL(match[1], base);
      if (url.origin !== base.origin || !["http:", "https:"].includes(url.protocol)) continue;
      url.hash = "";
      if (/\.(?:jpg|jpeg|png|gif|webp|svg|zip|mp4|mp3|css|js|woff2?|ttf)(?:$|\?)/i.test(url.pathname)) continue;
      links.add(url.toString());
    } catch { /* ignore malformed links */ }
  }
  return [...links];
}

function priority(url: string) {
  const path = new URL(url).pathname.toLowerCase();
  const patterns = [
    /product|service|solution|機能|サービス|製品/,
    /pricing|price|料金|費用/,
    /case|customer|導入|事例|実績/,
    /about|company|会社|企業/,
    /security|trust|安全|セキュリティ|認証/,
    /faq|help|support|docs|よくある|サポート/,
    /integration|連携/,
  ];
  const index = patterns.findIndex((pattern) => pattern.test(path));
  return index < 0 ? 50 + path.split("/").length : index;
}

function sitemapUrls(base: URL, xml: string) {
  const urls: string[] = [];
  for (const match of xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)) {
    try {
      const url = new URL(decode(match[1].trim()), base);
      if (url.origin === base.origin) urls.push(url.toString());
    } catch { /* ignore */ }
  }
  return urls;
}

function sitemapHints(base: URL, robots: string) {
  const urls: string[] = [];
  for (const match of robots.matchAll(/^\s*sitemap\s*:\s*([^\s#]+)/gim)) {
    try {
      const url = new URL(decode(match[1]), base);
      if (url.origin === base.origin && ["http:", "https:"].includes(url.protocol)) urls.push(url.toString());
    } catch { /* ignore malformed sitemap hints */ }
  }
  return urls;
}

async function robotsFor(url: URL, cache: Map<string, string>, allowedOrigin: string) {
  if (cache.has(url.origin)) return cache.get(url.origin) || "";
  let robots = "";
  try { robots = (await safeFetchText(`${url.origin}/robots.txt`, 300_000, allowedOrigin)).text; } catch { /* absent robots */ }
  cache.set(url.origin, robots);
  return robots;
}

/** 読み込むページがないとき（ホームページなしで名前だけ調べる場合など）の結果 */
export function emptyCrawl(): { pages: CrawledPage[]; robots: string; attempted: number; audit?: CrawlAudit } {
  return { pages: [], robots: "", attempted: 0 };
}

export async function crawlCompanySite(input: string, maxPages = 24): Promise<{ pages: CrawledPage[]; robots: string; attempted: number; audit?: CrawlAudit }> {
  // 名前だけの診断対象（.invalid の予約ドメイン）には接続しない
  if (isNoSiteTarget(input)) return emptyCrawl();
  const start = new URL(input);
  const allowedOrigin = start.origin;
  const robotsCache = new Map<string, string>();
  const startRobots = await robotsFor(start, robotsCache, allowedOrigin);
  const queue = new Set<string>([start.toString(), `${start.origin}/`]);

  let sitemapFound = false;
  let sitemapUrl: string | undefined;
  const sitemapCandidates = [...new Set([
    ...sitemapHints(start, startRobots),
    `${start.origin}/sitemap.xml`,
    `${start.origin}/sitemap_index.xml`,
    `${start.origin}/sitemap-index.xml`,
  ])];
  for (const candidate of sitemapCandidates) {
    try {
      const sitemap = await safeFetchText(candidate, 1_500_000, allowedOrigin);
      const sitemapBase = new URL(sitemap.response.url || candidate);
      if (sitemapBase.origin !== start.origin) continue;
      sitemapFound = true;
      sitemapUrl ||= sitemapBase.toString();
      const references = sitemapUrls(sitemapBase, sitemap.text);
      if (/<sitemapindex\b/i.test(sitemap.text)) {
        for (const child of references.filter((url) => /sitemap/i.test(new URL(url).pathname)).slice(0, 8)) {
          try {
            const childSitemap = await safeFetchText(child, 1_500_000, allowedOrigin);
            sitemapUrls(new URL(childSitemap.response.url || child), childSitemap.text).sort((a, b) => priority(a) - priority(b)).slice(0, maxPages * 4).forEach((url) => queue.add(url));
          } catch { /* one child sitemap can be unavailable without invalidating the crawl */ }
        }
      } else {
        references.sort((a, b) => priority(a) - priority(b)).slice(0, maxPages * 4).forEach((url) => queue.add(url));
      }
      if (references.length || sitemapCandidates.length === 1) break;
    } catch { /* sitemap is optional */ }
  }

  const pages: CrawledPage[] = [];
  const visited = new Set<string>();
  let pagesBlockedByRobots = 0;
  while (queue.size && pages.length < maxPages) {
    const next = [...queue].sort((a, b) => priority(a) - priority(b))[0];
    queue.delete(next);
    if (visited.has(next)) continue;
    visited.add(next);
    const requestedUrl = new URL(next);
    const requestedRobots = await robotsFor(requestedUrl, robotsCache, allowedOrigin);
    if (requestedRobots && !isAllowedByRobots(requestedRobots, requestedUrl.pathname, "rovanbot")) {
      pagesBlockedByRobots += 1;
      continue;
    }
    try {
      const { text, response } = await safeFetchText(requestedUrl.toString(), 1_500_000, allowedOrigin);
      const type = response.headers.get("content-type") || "";
      if (!/html|xhtml/i.test(type)) continue;
      const effectiveUrl = new URL(response.url || requestedUrl.toString());
      const effectiveRobots = await robotsFor(effectiveUrl, robotsCache, allowedOrigin);
      if (effectiveRobots && !isAllowedByRobots(effectiveRobots, effectiveUrl.pathname, "rovanbot")) {
        pagesBlockedByRobots += 1;
        continue;
      }
      const page = parsePage(effectiveUrl.toString(), text, response.headers);
      if (page.text.length < 80) continue;
      pages.push(page);
      linksFromHtml(effectiveUrl, text).sort((a, b) => priority(a) - priority(b)).slice(0, 40).forEach((link) => {
        if (!visited.has(link)) queue.add(link);
      });
    } catch { /* partial crawl is valid */ }
  }
  if (!pages.length) throw new Error("ホームページを読み込めませんでした。URLが正しいか確かめてください。");
  const crawlerAccess = Object.fromEntries(AI_CRAWLERS.map((agent) => [agent, pages.every((page) => {
    try { return isAllowedByRobots(startRobots, new URL(page.url).pathname, agent); } catch { return false; }
  })])) as Partial<Record<AiCrawlerName, boolean>>;
  const audit: CrawlAudit = {
    robotsTxtFound: Boolean(startRobots.trim()),
    sitemapFound,
    sitemapUrl,
    attempted: visited.size,
    pagesCrawled: pages.length,
    pagesBlockedByRobots,
    pagesNoindex: pages.filter((page) => page.noindex).length,
    pagesMissingCanonical: pages.filter((page) => !page.canonicalUrl).length,
    pagesCanonicalMismatch: pages.filter((page) => {
      if (!page.canonicalUrl) return false;
      try {
        const actual = new URL(page.url);
        const canonical = new URL(page.canonicalUrl);
        return actual.origin !== canonical.origin || actual.pathname.replace(/\/$/, "") !== canonical.pathname.replace(/\/$/, "") || actual.search !== canonical.search;
      } catch { return true; }
    }).length,
    pagesWithStructuredData: pages.filter((page) => page.hasStructuredData).length,
    pagesWithStructuredDataMismatch: pages.filter((page) => page.hasStructuredData && page.structuredDataMatchesVisible === false).length,
    pagesMissingTitle: pages.filter((page) => !page.title.trim()).length,
    pagesMissingDescription: pages.filter((page) => !page.description.trim()).length,
    pagesMissingH1: pages.filter((page) => !page.h1Count).length,
    aiSearchBotAllowed: crawlerAccess["OAI-SearchBot"] !== false,
    gptBotAllowed: crawlerAccess.GPTBot !== false,
    crawlerAccess,
  };
  return { pages, robots: startRobots, attempted: visited.size, audit };
}
