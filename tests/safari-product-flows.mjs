// Real Safari WebDriver QA. Connects only to an explicitly supplied local session.
// No provider, payment, email or production writes. Screenshots are generated evidence.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const [session, output] = process.argv.slice(2);
if (!/^[A-F0-9-]+$/i.test(session || "") || !output?.startsWith("/private/tmp/rovan-product-safari.")) throw new Error("Explicit local Safari session/output required");
const endpoint = `http://127.0.0.1:5551/session/${session}`;
const base = "http://127.0.0.1:3001";
const results = [];
async function command(path, method = "GET", body) {
  const response = await fetch(endpoint + path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok || payload.value?.error) throw new Error(`${path}: ${payload.value?.message || response.status}`);
  return payload.value;
}
const execute = (script, args = []) => command("/execute/sync", "POST", { script, args });
async function waitFor(script) {
  for (let i = 0; i < 60; i++) {
    if (await execute(script)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Page condition timed out: ${script}`);
}
async function go(path) {
  await command("/url", "POST", { url: base + path });
  await waitFor("return document.readyState === 'complete'");
  if (path === "/profile/manage") await waitFor("return document.body.innerText.includes('公開ページを作ったときに表示された「管理用リンク」')");
}
async function click(selector) {
  const element = await command("/element", "POST", { using: "css selector", value: selector });
  const id = element["element-6066-11e4-a52e-4f735466cecf"];
  await command(`/element/${id}/click`, "POST", {});
}
async function capture(name) {
  await command("/execute/async", "POST", { script: "const done=arguments[arguments.length-1]; requestAnimationFrame(()=>requestAnimationFrame(()=>done(true)));", args: [] });
  await writeFile(`${output}/${name}.png`, Buffer.from(await command("/screenshot"), "base64"));
  const viewport = await execute("return {width: innerWidth,height: innerHeight,scrollWidth:document.documentElement.scrollWidth}");
  results.push({ page: name, viewport, horizontalOverflow: viewport.scrollWidth > viewport.width + 1 });
}
await command("/window/rect", "POST", { width: 1440, height: 1000 });
await go("/");
await waitFor("return !!document.querySelector('.header-nav a[href=\"/manage\"]')");
assert.ok(await execute("return [...document.querySelectorAll('.header-nav a[href*=\"sample=1\"]')].every(a=>a.textContent.includes('見本'))"));
await capture("home-desktop");
await click(".header-nav a[href='/result?sample=1']");
await waitFor("return location.pathname === '/result' && document.body.innerText.includes('あおば相続法務事務所')");
const report = await execute("return document.body.innerText");
assert.ok(!/候補に含まれた質問\s*6\s*\/\s*12/.test(report), "old inconsistent count remains");
await capture("result-desktop");
await go("/watch?sample=1");
await waitFor("return document.body.innerText.includes('2問で、自社が新しく推薦候補に入りました。')");
const watch = await execute("return document.body.innerText");
assert.ok(watch.includes("初回") || watch.includes("基準"));
assert.ok(watch.includes("遠方の家族と、仕事帰りに相談できる条件をまとめる"));
await capture("watch-desktop");
await go("/manage");
await waitFor("return !!document.querySelector('#management-url')");
await capture("manage-desktop");
await go("/data-rights");
assert.equal(await execute("return [...document.querySelectorAll('input[type=email]')].some(e=>e.required)"), false);
assert.ok(await execute("return document.body.innerText.includes('メール未登録でも')"));
await capture("data-rights-desktop");
for (const path of ["/privacy", "/terms", "/support", "/commerce", "/ai-info", "/profile/manage", "/pricing", "/methodology", "/partners", "/billing", "/scan", "/setup", "/not-a-rovan-page"]) {
  await go(path);
  const text = await execute("return document.body.innerText");
  if (path === "/setup") assert.ok(text.includes("開発環境専用"));
  else assert.ok(!/SELLER_EMAIL|設定してください|確定してください|製品実装用の初期ポリシー/.test(text), path);
  await capture(path.slice(1).replaceAll("/", "-"));
}
await command("/window/rect", "POST", { width: 430, height: 932 });
await go("/");
await capture("home-narrow");
await click(".mobile-menu summary");
assert.ok(await execute("return document.querySelector('.mobile-menu').open"));
await capture("menu-narrow");
await go("/watch?sample=1");
await capture("watch-narrow");
await go("/profile/manage");
await capture("profile-manage-narrow");
await command("/window/rect", "POST", { width: 800, height: 1000 });
await go("/");
await click(".mobile-menu summary");
assert.ok(await execute("return document.querySelector('.mobile-menu').open"));
await capture("menu-tablet");
assert.ok(results.every(item => !item.horizontalOverflow), "horizontal overflow detected");
await writeFile(`${output}/results.json`, JSON.stringify({ browser: "real Safari WebDriver", results }, null, 2));
console.log(JSON.stringify({ browser: "real Safari WebDriver", results }, null, 2));
