import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { durableStorageAvailable } from "@/lib/runtime-readiness";
import { demoRateLimitBypass } from "@/lib/demo-mode";

const globalLimits = globalThis as unknown as { aixNextLimits?: Map<string, { count: number; resetAt: number }> };
const memory = globalLimits.aixNextLimits ?? new Map<string, { count: number; resetAt: number }>();
globalLimits.aixNextLimits = memory;

function hash(value: string) {
  return createHash("sha256").update(`${env.rateLimitSalt}:${value}`).digest("hex");
}

function clientIp(request: Request) {
  return (request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim();
}

async function consumeSupabase(key: string, limit: number, windowSeconds: number) {
  if (!env.supabaseUrl || !env.supabaseServiceKey) return null;
  const response = await fetch(`${env.supabaseUrl}/rest/v1/rpc/aix_next_consume_rate_limit`, {
    signal: AbortSignal.timeout(10_000),
    method: "POST",
    headers: { apikey: env.supabaseServiceKey, authorization: `Bearer ${env.supabaseServiceKey}`, "content-type": "application/json" },
    body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: windowSeconds }),
  });
  if (!response.ok) throw new Error(`Rate limit storage unavailable (${response.status})`);
  return await response.json() as { allowed: boolean; reset_at: string };
}

function consumeMemory(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const current = memory.get(key);
  const next = !current || current.resetAt <= now ? { count: 1, resetAt: now + windowSeconds * 1000 } : { count: current.count + 1, resetAt: current.resetAt };
  memory.set(key, next);
  return { allowed: next.count <= limit, reset_at: new Date(next.resetAt).toISOString() };
}

async function consume(key: string, limit: number, windowSeconds: number) {
  // 開発サーバーのデモ（AIキー未設定）では外部の有料APIを呼ばないので、監査で何度も試せるよう制限しない
  if (demoRateLimitBypass()) return { allowed: true, reset_at: new Date(Date.now() + windowSeconds * 1000).toISOString() };
  if (durableStorageAvailable()) {
    const value = await consumeSupabase(key, limit, windowSeconds);
    if (value) return value;
  }
  return consumeMemory(key, limit, windowSeconds);
}

/** Bound public-profile creation independently of paid scans. */
export async function consumeProfileCreation(request: Request) {
  try {
    return result(await consume(`ip-profile:${hash(clientIp(request))}`, 10, 3600));
  } catch {
    return { allowed: false, retryAfter: 60 };
  }
}

function result(value: { allowed: boolean; reset_at: string }) {
  return {
    allowed: value.allowed,
    retryAfter: Math.max(1, Math.ceil((new Date(value.reset_at).getTime() - Date.now()) / 1000)),
  };
}

export async function consumeFreeScan(request: Request, url: string) {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    const ip = clientIp(request);
    const ipLimit = await consume(`ip:${hash(ip)}`, env.freeScansPerHour, 3600);
    if (!ipLimit.allowed) return result(ipLimit);

    const targetLimit = await consume(`ip-target:${hash(`${ip}:${domain}`)}`, 3, 3600);
    return result(targetLimit);
  } catch {
    return { allowed: false, retryAfter: 60 };
  }
}

/** Name resolution can call a paid web-search API before a scan exists, so it
 * gets its own small per-IP budget instead of bypassing abuse protection. */
export async function consumeNameResolution(request: Request) {
  try {
    const ip = clientIp(request);
    const limit = await consume(`ip-resolve:${hash(ip)}`, Math.max(2, env.freeScansPerHour * 2), 3600);
    return result(limit);
  } catch {
    return { allowed: false, retryAfter: 60 };
  }
}
