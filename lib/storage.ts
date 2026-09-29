import "server-only";
import { id } from "@/lib/ids";
import { env } from "@/lib/env";
import type {
  EvidenceAnswer,
  CrawledPage,
  PublicProfileDraft,
  PublicProfileRecord,
  ScanRecord,
  ScanResult,
  WatchRecord,
} from "@/lib/types";
import { toPublicProfile } from "@/lib/public-profile";
import { buildAutomatedFacts, changedFacts, mergeAutomatedFacts } from "@/lib/profile-automation";
import { publicProfileSlug } from "@/lib/public-profile-path";
import { durableStorageAvailable } from "@/lib/runtime-readiness";
import { directProfileOrigin } from "@/lib/profile-origin";

const globalMemory = globalThis as unknown as {
  aixNextScans?: Map<string, ScanRecord>;
  aixNextWatches?: Map<string, WatchRecord>;
  aixNextPublicProfiles?: Map<string, PublicProfileRecord>;
};
const scans = globalMemory.aixNextScans ?? new Map<string, ScanRecord>();
const watches = globalMemory.aixNextWatches ?? new Map<string, WatchRecord>();
const publicProfiles = globalMemory.aixNextPublicProfiles ?? new Map<string, PublicProfileRecord>();
globalMemory.aixNextScans = scans;
globalMemory.aixNextWatches = watches;
globalMemory.aixNextPublicProfiles = publicProfiles;

const PUBLIC_PROFILE_DEFAULT_TTL_DAYS = 30;
const PUBLIC_PROFILE_MAX_TTL_DAYS = 365;
const DAY_MS = 86_400_000;

type PublicProfileStorageOptions = {
  sourceScanId?: string;
  /** Trusted server Request.url; only used for unconfigured local development. */
  requestUrl?: string;
  requestOrigin?: string;
  expiresInDays?: number;
  /** Test/maintenance hook; regular callers should use the current time. */
  now?: Date | string;
  /** Explicit expiry is useful when restoring a record; it is not user input. */
  expiresAt?: string;
  /** 自社サイトのない下書き（Rovan上のページが参照先）。診断に紐付けたまま direct-creation と同じ公開先に直す */
  direct?: boolean;
};

function profileDate(value?: Date | string) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) throw new Error("公開レコードの日時が不正です。");
  return date;
}

function clonePublicProfileDraft(draft: PublicProfileDraft): PublicProfileDraft {
  return {
    title: draft.title,
    brandName: draft.brandName,
    targetUrl: draft.targetUrl,
    summary: draft.summary,
    market: draft.market,
    targetCustomers: [...draft.targetCustomers],
    useCases: [...draft.useCases],
    facts: draft.facts.map((fact) => ({ ...fact })),
    sourcePages: draft.sourcePages.map((page) => ({ ...page })),
    structuredData: draft.structuredData,
    markdown: draft.markdown,
    json: draft.json,
  };
}

function markExpired(record: PublicProfileRecord, now: Date) {
  if ((record.status === "draft" || record.status === "published") && new Date(record.expiresAt).getTime() <= now.getTime()) {
    const expired = { ...record, status: "expired" as const, updatedAt: now.toISOString() };
    publicProfiles.set(record.id, expired);
    return expired;
  }
  return record;
}

function durable() {
  return durableStorageAvailable();
}

async function supabase<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, {
    signal: AbortSignal.timeout(15_000),
    ...options,
    headers: {
      apikey: env.supabaseServiceKey,
      authorization: `Bearer ${env.supabaseServiceKey}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`保存処理を完了できませんでした (${response.status})。`);
  }
  return response.json() as Promise<T>;
}

function scanFromRow(row: any): ScanRecord {
  return { id: row.id, targetUrl: row.target_url, stage: row.stage, progress: Number(row.progress), message: row.message || "", result: row.result || null, error: row.error || null, createdAt: row.created_at, updatedAt: row.updated_at };
}

function watchFromRow(row: any): WatchRecord {
  return {
    id: row.id,
    token: row.token,
    email: row.email,
    scanId: row.scan_id,
    status: row.status,
    paid: Boolean(row.paid),
    stripeCustomerId: row.stripe_customer_id || undefined,
    stripeSubscriptionId: row.stripe_subscription_id || undefined,
    baseline: row.baseline,
    latest: row.latest,
    history: row.history || [],
    evidence: row.evidence || [],
    changePack: row.change_pack || null,
    competitorEvents: row.competitor_events || undefined,
    autoActions: row.auto_actions || undefined,
    autoActionImpacts: row.auto_action_impacts || undefined,
    monthlyReport: row.monthly_report || undefined,
    nextRunAt: row.next_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function publicProfileFromRow(row: any): PublicProfileRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    status: row.status as PublicProfileRecord["status"],
    title: String(row.title || ""),
    brandName: String(row.brand_name || ""),
    targetUrl: String(row.target_url || ""),
    summary: String(row.summary || ""),
    market: String(row.market || ""),
    targetCustomers: Array.isArray(row.target_customers) ? row.target_customers.map(String) : [],
    useCases: Array.isArray(row.use_cases) ? row.use_cases.map(String) : [],
    facts: Array.isArray(row.facts) ? row.facts : [],
    sourcePages: Array.isArray(row.source_pages) ? row.source_pages : [],
    structuredData: String(row.structured_data || ""),
    markdown: String(row.markdown || ""),
    json: String(row.json || ""),
    token: String(row.token || ""),
    sourceScanId: String(row.source_scan_id || "unknown"),
    automation: row.automation || undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    expiresAt: String(row.expires_at),
    ...(row.published_at ? { publishedAt: String(row.published_at) } : {}),
  };
}

function publicProfileRow(record: PublicProfileRecord) {
  return {
    id: record.id,
    slug: record.slug,
    status: record.status,
    title: record.title,
    brand_name: record.brandName,
    target_url: record.targetUrl,
    summary: record.summary,
    market: record.market,
    target_customers: record.targetCustomers,
    use_cases: record.useCases,
    facts: record.facts,
    source_pages: record.sourcePages,
    structured_data: record.structuredData,
    markdown: record.markdown,
    json: record.json,
    token: record.token,
    source_scan_id: record.sourceScanId,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    expires_at: record.expiresAt,
    published_at: record.publishedAt || null,
    automation: record.automation || null,
  };
}

export async function createScan(targetUrl: string) {
  const now = new Date().toISOString();
  const record: ScanRecord = { id: id("scan"), targetUrl, stage: "created", progress: 0, message: "診断を準備しています。", result: null, error: null, createdAt: now, updatedAt: now };
  if (durable()) {
    const rows = await supabase<any[]>("aix_next_scans", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ id: record.id, target_url: targetUrl, stage: record.stage, progress: 0, message: record.message }) });
    return scanFromRow(rows[0]);
  }
  scans.set(record.id, record);
  return record;
}

export async function updateScan(scanId: string, patch: Partial<Pick<ScanRecord, "stage" | "progress" | "message" | "result" | "error">>) {
  const updatedAt = new Date().toISOString();
  if (durable()) {
    const body: Record<string, unknown> = { updated_at: updatedAt };
    if (patch.stage !== undefined) body.stage = patch.stage;
    if (patch.progress !== undefined) body.progress = patch.progress;
    if (patch.message !== undefined) body.message = patch.message;
    if (patch.result !== undefined) body.result = patch.result;
    if (patch.error !== undefined) body.error = patch.error;
    const rows = await supabase<any[]>(`aix_next_scans?id=eq.${encodeURIComponent(scanId)}`, { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify(body) });
    return rows[0] ? scanFromRow(rows[0]) : null;
  }
  const current = scans.get(scanId);
  if (!current) return null;
  const next = { ...current, ...patch, updatedAt };
  scans.set(scanId, next);
  return next;
}

export async function getScan(scanId: string) {
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_scans?id=eq.${encodeURIComponent(scanId)}&limit=1`);
    return rows[0] ? scanFromRow(rows[0]) : null;
  }
  return scans.get(scanId) || null;
}

/**
 * Create a non-public preview. With Supabase configured the record is durable;
 * local development keeps it in the process store. Only an explicit publish
 * call changes its status to indexable. The bearer token is returned to the
 * caller once and is never included in public views.
 */
export async function createPublicProfilePreview(draft: PublicProfileDraft, options: PublicProfileStorageOptions = {}) {
  const now = profileDate(options.now);
  const expiresAt = options.expiresAt
    ? profileDate(options.expiresAt).toISOString()
    : (() => {
        const days = options.expiresInDays ?? PUBLIC_PROFILE_DEFAULT_TTL_DAYS;
        if (!Number.isInteger(days) || days < 1 || days > PUBLIC_PROFILE_MAX_TTL_DAYS) {
          throw new Error(`公開ページの期限は1〜${PUBLIC_PROFILE_MAX_TTL_DAYS}日で指定してください。`);
        }
        return new Date(now.getTime() + days * DAY_MS).toISOString();
      })();
  const record: PublicProfileRecord = {
    ...clonePublicProfileDraft(draft),
    id: id("profile"),
    slug: `${publicProfileSlug(draft.targetUrl)}-${id("page").slice(-12)}`,
    status: "draft",
    token: id("profile_token"),
    sourceScanId: options.sourceScanId || "unknown",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt,
  };
  if (record.sourceScanId === "direct-creation" || options.direct) {
    // Resolve the actual unique public destination before serializing artifacts.
    const targetUrl = `${directProfileOrigin(options.requestUrl, options.requestOrigin)}/ai/company/${encodeURIComponent(record.slug)}`;
    Object.assign(record, toPublicProfile({ ...record, targetUrl,
      facts: record.facts.map((fact) => ({ ...fact, sourceUrl: targetUrl, provenance: "company_asserted" as const })),
      sourcePages: [],
    }));
  }
  if (durable()) {
    try {
      const rows = await supabase<any[]>("aix_next_public_profiles", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify(publicProfileRow(record)) });
      const persisted = rows[0] ? publicProfileFromRow(rows[0]) : null;
      if (!persisted) throw new Error("公開レコードを保存できませんでした。");
      publicProfiles.set(persisted.id, persisted);
      return persisted;
    } catch (error) {
      publicProfiles.delete(record.id);
      throw error;
    }
  }
  publicProfiles.set(record.id, record);
  return record;
}

/** Alias that makes the lifecycle verb explicit at call sites. */
export const previewPublicProfile = createPublicProfilePreview;
export const previewPublicProfileRecord = createPublicProfilePreview;

/**
 * Read an internal profile record by id. Callers serving a response must pass
 * it through `toPublicProfile` so the bearer token and source scan id cannot
 * accidentally cross the API boundary.
 */
export async function getPublicProfile(profileId: string, now?: Date | string) {
  const at = profileDate(now);
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_public_profiles?id=eq.${encodeURIComponent(profileId)}&limit=1`);
    const record = rows[0] ? publicProfileFromRow(rows[0]) : null;
    return record ? markExpired(record, at) : null;
  }
  const record = publicProfiles.get(profileId);
  return record ? markExpired(record, at) : null;
}

export async function getPublicProfileByToken(token: string, now?: Date | string) {
  if (!token) return null;
  const at = profileDate(now);
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_public_profiles?token=eq.${encodeURIComponent(token)}&limit=1`);
    const record = rows[0] ? publicProfileFromRow(rows[0]) : null;
    return record ? markExpired(record, at) : null;
  }
  const record = [...publicProfiles.values()].find((candidate) => candidate.token === token);
  return record ? markExpired(record, at) : null;
}

export async function getPublicProfileBySlug(slug: string, now?: Date | string) {
  if (!slug) return null;
  const at = profileDate(now);
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_public_profiles?slug=eq.${encodeURIComponent(slug)}&limit=1`);
    const record = rows[0] ? publicProfileFromRow(rows[0]) : null;
    return record ? markExpired(record, at) : null;
  }
  const record = [...publicProfiles.values()].find((candidate) => candidate.slug === slug);
  return record ? markExpired(record, at) : null;
}

/** A public route may resolve only an explicitly published, non-expired record. */
export async function getActivePublicProfileBySlug(slug: string, now?: Date | string) {
  const at = profileDate(now);
  const record = await getPublicProfileBySlug(slug, at);
  return record && record.status === "published" && new Date(record.expiresAt).getTime() > at.getTime() ? record : null;
}

export async function listActivePublicProfiles(now?: Date | string) {
  const at = profileDate(now);
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_public_profiles?status=eq.published&expires_at=gt.${encodeURIComponent(at.toISOString())}&order=updated_at.desc`);
    return rows.map(publicProfileFromRow);
  }
  return [...publicProfiles.values()]
    .map((record) => markExpired(record, at))
    .filter((record) => record.status === "published" && new Date(record.expiresAt).getTime() > at.getTime());
}

export const getActivePublicProfiles = listActivePublicProfiles;

export async function getPublishedProfileForScan(scanId: string) {
  const now = new Date().toISOString();
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_public_profiles?source_scan_id=eq.${encodeURIComponent(scanId)}&status=eq.published&expires_at=gt.${encodeURIComponent(now)}&order=published_at.desc&limit=1`);
    return rows[0] ? publicProfileFromRow(rows[0]) : null;
  }
  return [...publicProfiles.values()].filter((record) => record.sourceScanId === scanId && record.status === "published" && record.expiresAt > now).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null;
}

/** Publish requires both the profile id and the unguessable preview token. */
export async function publishPublicProfile(profileId: string, token: string, now?: Date | string) {
  const at = profileDate(now);
  const record = await getPublicProfile(profileId, at);
  if (!record || record.token !== token) return null;
  if (!record || record.status === "revoked" || record.status === "expired") return null;
  if (record.status === "published") return record;
  const publishedAt = record.publishedAt || at.toISOString();
  const published: PublicProfileRecord = {
    ...record,
    status: "published",
    publishedAt,
    updatedAt: at.toISOString(),
  };
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_public_profiles?id=eq.${encodeURIComponent(profileId)}&token=eq.${encodeURIComponent(token)}&status=eq.draft`, { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ status: "published", published_at: publishedAt, updated_at: at.toISOString() }) });
    return rows[0] ? publicProfileFromRow(rows[0]) : null;
  }
  publicProfiles.set(profileId, published);
  return published;
}

/** Revoke is immediate for both the durable and local public route/list. */
export async function revokePublicProfile(profileId: string, token: string, now?: Date | string) {
  const at = profileDate(now);
  const record = await getPublicProfile(profileId, at);
  if (!record || record.token !== token) return null;
  if (!record || record.status === "revoked") return null;
  const revoked: PublicProfileRecord = { ...record, status: "revoked", updatedAt: at.toISOString() };
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_public_profiles?id=eq.${encodeURIComponent(profileId)}&token=eq.${encodeURIComponent(token)}&status=in.(draft,published)`, { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ status: "revoked", updated_at: at.toISOString() }) });
    return rows[0] ? publicProfileFromRow(rows[0]) : null;
  }
  publicProfiles.set(profileId, revoked);
  return revoked;
}

export async function getRecentCompletedScan(targetUrl: string, maxAgeMs = 10 * 60_000) {
  const cutoff = Date.now() - maxAgeMs;
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_scans?target_url=eq.${encodeURIComponent(targetUrl)}&stage=in.(complete,partial)&order=updated_at.desc&limit=1`);
    if (!rows[0]) return null;
    const scan = scanFromRow(rows[0]);
    return scan.result && new Date(scan.updatedAt).getTime() >= cutoff ? scan : null;
  }
  return [...scans.values()]
    .filter((scan) => scan.targetUrl === targetUrl && scan.result && ["complete", "partial"].includes(scan.stage) && new Date(scan.updatedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] || null;
}

async function existingWatch(scanId: string, email: string) {
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_watches?scan_id=eq.${encodeURIComponent(scanId)}&email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=1`);
    return rows[0] ? watchFromRow(rows[0]) : null;
  }
  return [...watches.values()].find((watch) => watch.scanId === scanId && watch.email === email) || null;
}

export async function findWatchesByEmail(email: string): Promise<WatchRecord[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_watches?email=eq.${encodeURIComponent(normalized)}&order=created_at.desc`);
    return (rows || []).map(watchFromRow);
  }
  return [...watches.values()]
    .filter((watch) => watch.email.toLowerCase() === normalized)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createWatch(scan: ScanRecord, email: string) {
  if (!scan.result) throw new Error("診断結果が完成していません。");
  const normalizedEmail = email.toLowerCase();
  const existing = await existingWatch(scan.id, normalizedEmail);
  if (existing) return existing;

  const now = new Date();
  const record: WatchRecord = {
    id: id("watch"),
    token: id("token"),
    email: normalizedEmail,
    scanId: scan.id,
    status: "trial",
    paid: false,
    baseline: scan.result,
    latest: scan.result,
    history: [scan.result],
    evidence: [],
    changePack: null,
    nextRunAt: new Date(now.getTime() + 7 * 86_400_000).toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  if (durable()) {
    try {
      const rows = await supabase<any[]>("aix_next_watches", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ id: record.id, token: record.token, email: record.email, scan_id: record.scanId, status: record.status, paid: false, baseline: record.baseline, latest: record.latest, history: record.history, evidence: [], change_pack: null, next_run_at: record.nextRunAt }) });
      return watchFromRow(rows[0]);
    } catch (error) {
      const concurrent = await existingWatch(scan.id, normalizedEmail);
      if (concurrent) return concurrent;
      throw error;
    }
  }
  watches.set(record.token, record);
  return record;
}

export async function getWatch(token: string) {
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_watches?token=eq.${encodeURIComponent(token)}&limit=1`);
    return rows[0] ? watchFromRow(rows[0]) : null;
  }
  return watches.get(token) || null;
}

/**
 * Remove local fallback records used when Supabase is not configured.
 * Production deletion is handled by the privacy service with its audit row;
 * keeping this operation here prevents that service from reaching into the
 * storage maps directly.
 */
export function deleteMemoryWatchData(token: string, scanId: string) {
  const current = watches.get(token);
  if (!current || current.scanId !== scanId) return false;
  const runs = (globalThis as { aixNextWatchRuns?: Map<string, { watchId: string }> }).aixNextWatchRuns;
  for (const [runId, run] of runs || []) {
    if (run.watchId === current.id) runs!.delete(runId);
  }
  const removed = watches.delete(token);
  if (!removed) return false;
  const scanStillReferenced = [...watches.values()].some((watch) => watch.scanId === scanId);
  // A shared source scan is not proof that the Watch owns a public profile.
  const profileStillReferencesScan = [...publicProfiles.values()].some(profile => profile.sourceScanId === scanId);
  if (!scanStillReferenced && !profileStillReferencesScan) scans.delete(scanId);
  return true;
}

export async function updateWatch(token: string, patch: Partial<Pick<WatchRecord, "status" | "paid" | "email" | "stripeCustomerId" | "stripeSubscriptionId" | "baseline" | "latest" | "history" | "evidence" | "changePack" | "competitorEvents" | "autoActions" | "autoActionImpacts" | "monthlyReport" | "nextRunAt">>) {
  const updatedAt = new Date().toISOString();
  if (durable()) {
    const body: Record<string, unknown> = { updated_at: updatedAt };
    if (patch.status !== undefined) body.status = patch.status;
    if (patch.paid !== undefined) body.paid = patch.paid;
    if (patch.email !== undefined) body.email = patch.email;
    if (patch.stripeCustomerId !== undefined) body.stripe_customer_id = patch.stripeCustomerId || null;
    if (patch.stripeSubscriptionId !== undefined) body.stripe_subscription_id = patch.stripeSubscriptionId || null;
    if (patch.baseline !== undefined) body.baseline = patch.baseline;
    if (patch.latest !== undefined) body.latest = patch.latest;
    if (patch.history !== undefined) body.history = patch.history;
    if (patch.evidence !== undefined) body.evidence = patch.evidence;
    if (patch.changePack !== undefined) body.change_pack = patch.changePack;
    if (patch.competitorEvents !== undefined) body.competitor_events = patch.competitorEvents;
    if (patch.autoActions !== undefined) body.auto_actions = patch.autoActions;
    if (patch.autoActionImpacts !== undefined) body.auto_action_impacts = patch.autoActionImpacts;
    if (patch.monthlyReport !== undefined) body.monthly_report = patch.monthlyReport;
    if (patch.nextRunAt !== undefined) body.next_run_at = patch.nextRunAt;
    const rows = await supabase<any[]>(`aix_next_watches?token=eq.${encodeURIComponent(token)}`, { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify(body) });
    return rows[0] ? watchFromRow(rows[0]) : null;
  }
  const current = watches.get(token);
  if (!current) return null;
  const next = { ...current, ...patch, updatedAt };
  watches.set(token, next);
  return next;
}

/** Compare-and-swap prevents a running job from undoing a stop or rollback. */
async function saveProfileAutomation(existing: PublicProfileRecord, candidate: PublicProfileRecord) {
  const updatedAt = new Date(Math.max(Date.now(), Date.parse(existing.updatedAt) + 1)).toISOString();
  const safe = toPublicProfile({ ...candidate, updatedAt });
  const updated = { ...candidate, ...safe, updatedAt };
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_public_profiles?id=eq.${encodeURIComponent(existing.id)}&status=eq.${existing.status}&updated_at=eq.${encodeURIComponent(existing.updatedAt)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`, {
      method: "PATCH", headers: { prefer: "return=representation" },
      // Never send status/token: expiry renewal cannot republish a stopped page.
      body: JSON.stringify({ facts: updated.facts, structured_data: updated.structuredData, markdown: updated.markdown, json: updated.json, automation: updated.automation, ...(candidate.expiresAt !== existing.expiresAt ? { expires_at: updated.expiresAt } : {}), updated_at: updatedAt }),
    });
    return rows[0] ? publicProfileFromRow(rows[0]) : null;
  }
  const current = publicProfiles.get(existing.id);
  if (!current || current.status !== existing.status || !["draft", "published"].includes(current.status) || current.updatedAt !== existing.updatedAt || Date.parse(current.expiresAt) <= Date.now()) return null;
  publicProfiles.set(existing.id, updated);
  return updated;
}

/** A public scan id is never an ownership credential. */
export async function getManagedPublicProfiles(capability: { profileId?: string; token?: string; watchToken?: string }) {
  if (capability.token) {
    const record = capability.profileId ? await getPublicProfile(capability.profileId) : await getPublicProfileByToken(capability.token);
    return record?.token === capability.token ? [record] : [];
  }
  if (!capability.watchToken) return [];
  const watch = await getWatch(capability.watchToken);
  if (!watch) return [];
  const records = durable()
    ? (await supabase<any[]>(`aix_next_public_profiles?automation->>watchId=eq.${encodeURIComponent(watch.id)}`)).map(publicProfileFromRow)
    : [...publicProfiles.values()].filter((record) => record.automation?.watchId === watch.id);
  return records.filter((record) => (!capability.profileId || record.id === capability.profileId) && record.automation?.watchId === watch.id)
    .map((record) => markExpired(record, new Date()));
}

/** Bind requires both existing bearer capabilities and explicit owner action. */
export async function bindPublicProfileWatch(profileId: string, token: string, watchToken: string) {
  const record = await getPublicProfile(profileId);
  const watch = watchToken ? await getWatch(watchToken) : null;
  if (!record || record.token !== token || !["draft", "published"].includes(record.status) || !watch) return null;
  if (record.automation?.watchId && record.automation.watchId !== watch.id) return null;
  if (record.targetUrl !== watch.latest.targetUrl || (record.sourceScanId !== "direct-creation" && record.sourceScanId !== watch.scanId)) return null;
  return saveProfileAutomation(record, { ...record, automation: { enabled: false, grantedAt: new Date().toISOString(), ...record.automation, watchId: watch.id, measurementScanId: watch.scanId } });
}

/** Eight-day rolling lease, renewed by weekly execution, even when no facts change.
 * Billing keeps period-end cancellations active until the paid period ends.
 * No active contract, no fresh lease; revoked/expired records never revive.
 */
export async function renewBoundPublicProfiles(watchToken: string) {
  if (!watchToken) return [];
  if (durable()) {
    // The RPC locks the Watch through the expiry write; no read/PATCH fallback.
    const rows = await supabase<any[]>("rpc/aix_next_renew_public_profiles", { method: "POST", body: JSON.stringify({ p_watch_token: watchToken }) });
    return rows.map(publicProfileFromRow);
  }
  // No await between entitlement validation and in-memory writes.
  const watch = watches.get(watchToken);
  if (!watch || !watch.paid || watch.status !== "active" || !watch.stripeSubscriptionId) return [];
  const records = [...publicProfiles.values()].filter((record) => record.automation?.watchId === watch.id);
  const renewed: PublicProfileRecord[] = [];
  const now = new Date();
  for (const record of records) {
    if (record.status !== "published" || Date.parse(record.expiresAt) <= now.getTime() || !(record.automation?.maintenanceEnabled ?? record.automation?.enabled) || record.targetUrl !== watch.latest.targetUrl || (record.sourceScanId !== watch.scanId && record.sourceScanId !== "direct-creation")) continue;
    const freeExpiresAt = record.automation.freeExpiresAt || record.expiresAt;
    const renewalExpiresAt = new Date(now.getTime() + 8 * DAY_MS).toISOString();
    const expiresAt = [record.expiresAt, freeExpiresAt, renewalExpiresAt].sort().at(-1)!;
    if (record.automation.renewedAt && Date.parse(record.automation.renewedAt) > now.getTime() - DAY_MS) continue;
    const updated = { ...record, expiresAt, updatedAt: new Date(Math.max(now.getTime(), Date.parse(record.updatedAt) + 1)).toISOString(),
      automation: { ...record.automation, freeExpiresAt, renewalExpiresAt, renewedAt: now.toISOString() },
    };
    publicProfiles.set(record.id, updated);
    renewed.push(updated);
  }
  return renewed;
}

export async function manageProfileAutomation(profileId: string, token: string, action: "enable" | "disable" | "rollback" | "maintain" | "stop_maintenance", watchToken = "") {
  const record = await getPublicProfile(profileId);
  if (!record || record.token !== token || record.status !== "published") return null;
  if (action === "enable" || action === "maintain") {
    const watch = await getWatch(watchToken);
    if (!watch || !watch.paid || watch.status !== "active" || (watch.scanId !== record.sourceScanId && record.sourceScanId !== "direct-creation") || watch.latest.targetUrl !== record.targetUrl) return null;
    if (record.automation?.watchId && record.automation.watchId !== watch.id) return null;
    const saved = await saveProfileAutomation(record, { ...record, automation: { ...record.automation, enabled: action === "enable" ? true : record.automation?.enabled || false, maintenanceEnabled: true, watchId: watch.id, measurementScanId: watch.scanId, freeExpiresAt: record.automation?.freeExpiresAt || record.expiresAt, grantedAt: new Date().toISOString() } });
    if (!saved) return null;
    // A consent granted on day 29 must bridge the next weekly execution.
    await renewBoundPublicProfiles(watchToken);
    return getPublicProfile(profileId);
  }
  if (!record.automation) return record;
  if (action === "rollback" && !record.automation.previousFacts) return null;
  return saveProfileAutomation(record, {
    ...record,
    ...(action === "stop_maintenance" ? { expiresAt: record.automation.freeExpiresAt || record.expiresAt } : {}),
    ...(action === "rollback" ? { facts: record.automation.previousFacts! } : {}),
    automation: { ...record.automation, enabled: action === "stop_maintenance" ? record.automation.enabled : false, maintenanceEnabled: action === "stop_maintenance" ? false : record.automation.maintenanceEnabled ?? record.automation.enabled, ...(action === "rollback" ? { previousFacts: undefined, managedFacts: record.automation.previousManagedFacts || [], previousManagedFacts: undefined, lastRunId: undefined, changedFactCount: 0 } : {}) },
  });
}

/** Refresh only explicitly linked profiles; never guess ownership from a URL. */
export async function refreshPublicProfileFromScan(watchToken: string, scan: ScanResult, pages: CrawledPage[]) {
  await renewBoundPublicProfiles(watchToken);
  const watch = await getWatch(watchToken);
  if (!watch || !watch.paid || watch.status !== "active" || watch.latest.targetUrl !== scan.targetUrl) return [];
  let records: PublicProfileRecord[];
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_public_profiles?status=eq.published&automation->>watchId=eq.${encodeURIComponent(watch.id)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`);
    records = rows.map(publicProfileFromRow);
  } else {
    records = [...publicProfiles.values()];
  }
  const applied: PublicProfileRecord[] = [];
  for (const record of records) {
    if (record.status !== "published" || Date.parse(record.expiresAt) <= Date.now() || !record.automation?.enabled || record.automation.watchId !== watch.id || (record.sourceScanId !== watch.scanId && record.sourceScanId !== "direct-creation") || record.targetUrl !== scan.targetUrl) continue;
    if (record.automation.lastRunId === scan.scanId) { applied.push(record); continue; }
    const managedFacts = buildAutomatedFacts(record, pages, scan);
    if (!managedFacts) continue;
    const facts = mergeAutomatedFacts(record, managedFacts);
    const count = changedFacts(record.facts, facts);
    if (!count) continue;
    const updated = await saveProfileAutomation(record, {
      ...record, facts,
      automation: { ...record.automation, lastRunId: scan.scanId, lastUpdatedAt: new Date().toISOString(), previousFacts: record.facts, previousManagedFacts: record.automation.managedFacts || [], managedFacts, changedFactCount: count },
    });
    if (updated) applied.push(updated);
  }
  return applied;
}

export async function addEvidence(token: string, answer: Omit<EvidenceAnswer, "status" | "updatedAt">) {
  const watch = await getWatch(token);
  if (!watch) return null;
  const evidence = [...watch.evidence.filter((item) => item.gapId !== answer.gapId), { ...answer, status: "company_asserted" as const, updatedAt: new Date().toISOString() }];
  return updateWatch(token, { evidence });
}

export async function listDueWatches(limit = 10) {
  const now = new Date().toISOString();
  if (durable()) {
    const rows = await supabase<any[]>(`aix_next_watches?status=in.(trial,active)&next_run_at=lte.${encodeURIComponent(now)}&order=next_run_at.asc&limit=${Math.min(50, Math.max(1, limit))}`);
    return rows.map(watchFromRow);
  }
  return [...watches.values()].filter((watch) => ["trial", "active"].includes(watch.status) && watch.nextRunAt <= now).slice(0, limit);
}

export async function claimDueWatches(limit = 5, leaseSeconds = 900) {
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const safeLease = Math.max(60, Math.floor(leaseSeconds));
  if (durable()) {
    const rows = await supabase<any[]>("rpc/aix_next_claim_due_watches", {
      method: "POST",
      body: JSON.stringify({ p_limit: safeLimit, p_lease_seconds: safeLease }),
    });
    return rows.map(watchFromRow);
  }
  const now = Date.now();
  const claimedAt = new Date().toISOString();
  const leaseUntil = new Date(now + safeLease * 1000).toISOString();
  const due = [...watches.values()]
    .filter((watch) => ["trial", "active"].includes(watch.status) && new Date(watch.nextRunAt).getTime() <= now)
    .sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime())
    .slice(0, safeLimit);
  return due.map((watch) => {
    const claimed = { ...watch, nextRunAt: leaseUntil, updatedAt: claimedAt };
    watches.set(watch.token, claimed);
    return claimed;
  });
}
