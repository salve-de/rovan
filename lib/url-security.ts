import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { env } from "@/lib/env";

const IPV4_PRIVATE = [
  /^0\./,
  /^10\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.0\.0\./,
  /^192\.0\.2\./,
  /^192\.168\./,
  /^198\.(1[89])\./,
  /^198\.51\.100\./,
  /^203\.0\.113\./,
  /^224\./,
  /^2(2[5-9]|3\d)\./,
  /^24\d\./,
  /^25[0-5]\./,
];

function blockedAddress(address: string) {
  const normalized = address.toLowerCase();
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return IPV4_PRIVATE.some((pattern) => pattern.test(mapped));
  if (isIP(normalized) === 4) return IPV4_PRIVATE.some((pattern) => pattern.test(normalized));
  if (isIP(normalized) === 6) {
    return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("2001:db8:");
  }
  return false;
}

export function normalizePublicUrl(input: string) {
  const raw = input.trim();
  if (!raw) throw new Error("ホームページのURLを入れてください。");
  if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:/i.test(raw)) throw new Error("http:// か https:// で始まるURLを入れてください。");
  const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("http:// か https:// で始まるURLを入れてください。");
  if (parsed.username || parsed.password) throw new Error("このURLは使えません（ID・パスワード入り）。");
  if (parsed.port && !["80", "443"].includes(parsed.port)) throw new Error("このURLは使えません（標準ポート以外）。");
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("インターネットに公開されているURLを入れてください。");
  if (isIP(host) && blockedAddress(host)) throw new Error("このURLは使えません（内部IP）。");
  parsed.hostname = host;
  parsed.hash = "";
  return parsed.toString();
}

async function assertPublicHost(hostname: string) {
  if (isIP(hostname)) {
    if (blockedAddress(hostname)) throw new Error("このURLには接続できません。");
    return;
  }
  const records = await lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => blockedAddress(record.address))) throw new Error("このURLには接続できません。");
}

export function isSameOrigin(input: string, allowedOrigin: string) {
  try {
    return new URL(input).origin === new URL(allowedOrigin).origin;
  } catch {
    return false;
  }
}

export async function safeFetch(input: string, init: RequestInit & { timeoutMs?: number; allowedOrigin?: string } = {}) {
  const { timeoutMs = 12_000, allowedOrigin, ...requestInit } = init;
  let current = new URL(normalizePublicUrl(input));
  const origin = allowedOrigin ? new URL(normalizePublicUrl(allowedOrigin)).origin : current.origin;
  if (!isSameOrigin(current.toString(), origin)) throw new Error("許可されたドメイン以外には接続できません。");
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    await assertPublicHost(current.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(current, {
        ...requestInit,
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": `RovanBot/0.1 (+${env.siteUrl.replace(/\/$/, "")}/methodology)`,
          accept: "text/html,application/xhtml+xml,application/xml,text/plain;q=0.8,*/*;q=0.2",
          ...(init.headers || {}),
        },
      });
    } finally {
      clearTimeout(timer);
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("不正なリダイレクトです。");
      const next = new URL(location, current);
      if (!["http:", "https:"].includes(next.protocol)) throw new Error("安全でないリダイレクトです。");
      if (!isSameOrigin(next.toString(), origin)) throw new Error("許可されたドメイン以外へのリダイレクトです。");
      current = next;
      continue;
    }
    return response;
  }
  throw new Error("リダイレクトが多すぎます。");
}

export async function safeFetchText(input: string, maxBytes = 1_500_000, allowedOrigin?: string) {
  const response = await safeFetch(input, allowedOrigin ? { allowedOrigin } : undefined);
  if (!response.ok) throw new Error(`公開ページを取得できませんでした (${response.status})`);
  const type = response.headers.get("content-type") || "";
  if (!/(text|html|xml|json)/i.test(type)) throw new Error("対応していないページ形式です。");
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error("ページサイズが上限を超えました。");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > maxBytes) throw new Error("ページサイズが上限を超えました。");
  return { response, text: new TextDecoder().decode(bytes) };
}
