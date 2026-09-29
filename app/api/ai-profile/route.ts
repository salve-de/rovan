import { buildDirectPublicProfileDraft, toPublicProfile } from "@/lib/public-profile";
import {
  createPublicProfilePreview,
  getActivePublicProfileBySlug,
  getPublicProfile,
  listActivePublicProfiles,
  publishPublicProfile,
  revokePublicProfile,
  manageProfileAutomation,
  getManagedPublicProfiles,
  bindPublicProfileWatch,
} from "@/lib/storage";
import { getScan } from "@/lib/storage";
import { consumeProfileCreation } from "@/lib/rate-limit";
import { profileManagementHref } from "@/lib/profile-management-link";
import { buildSelectedPublicProfileDraft } from "@/lib/profile-selection";
import { crawlCompanySite, emptyCrawl } from "@/lib/crawler";
import { directProfileOrigin } from "@/lib/profile-origin";
import { demoMode } from "@/lib/demo-mode";
import { demoContext } from "@/lib/demo/engine";
import { isNoSiteTarget } from "@/lib/no-site";
import type { ScanResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseHeaders = {
  "cache-control": "private, no-store",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: responseHeaders });
}

function stringField(body: Record<string, unknown>, name: string) {
  const value = body[name];
  return typeof value === "string" ? value.trim() : "";
}

function objectBody(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** ホームページがない（読めない）デモの診断から、読み取った名前・業種・地域と選んだ強みで下書きをつくる */
function demoDirectDraft(result: ScanResult, strategyId: string) {
  const { discovery } = result;
  const { industry, region } = demoContext(discovery);
  const strategies = result.positioning?.strategies || [];
  const strategy = strategies.find((item) => item.id === strategyId) || strategies[0];
  // 選んだ強みが「お客さんの層」か「頼みたいこと」なら、紹介文にひとこと足す（質問から作った強みは足さない）
  const extra = strategy?.id === "audience" && discovery.targetCustomers[0] ? `${discovery.targetCustomers[0]}からのご相談にも対応しています。`
    : strategy?.id === "use-case" && discovery.useCases[0] ? `${discovery.useCases[0]}のご相談にも対応しています。` : "";
  const intro = `${discovery.brandName}は、${region ? `${region}の` : ""}${industry.noun}です。`;
  return buildDirectPublicProfileDraft({
    brandName: discovery.brandName,
    market: industry.noun,
    location: region,
    summary: `${intro}${extra}`,
    targetCustomers: discovery.targetCustomers,
    useCases: discovery.useCases,
  });
}

function safeError(error: unknown) {
  if (!(error instanceof Error)) return "公開ページをつくれませんでした。もう一度お試しください。";
  if (error.message === "診断がまだ終わっていません。" || error.message === "公開用のURLを確認できませんでした。") return error.message;
  if (error.message.startsWith("公開ページの期限は")) return error.message;
  return "公開ページをつくれませんでした。もう一度お試しください。";
}

export async function POST(request: Request) {
  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await request.json());
  } catch {
    return json({ error: "うまく受け取れませんでした。ページを再読み込みしてください。" }, 400);
  }
  if (!body) return json({ error: "うまく受け取れませんでした。ページを再読み込みしてください。" }, 400);

  const action = stringField(body, "action");
  try {
    if (["preview", "deploy", "create_direct"].includes(action)) {
      const limit = await consumeProfileCreation(request);
      if (!limit.allowed) return Response.json({ error: "つくれる回数の上限に達しました。時間をおいてお試しください。" }, { status: 429, headers: { ...responseHeaders, "retry-after": String(limit.retryAfter) } });
    }
    if (action === "preview" || action === "deploy") {
      const scanId = stringField(body, "scanId");
      if (!scanId) return json({ error: "診断結果から開いてください。" }, 400);
      const scan = await getScan(scanId);
      if (!scan) return json({ error: "診断結果が見つかりません。" }, 404);
      if (!scan.result) return json({ error: "診断がまだ終わっていません。" }, 409);

      const expiresInDays = body.expiresInDays;
      if (expiresInDays !== undefined && typeof expiresInDays !== "number") return json({ error: "うまく受け取れませんでした。ページを再読み込みしてください。" }, 400);
      const strategyId = stringField(body, "strategyId");
      const noSite = isNoSiteTarget(scan.targetUrl);
      const demo = demoMode();
      const crawl = noSite ? emptyCrawl() : demo
        ? await crawlCompanySite(scan.targetUrl, 12).catch(() => emptyCrawl())
        : await crawlCompanySite(scan.targetUrl, 12);
      const target = new URL(scan.targetUrl);
      const sourceSlug = target.pathname.match(/^\/ai\/company\/([^/]+)\/?$/u)?.[1];
      const sourceRecord = sourceSlug && target.origin === directProfileOrigin(request.url, request.headers.get("origin") || undefined)
        ? await getActivePublicProfileBySlug(decodeURIComponent(sourceSlug)) : null;
      const selected = buildSelectedPublicProfileDraft(scan.result, crawl.pages, strategyId, { sourceProfile: sourceRecord ? toPublicProfile(sourceRecord) : undefined });
      // デモでホームページがない・読めない場合は、Rovan上のページを参照先にした下書きにする
      const directDraft = selected.selection.status === "empty" && (noSite || demo);
      if (selected.selection.status === "empty" && !directDraft) return json({ error: "この強みに合う情報が、ホームページで見つかりませんでした。別の強みを選んでください。", selection: selected.selection }, 409);
      const record = await createPublicProfilePreview(directDraft ? demoDirectDraft(scan.result, strategyId) : selected.draft, {
        sourceScanId: scan.id,
        // Public callers cannot extend the free lifetime.
        expiresInDays: 30,
        ...(directDraft ? { direct: true, requestUrl: request.url, requestOrigin: request.headers.get("origin") || undefined } : {}),
      });

      return json({
        profile: toPublicProfile(record),
        token: record.token,
        slug: record.slug,
        url: `/ai/company/${encodeURIComponent(record.slug)}`,
        status: "draft",
        managementUrl: profileManagementHref({ profileId: record.id, token: record.token }),
        selection: selected.selection,
      }, 201);
    }

    if (action === "create_direct") {
      const brandName = stringField(body, "brandName");
      if (!brandName) return json({ error: "社名・店名を入れてください。" }, 400);
      if (brandName.length > 200 || ["market", "summary", "location", "hours", "pricingInfo"].some((key) => stringField(body, key).length > 3000)) return json({ error: "長すぎます。名前は200文字、そのほかは3000文字までにしてください。" }, 400);

      const market = stringField(body, "market");
      const summary = stringField(body, "summary");
      const location = stringField(body, "location");
      const hours = stringField(body, "hours");
      const pricingInfo = stringField(body, "pricingInfo");

      const draft = buildDirectPublicProfileDraft({
        brandName,
        referenceUrl: stringField(body, "referenceUrl"),
        market,
        summary,
        location,
        hours,
        pricingInfo,
      });

      const record = await createPublicProfilePreview(draft, {
        sourceScanId: "direct-creation",
        requestUrl: request.url,
        requestOrigin: request.headers.get("origin") || undefined,
        expiresInDays: 30,
      });

      return json({
        profile: toPublicProfile(record),
        token: record.token,
        slug: record.slug,
        url: `/ai/company/${encodeURIComponent(record.slug)}`,
        status: "draft",
        managementUrl: profileManagementHref({ profileId: record.id, token: record.token }),
      }, 201);
    }

    if (action === "manage") {
      const records = await getManagedPublicProfiles({ profileId: stringField(body, "profileId"), token: stringField(body, "token"), watchToken: stringField(body, "watchToken") });
      if (!records.length) return json({ error: "管理用リンクが正しくないか、この見守りにつながった公開ページがありません。" }, 404);
      return json({ profiles: records.map((record) => {
        const scanId = record.automation?.measurementScanId || (record.sourceScanId === "direct-creation" ? "" : record.sourceScanId);
        return { profile: toPublicProfile(record), automation: automationView(record), direct: record.sourceScanId === "direct-creation", resultUrl: scanId ? `/result?id=${encodeURIComponent(scanId)}` : null };
      }) });
    }

    if (action === "bind_watch") {
      const record = await bindPublicProfileWatch(stringField(body, "profileId"), stringField(body, "token"), stringField(body, "watchToken"));
      if (!record) return json({ error: "管理用リンクを確認できませんでした。" }, 403);
      return json({ profile: toPublicProfile(record), automation: automationView(record) });
    }

    if (action === "publish" || action === "revoke") {
      const profileId = stringField(body, "profileId");
      const owned = (await getManagedPublicProfiles({ profileId, token: stringField(body, "token"), watchToken: stringField(body, "watchToken") }))[0];
      const token = owned?.token || "";
      if (!profileId || !token) return json({ error: "管理用リンクから開いてください。" }, 400);
      const record = action === "publish"
        ? await publishPublicProfile(profileId, token)
        : await revokePublicProfile(profileId, token);
      if (!record) return json({ error: "公開ページが見つからないか、いまは操作できません。" }, 404);
      return json({ profile: toPublicProfile(record) });
    }

    if (["automation_enable", "automation_disable", "automation_rollback", "maintenance_enable", "maintenance_disable"].includes(action)) {
      const profileId = stringField(body, "profileId");
      const owned = (await getManagedPublicProfiles({ profileId, token: stringField(body, "token"), watchToken: stringField(body, "watchToken") }))[0];
      const token = owned?.token || "";
      if (!profileId || !token) return json({ error: "管理用リンクから開いてください。" }, 400);
      const operation = action === "maintenance_enable" ? "maintain" : action === "maintenance_disable" ? "stop_maintenance" : action === "automation_enable" ? "enable" : action === "automation_disable" ? "disable" : "rollback";
      const record = await manageProfileAutomation(profileId, token, operation, stringField(body, "watchToken"));
      if (!record) return json({ error: "いまは操作できません。ページを再読み込みしてください。" }, 409);
      return json({ profile: toPublicProfile(record), automation: automationView(record) });
    }

    return json({ error: "うまく受け取れませんでした。ページを再読み込みしてください。" }, 400);
  } catch (error) {
    console.error("AI PROFILE operation failed");
    return json({ error: safeError(error) }, 400);
  }
}

function automationView(record: Awaited<ReturnType<typeof getPublicProfile>>) {
  const previous = record?.automation?.previousFacts;
  return {
    enabled: record?.status === "published" && record?.automation?.enabled === true,
    maintenanceEnabled: record?.status === "published" && (record?.automation?.maintenanceEnabled ?? record?.automation?.enabled) === true,
    lastUpdatedAt: record?.automation?.lastUpdatedAt || null,
    canRollback: record?.status === "published" && Boolean(previous),
    changedFactCount: record?.automation?.changedFactCount || 0,
    previousFacts: record && previous ? toPublicProfile({ ...record, facts: previous }).facts : [],
    currentFacts: record ? toPublicProfile(record).facts : [],
  };
}

/**
 * Public reads use `slug`; management reads require both profileId and token.
 * `active=1` is used by the public sitemap and returns safe views only.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const profileId = params.get("profileId")?.trim() || "";
  const token = params.get("token")?.trim() || "";
  if (profileId) {
    if (!token) return json({ error: "管理用リンクから開いてください。" }, 401);
    const record = await getPublicProfile(profileId);
    if (!record || record.token !== token) return json({ error: "公開ページが見つかりません。" }, 404);
    return json({ profile: toPublicProfile(record), automation: automationView(record) });
  }

  const slug = params.get("slug")?.trim() || "";
  if (slug) {
    const record = await getActivePublicProfileBySlug(slug);
    if (!record) return json({ error: "公開ページが見つかりません。" }, 404);
    return json({ profile: toPublicProfile(record) });
  }

  if (params.get("active") === "1") return json({ profiles: (await listActivePublicProfiles()).map(toPublicProfile) });
  return json({ error: "公開ページを指定してください。" }, 400);
}
