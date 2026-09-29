import "server-only";
import { after } from "next/server";
import { siteUrl } from "@/lib/site";

/**
 * Rovan の公開ページが公開・更新・停止されたことを、IndexNow に対応した検索エンジン（Bing など）へすぐ知らせる。
 * ChatGPT の検索は Bing の情報も使うため、載るまでの時間を縮められる。Google は sitemap（/ai/sitemap.xml）で知らせる。
 * INDEXNOW_KEY がない・本番の https でないときは何もしない。
 */
const KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/u;

export function indexNowKey() {
  const key = process.env.INDEXNOW_KEY?.trim() || "";
  return KEY_PATTERN.test(key) ? key : "";
}

function publicSite() {
  try {
    const url = new URL(siteUrl);
    if (url.protocol !== "https:") return null;
    if (/^(localhost|127\.0\.0\.1|\[::1\])$|\.(localhost|local|test|invalid|example)$/u.test(url.hostname)) return null;
    return url;
  } catch { return null; }
}

/** 通知できる設定かどうか */
export function indexNowEnabled() {
  return Boolean(indexNowKey() && publicSite());
}

export async function notifySearchEngines(paths: string[]) {
  const key = indexNowKey();
  const site = publicSite();
  if (!key || !site || !paths.length) return false;
  const urlList = [...new Set(paths.map((path) => new URL(path, site).toString()))].slice(0, 100);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: site.host, key, keyLocation: `${site.origin}/indexnow-key.txt`, urlList }),
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** 応答を返したあとに知らせる（リクエストの外から呼ばれたときは、その場で送る） */
export function notifySearchEnginesAfterResponse(paths: string[]) {
  if (!indexNowEnabled()) return;
  const task = async () => { await notifySearchEngines(paths); };
  try { after(task); } catch { void task(); }
}

export function publicProfilePath(slug: string) {
  return `/ai/company/${encodeURIComponent(slug)}`;
}
