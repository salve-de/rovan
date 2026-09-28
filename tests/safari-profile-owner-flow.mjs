// Exercises only an explicitly named fictional profile in a memory-only local server.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const [session, output] = process.argv.slice(2);
if (!/^[A-F0-9-]+$/i.test(session || "") || !output?.startsWith("/private/tmp/rovan-product-safari.")) throw new Error("Explicit Safari evidence arguments required");
const base = "http://127.0.0.1:3001";
const health = await (await fetch(`${base}/api/health`)).json();
assert.equal(health.readiness.persistence, false, "Never create this fixture in a durable/production environment");
const endpoint = `http://127.0.0.1:5551/session/${session}`;
async function cmd(path, method = "GET", body) {
  const response = await fetch(endpoint + path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok || payload.value?.error) throw new Error(`${path}: ${payload.value?.message || response.status}`);
  return payload.value;
}
const js = (script, args = []) => cmd("/execute/sync", "POST", { script, args });
async function wait(text) {
  for (let i = 0; i < 100; i++) {
    if (await js("return document.body.innerText.includes(arguments[0])", [text])) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Missing expected text: ${text}`);
}
async function click(selector) {
  // Safari's pointer click is unreliable after switching automation tabs.
  // Activate the real rendered, enabled DOM control; no API response is mocked.
  await js("const e=document.querySelector(arguments[0]); if(!e || e.disabled || !e.getClientRects().length) throw new Error('Control not actionable'); e.scrollIntoView({block:'center'}); e.click(); return true;", [selector]);
}
async function go(path) {
  await cmd("/url", "POST", { url: new URL(path, base).href });
  // The dev server may replace SSR nodes during hydration; do not type into discarded nodes.
  await new Promise(resolve => setTimeout(resolve, 1000));
}
const shot = async name => writeFile(`${output}/${name}.png`, Buffer.from(await cmd("/screenshot"), "base64"));
let management;
try {
  await go(`/scan?kind=product&input=${encodeURIComponent(`動作確認用架空サービス-${Date.now()}`)}`);
  await wait("先にAIが読めるページの下書きをつくる →");
  await click("button.scan-resolve-start");
  await wait("内容を確認して公開する");
  management = await js("return document.querySelector('a[href^=\"/profile/manage?profileId=\"]').getAttribute('href')");
  await shot("direct-draft");
  await click("button.scan-resolve-start");
  await wait("状態：公開中");
  assert.equal(await js("return location.pathname"), "/profile/manage");
  const publicPath = await js("return document.querySelector('a[href^=\"/ai/company/\"]').getAttribute('href')");
  const diagnostic = await js("return document.querySelector('a[href^=\"/scan?url=\"]').getAttribute('href')");
  assert.equal(new URL(new URL(diagnostic, base).searchParams.get("url")).origin, base, "Diagnostic must not point to a different local app");
  await shot("direct-owner");
  await go(publicPath);
  await wait("参照元未確認");
  await shot("direct-public");
  // A new actual Safari tab has no opener/sessionStorage; the saved capability must suffice.
  const originalWindow = await cmd("/window");
  const next = await cmd("/window/new", "POST", { type: "tab" });
  await cmd("/window", "POST", { handle: next.handle });
  await go("/manage");
  await wait("保存した管理URL");
  const managementText = new URL(management, base).href;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const input = await cmd("/element", "POST", { using: "css selector", value: "#management-url" });
      const inputId = input["element-6066-11e4-a52e-4f735466cecf"];
      await cmd(`/element/${inputId}/click`, "POST", {});
      await cmd(`/element/${inputId}/clear`, "POST", {});
      await cmd(`/element/${inputId}/value`, "POST", { text: managementText, value: [...managementText] });
      if (await js("return document.querySelector('#management-url').value.length > 0")) break;
    } catch (error) { if (attempt === 2) throw error; }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.equal(await js("return document.querySelector('#management-url').value.length > 0"), true, "Safari must finish entering the saved URL before submission");
  await click("form.management-entry button[type=submit]");
  await wait("状態：公開中");
  assert.equal(await js("return sessionStorage.length"), 0);
  await shot("direct-owner-new-tab");
  await js("[...document.querySelectorAll('button')].find(e=>e.textContent==='公開を停止する').scrollIntoView({block:'center'}); return true;");
  await js("const e=[...document.querySelectorAll('button')].find(e=>e.textContent==='公開を停止する'); if(!e || e.disabled) throw new Error('Revoke control unavailable'); e.click(); return true;");
  await wait("状態：非公開");
  await shot("direct-owner-revoked");
  await go(publicPath);
  await wait("ページが見つかりません");
  await cmd("/window", "DELETE");
  await cmd("/window", "POST", { handle: originalWindow });
  console.log("PASS: real Safari draft → consented publication → public page → saved management URL in a fresh tab → revoke → unavailable public page. Memory-only fictional fixture; no provider calls.");
} finally {
  if (management) {
    const params = new URL(management, base).searchParams;
    await fetch(`${base}/api/ai-profile`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revoke", profileId: params.get("profileId"), token: params.get("token") }) });
  }
}
