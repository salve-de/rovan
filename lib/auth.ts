import crypto from "node:crypto";
import { env } from "@/lib/env";

export const SESSION_COOKIE_NAME = "rovan_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const LOGIN_LINK_TTL_SECONDS = 15 * 60; // 15 minutes

/**
 * Production must never sign or verify session/login tokens with a
 * hardcoded fallback secret — that would let anyone forge a session. If
 * AUTH_SECRET is missing in production, fail closed (login/verification
 * throws) instead of silently signing with a guessable value. This is
 * evaluated per call, not at module load, so a missing AUTH_SECRET does not
 * break the build — it only breaks login, which is the safe direction.
 */
function getSecretKey(): string {
  if (env.authSecret) return env.authSecret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET が設定されていないため、ログイン機能を安全に提供できません。");
  }
  return env.rateLimitSalt || "rovan-dev-only-insecure-secret";
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

function sign(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export type SessionPayload = {
  email: string;
  watchToken?: string;
  brandName?: string;
  exp: number;
};

export function createSessionToken(data: { email: string; watchToken?: string; brandName?: string }): string {
  const payload: SessionPayload = {
    email: data.email.trim().toLowerCase(),
    watchToken: data.watchToken,
    brandName: data.brandName,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(body, getSecretKey());
  return `${body}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body, getSecretKey());
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || crypto.timingSafeEqual(sigBuf, expBuf) === false) {
      return null;
    }
    const payload = JSON.parse(base64UrlDecode(body)) as SessionPayload;
    if (!payload.email || typeof payload.exp !== "number") return null;
    if (Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createOneTimeLoginToken(email: string): string {
  const payload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + LOGIN_LINK_TTL_SECONDS,
    nonce: crypto.randomBytes(8).toString("hex"),
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(body, getSecretKey());
  return `${body}.${signature}`;
}

export function verifyOneTimeLoginToken(token: string): { email: string } | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body, getSecretKey());
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || crypto.timingSafeEqual(sigBuf, expBuf) === false) {
      return null;
    }
    const payload = JSON.parse(base64UrlDecode(body)) as { email: string; exp: number };
    if (!payload.email || typeof payload.exp !== "number") return null;
    if (Math.floor(Date.now() / 1000) > payload.exp) return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}

export function buildSessionCookieHeader(token: string, secure = process.env.NODE_ENV === "production"): string {
  const secureFlag = secure ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; SameSite=Lax${secureFlag}`;
}

export function buildClearCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

export function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const found = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!found) return null;
  return decodeURIComponent(found.slice(`${SESSION_COOKIE_NAME}=`.length));
}
