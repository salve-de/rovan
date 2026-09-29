import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { profileManagementHref } from "../lib/profile-management-link";
import { buildSelectedPublicProfileDraft } from "../lib/profile-selection";
import { sampleResult } from "../lib/sample-data";
import type { StrategyOption } from "../lib/types";

function isolated(code: string, durable = false) {
  const child = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "-e", `
    import assert from 'node:assert/strict';
    const load = async path => { const m = await import(path); return m.default || m; };
    globalThis.fetch = async () => { throw new Error('Unexpected external network'); };
    ${code}
  `], { encoding: "utf8", timeout: 20_000, env: { ...process.env, NODE_ENV: "test", SUPABASE_URL: durable ? "https://isolated-storage.invalid" : "", SUPABASE_SERVICE_ROLE_KEY: durable ? "test-only" : "" } });
  assert.equal(child.status, 0, child.stderr || child.stdout || String(child.error));
}

test("weekly execution renews the entitlement lease before a failing content crawl", async () => {
  const calls: string[] = [];
  const output = ts.transpileModule(readFileSync("lib/watch-measurement.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} as { processWatchMeasurement: (watch: unknown) => Promise<unknown> } };
  vm.runInNewContext(output, {
    exports: loaded.exports, module: loaded, process: { env: { NODE_ENV: "test" } },
    require: (name: string) => {
      if (name === "server-only") return {};
      if (name === "@/lib/env") return { env: {} };
      if (name === "@/lib/demo-mode") return { demoMode: () => false };
      if (name === "@/lib/storage") return { renewBoundPublicProfiles: async (token: string) => { calls.push(`renew:${token}`); } };
      if (name === "@/lib/watch-runs") return { getActiveWatchRun: async () => ({ nextPromptIndex: 1, prompts: [{}] }) };
      if (name === "@/lib/crawler") return { crawlCompanySite: async () => { calls.push("crawl"); throw new Error("source unavailable"); } };
      if (["@/lib/change-pack", "@/lib/discovery", "@/lib/providers", "@/lib/scan-result", "@/lib/watch-email", "@/lib/prompt-panels", "@/lib/autonomous-watch", "@/lib/indexnow"].includes(name)) return {};
      if (name === "@/lib/prompt-evidence") return { matchingConsultations: () => [] };
      if (name === "@/lib/site") return { siteUrl: "https://rovan.example" };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  await assert.rejects(loaded.exports.processWatchMeasurement({ id: "watch", token: "test-token", latest: {} }), /source unavailable/);
  assert.deepEqual(calls, ["renew:test-token", "crawl"]);
});

test("saved owner and Watch links carry only private management routes, including combined explicit binding", () => {
  for (const auth of [{ profileId: "profile one", token: "owner&secret" }, { watchToken: "watch&secret" }, { profileId: "p", token: "owner", watchToken: "watch" }]) {
    const url = new URL(profileManagementHref(auth), "https://rovan.test");
    assert.equal(url.pathname, "/profile/manage");
    for (const [key, value] of Object.entries(auth)) assert.equal(url.searchParams.get(key), value);
    assert.equal(url.pathname.startsWith("/ai/company/"), false);
  }
});

test("strategy selection chooses actual source excerpts and never promotes generated claims", () => {
  const strategy = (id: string, name: string) => ({ id, name, targetMarket: name, coreThesis: "全国最安の架空実績", deliverables: { profile: { text: "絶対に推薦されます" } } }) as StrategyOption;
  const result = { ...sampleResult, positioning: { ...sampleResult.positioning!, strategies: [strategy("a", "相続"), strategy("b", "不動産"), strategy("c", "航空整備")] } };
  const page = { url: result.targetUrl, title: "会社案内", description: "", headings: [], text: "相続の相談は東京都で受け付けています。不動産の手続きは埼玉県で受け付けています。" };
  const a = buildSelectedPublicProfileDraft(result, [page], "a");
  const b = buildSelectedPublicProfileDraft(result, [page], "b");
  assert.match(a.draft.markdown, /相続の相談/);
  assert.doesNotMatch(a.draft.markdown, /不動産の手続き/);
  assert.match(b.draft.json, /不動産の手続き/);
  assert.doesNotMatch(b.draft.json, /相続の相談|全国最安|絶対に推薦/);
  assert.equal(buildSelectedPublicProfileDraft(result, [page], "c").selection.supportedFactCount, 0);
  assert.equal(buildSelectedPublicProfileDraft(result, [{ ...page, noindex: true }], "a").draft.facts.length, 0);
  assert.equal(buildSelectedPublicProfileDraft(result, [{ ...page, url: "https://unrelated.invalid/" }], "a").draft.facts.length, 0);
  assert.throws(() => buildSelectedPublicProfileDraft(result, [page], "forged-id"));
});

test("paid maintenance survives 30 days, independent of facts; revocation, expiry and absent contract never revive", () => isolated(`
  const RealDate = Date; let clock = Date.parse('2026-01-01T00:00:00Z');
  globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } };
  const store = await load('./lib/storage.ts');
  const { sampleResult } = await load('./lib/sample-data.ts');
  const { buildPublicProfileDraft } = await load('./lib/public-profile.ts');
  const source = { id:'scan-renewal', targetUrl:sampleResult.targetUrl, result:sampleResult };
  const watch = await store.createWatch(source, '');
  await store.updateWatch(watch.token, { paid:true, status:'active', stripeSubscriptionId:'sub_test' });
  const create = async () => {
    const p = await store.createPublicProfilePreview(buildPublicProfileDraft(sampleResult), {sourceScanId:source.id});
    await store.publishPublicProfile(p.id,p.token); return p;
  };
  const paid = await create(); const free = await create(); const revoked = await create(); const expired = await create();
  assert.deepEqual(await store.getManagedPublicProfiles({watchToken:watch.token}), [], 'scan ID is not an ownership grant');
  assert.equal(await store.bindPublicProfileWatch(paid.id,'wrong',watch.token), null);
  assert.equal(await store.bindPublicProfileWatch(paid.id,paid.token,'wrong'), null);
  assert.ok(await store.manageProfileAutomation(paid.id,paid.token,'maintain',watch.token));
  assert.equal((await store.getPublicProfile(paid.id)).automation.enabled,false,'maintenance-only consent does not enable content edits');
  await store.manageProfileAutomation(revoked.id,revoked.token,'enable',watch.token);
  await store.revokePublicProfile(revoked.id,revoked.token);
  for (const day of [7,14,21,28,35]) {
    clock = RealDate.parse('2026-01-01T00:00:00Z') + day*86400000;
    await store.renewBoundPublicProfiles(watch.token);
  }
  assert.equal((await store.getActivePublicProfileBySlug(paid.slug)).status,'published');
  assert.equal((await store.getPublicProfile(free.id)).status,'expired');
  assert.equal((await store.getPublicProfile(revoked.id)).status,'revoked');
  assert.equal(await store.manageProfileAutomation(expired.id,expired.token,'maintain',watch.token),null,'expired publication never resurrects');
  assert.equal(await store.publishPublicProfile(revoked.id,revoked.token),null);
  assert.equal(await store.publishPublicProfile(expired.id,expired.token),null);
  const before = (await store.getPublicProfile(paid.id)).expiresAt;
  await store.manageProfileAutomation(paid.id,paid.token,'enable',watch.token);
  await store.manageProfileAutomation(paid.id,paid.token,'disable');
  assert.equal((await store.getPublicProfile(paid.id)).automation.maintenanceEnabled,true,'content stop preserves separate maintenance consent');
  clock += 86400000;
  await store.renewBoundPublicProfiles(watch.token);
  assert.ok((await store.getPublicProfile(paid.id)).expiresAt > before);
  const lease = (await store.getPublicProfile(paid.id)).expiresAt;
  await store.updateWatch(watch.token,{status:'cancelled',paid:false});
  clock += 86400000;
  assert.deepEqual(await store.renewBoundPublicProfiles(watch.token),[]);
  assert.equal((await store.getPublicProfile(paid.id)).expiresAt,lease);
  clock = RealDate.parse(lease)+1;
  assert.equal(await store.getActivePublicProfileBySlug(paid.slug),null,'cancelled contract has no indefinite benefit');
  await store.updateWatch(watch.token,{status:'active',paid:true});
  assert.deepEqual(await store.renewBoundPublicProfiles(watch.token),[],'renewed payment cannot revive expired publication');
  const missing = await create();
  await store.manageProfileAutomation(missing.id,missing.token,'maintain',watch.token);
  await store.updateWatch(watch.token,{stripeSubscriptionId:undefined});
  assert.deepEqual(await store.renewBoundPublicProfiles(watch.token),[],'paid boolean without a subscription is not a contract');
  await store.updateWatch(watch.token,{stripeSubscriptionId:'sub_restored'});
  const late=await create();
  clock+=29*86400000;
  await store.manageProfileAutomation(late.id,late.token,'maintain',watch.token);
  assert.ok(Date.parse((await store.getPublicProfile(late.id)).expiresAt)>=clock+8*86400000,'late opt-in bridges the next weekly run');
  await store.manageProfileAutomation(late.id,late.token,'stop_maintenance');
  assert.equal((await store.getPublicProfile(late.id)).expiresAt,late.expiresAt,'maintenance withdrawal restores free expiry');
`));

test("direct creation preserves owner recovery, authenticates Watch binding and measures only through a separate real scan", () => isolated(`
  const store = await load('./lib/storage.ts');
  const api = await load('./app/api/ai-profile/route.ts');
  const { sampleResult } = await load('./lib/sample-data.ts');
  const { buildAutomatedFacts } = await load('./lib/profile-automation.ts');
  const post = body => api.POST(new Request('https://rovan.test/api/ai-profile',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
  const beforeScans = globalThis.aixNextScans.size;
  const response = await post({action:'create_direct',brandName:'SNS登録の試験',referenceUrl:'https://instagram.com/example/?token=do-not-publish'});
  assert.equal(response.status,201);
  const created = await response.json(); const p = created.profile;
  assert.equal(globalThis.aixNextScans.size,beforeScans,'creation does not fabricate a completed scan');
  assert.equal(created.scanId,undefined);
  assert.ok(created.managementUrl.startsWith('/profile/manage?'));
  assert.ok(p.targetUrl.endsWith('/ai/company/'+encodeURIComponent(p.slug)),'actual unique public URL is the measurement target');
  assert.deepEqual(p.sourcePages,[],'self page cannot masquerade as a verified source');
  assert.ok(p.facts.every(f => f.provenance === 'company_asserted'));
  assert.doesNotMatch(p.markdown+p.json+p.structuredData,/do-not-publish/);
  const query = Object.fromEntries(new URL(created.managementUrl,'https://rovan.test').searchParams);
  const recovered = await post({action:'manage',...query});
  assert.equal(recovered.status,200,'a new tab requires no sessionStorage');
  const privateView = await recovered.json();
  assert.equal(privateView.profiles[0].profile.id,p.id);
  assert.equal(privateView.profiles[0].profile.token,undefined);
  assert.equal((await post({action:'manage',profileId:p.id,token:'wrong'})).status,404);
  const measured = {...sampleResult,targetUrl:p.targetUrl,scanId:'actual-measurement-fixture'};
  const watch = await store.createWatch({id:measured.scanId,targetUrl:p.targetUrl,result:measured},'');
  const stranger = await store.createWatch({id:measured.scanId,targetUrl:p.targetUrl,result:measured},'other@example.test');
  assert.equal((await post({action:'manage',watchToken:watch.token})).status,404);
  assert.equal((await post({action:'bind_watch',profileId:p.id,watchToken:watch.token})).status,403,'public scan and watch alone cannot claim profile');
  assert.equal((await post({action:'bind_watch',...query,watchToken:watch.token})).status,200);
  assert.equal((await post({action:'manage',watchToken:stranger.token})).status,404,'same public scan still confers no ownership');
  assert.equal((await post({action:'publish',profileId:p.id,watchToken:watch.token})).status,200);
  const publicResponse = await api.GET(new Request('https://rovan.test/api/ai-profile?slug='+encodeURIComponent(p.slug)));
  const publicText = await publicResponse.text();
  assert.ok(!publicText.includes(created.token) && !publicText.includes(watch.token));
  assert.doesNotMatch(publicText,/automation|managementUrl|sourceScanId/);
  assert.equal(buildAutomatedFacts(await store.getPublicProfile(p.id),[{url:p.targetUrl,text:'入力された事実に対応しています。'}]),null,'self assertions never become independently verified automated facts');
  assert.equal((await post({action:'revoke',profileId:p.id,watchToken:stranger.token})).status,400);
  assert.equal((await post({action:'revoke',profileId:p.id,watchToken:watch.token})).status,200);
  assert.equal((await post({action:'publish',profileId:p.id,watchToken:watch.token})).status,404);
`));

test("durable renewal delegates to the atomic RPC and rejects a just-cancelled contract or revoked profile", () => isolated(`
  const RealDate = Date; let clock = Date.parse('2026-01-01T00:00:00Z');
  globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } };
  const { sampleResult } = await load('./lib/sample-data.ts');
  const profileRows = []; const watchRows = [{id:'watch-db',token:'watch-db-token',scan_id:'scan-db',paid:true,status:'active',stripe_subscription_id:'sub_db',baseline:sampleResult,latest:sampleResult,history:[],created_at:new Date().toISOString(),updated_at:new Date().toISOString()}];
  let revokeOnRenew = false; let cancelOnRenew = false;
  globalThis.fetch = async (input,init={}) => {
    const url = new URL(String(input));
    assert.equal(url.origin,'https://isolated-storage.invalid');
    const table = url.pathname.split('/').at(-1);
    if (table === 'aix_next_renew_public_profiles') {
      assert.equal(init.method,'POST');
      assert.equal(JSON.parse(init.body).p_watch_token,'watch-db-token');
      if (cancelOnRenew) { watchRows[0].status='cancelled'; watchRows[0].paid=false; cancelOnRenew=false; }
      if (revokeOnRenew) { profileRows[0].status='revoked'; revokeOnRenew=false; }
      if (!watchRows[0].paid || watchRows[0].status!=='active') return Response.json([]);
      const updated=profileRows.filter(row=>row.status==='published' && Date.parse(row.expires_at)>clock && row.automation?.maintenanceEnabled && (!row.automation.renewedAt || Date.parse(row.automation.renewedAt)<=clock-86400000));
      for (const row of updated) {
        const expires=new Date(clock+8*86400000).toISOString();
        row.automation={...row.automation,freeExpiresAt:row.automation.freeExpiresAt||row.expires_at,renewalExpiresAt:expires,renewedAt:new Date().toISOString()};
        row.expires_at=[row.expires_at,expires].sort().at(-1);
        row.updated_at=new Date(clock+1).toISOString();
      }
      return Response.json(updated);
    }
    assert.ok(['aix_next_public_profiles','aix_next_watches'].includes(table));
    const rows = table === 'aix_next_public_profiles' ? profileRows : watchRows;
    if (init.method === 'POST') { const row=JSON.parse(init.body); rows.push(row); return Response.json([row]); }
    const filtered=rows.filter(row => [...url.searchParams].every(([key,value])=>{
      if (['limit','order'].includes(key)) return true;
      const actual=key==='automation->>watchId' ? row.automation?.watchId : row[key];
      if(value.startsWith('eq.')) return String(actual)===value.slice(3);
      if(value.startsWith('gt.')) return String(actual)>value.slice(3);
      return true;
    }));
    if (init.method==='PATCH') filtered.forEach(row=>Object.assign(row,JSON.parse(init.body)));
    return Response.json(filtered);
  };
  const store=await load('./lib/storage.ts');
  const { buildPublicProfileDraft }=await load('./lib/public-profile.ts');
  const p=await store.createPublicProfilePreview(buildPublicProfileDraft(sampleResult),{sourceScanId:'scan-db'});
  await store.publishPublicProfile(p.id,p.token);
  await store.manageProfileAutomation(p.id,p.token,'maintain','watch-db-token');
  for(const day of [7,14,21,28,35]) { clock=RealDate.parse('2026-01-01T00:00:00Z')+day*86400000; await store.renewBoundPublicProfiles('watch-db-token'); }
  globalThis.aixNextPublicProfiles.clear();
  const restored=await store.getPublicProfile(p.id);
  assert.equal(restored.status,'published');
  assert.equal(restored.automation.maintenanceEnabled,true);
  assert.ok(restored.automation.renewedAt);
  assert.ok(restored.expiresAt>restored.automation.freeExpiresAt);
  clock+=2*86400000; cancelOnRenew=true;
  const originalExpiry=profileRows[0].expires_at;
  assert.deepEqual(await store.renewBoundPublicProfiles('watch-db-token'),[]);
  assert.equal(profileRows[0].expires_at,originalExpiry);
  watchRows[0].paid=true; watchRows[0].status='active'; revokeOnRenew=true;
  assert.deepEqual(await store.renewBoundPublicProfiles('watch-db-token'),[]);
  assert.equal(profileRows[0].status,'revoked');
`, true));
