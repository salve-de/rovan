// docs/UX_REQUIREMENTS.md のうち機械で測れる項目を、全ページ・スマホ/PC幅で採点する。
// 使い方: 開発サーバーを起動してから `npm run ux:audit`
//   UX_BASE=http://localhost:3000  CHROME_BIN=/path/to/chrome  PAGES=/,/pricing  WIDTHS=390,1440
// 1つでも基準を外れたら終了コード1。
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.UX_BASE || "http://localhost:3000";
const PORT = Number(process.env.UX_PORT || 9335);
const PAGES = (process.env.PAGES || "/,/pricing,/result?sample=1,/watch?sample=1,/ai/company/aoba-bakery?sample=1,/login,/manage,/billing,/methodology,/partners,/privacy,/terms,/data-rights,/support,/commerce,/profile/manage,/no-such-page,/scan?input=%E5%B1%B1%E7%94%B0%E6%9D%BF%E9%87%91").split(",");
const WIDTHS = (process.env.WIDTHS || "320,390,1440").split(",").map(Number);
// 「最初の画面に主ボタン」を求めないページ（掲載企業のお客さん向けの公開情報ページ）
const NO_CTA = [/^\/ai\/company\//];

function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const home = process.env.HOME || "";
  for (const root of [join(home, "Library/Caches/ms-playwright"), join(home, ".cache/ms-playwright")]) {
    if (!existsSync(root)) continue;
    for (const dir of readdirSync(root).filter((name) => name.startsWith("chromium_headless_shell-")).sort().reverse()) {
      for (const sub of readdirSync(join(root, dir))) {
        const bin = join(root, dir, sub, "chrome-headless-shell");
        if (existsSync(bin)) return bin;
      }
    }
  }
  for (const bin of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"]) if (existsSync(bin)) return bin;
  throw new Error("Chrome/Chromium が見つかりません。CHROME_BIN に実行ファイルのパスを指定してください。");
}

const CHECK = `(() => {
  const out = { contrast: [], tiny: [], tap: [], label: [], alt: [], headings: [], cta: false, hscroll: false, meta: {} };
  const vh = innerHeight, vw = innerWidth;
  const parse = (c) => { const m = c && c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; const c = parse(cs.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 0.99) break; } } let bg = { r: 255, g: 255, b: 255, a: 1 }; for (const l of layers.reverse()) bg = blend(l, bg); return bg; };
  const name = (e) => (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/)[0] : e.tagName.toLowerCase());
  const visible = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0; };
  // 文字コントラスト（WCAG 1.4.3：4.5:1、大きい文字は3:1）
  document.querySelectorAll('body *').forEach((e) => {
    if (!visible(e) || e.closest('svg, [aria-hidden="true"], nextjs-portal')) return;
    const text = [...e.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join('');
    if (!text) return;
    const cs = getComputedStyle(e); const fg = parse(cs.color); const bg = bgOf(e); if (!fg || !bg) return;
    const f = blend(fg, bg); const L1 = lum(f), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize); const large = size >= 24 || (+cs.fontWeight >= 700 && size >= 18.66);
    if (ratio < (large ? 3 : 4.5)) out.contrast.push(name(e) + ' ' + ratio.toFixed(2) + ' 「' + text.slice(0, 14) + '」');
    // 文字は12px以上
    if (size < 12) out.tiny.push(name(e) + ' ' + size + 'px 「' + text.slice(0, 14) + '」');
  });
  // 指で押す部品（スマホ幅のみ。文中のリンクは除く）：40px未満を不合格（基準44px、WCAG 2.5.8の最低は24px）
  if (vw < 768) document.querySelectorAll('a, button, input, select, textarea, summary, [role=button]').forEach((e) => {
    if (!visible(e) || e.type === 'hidden') return;
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    const inlineText = cs.display === 'inline' && e.parentElement && /P|LI|SPAN|SMALL|DD|TD/.test(e.parentElement.tagName) && e.parentElement.textContent.trim().length > e.textContent.trim().length + 4;
    if (inlineText) return;
    if (Math.min(r.width, r.height) < 40) out.tap.push(name(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' 「' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 12) + '」');
  });
  // 入力欄の名前（WCAG 3.3.2）
  document.querySelectorAll('input:not([type=hidden]), select, textarea').forEach((e) => {
    if (!visible(e)) return;
    const labelled = e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || (e.id && document.querySelector('label[for="' + CSS.escape(e.id) + '"]')) || e.closest('label');
    if (!labelled) out.label.push(name(e) + ' ' + (e.placeholder || e.name || ''));
  });
  // 画像の代替テキスト（WCAG 1.1.1）
  document.querySelectorAll('img').forEach((e) => { if (!e.hasAttribute('alt')) out.alt.push(e.getAttribute('src')?.slice(0, 60)); });
  // 見出し：h1は1つ、階層を飛ばさない
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5')].filter(visible);
  const h1 = hs.filter((h) => h.tagName === 'H1').length;
  if (h1 !== 1) out.headings.push('h1が' + h1 + '個');
  let prev = 1; for (const h of hs) { const lv = +h.tagName[1]; if (lv > prev + 1) out.headings.push('飛び ' + h.tagName + '「' + h.textContent.trim().slice(0, 12) + '」'); prev = lv; }
  // 最初の画面に主ボタン（診断・申込・送信・ログイン等）
  out.cta = [...document.querySelectorAll('a.button, button, a.header-cta, input[type=submit]')].some((e) => { if (!visible(e) || !/診断|始める|送信|開く|ログイン|公開|試|見る/.test(e.textContent || '')) return false; const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh; });
  // 横スクロール
  out.hscroll = document.documentElement.scrollWidth > vw + 1;
  const meta = (p) => document.querySelector('meta[property="' + p + '"], meta[name="' + p + '"]')?.getAttribute('content') || '';
  out.meta = { title: document.title, desc: !!meta('description'), ogImage: !!meta('og:image'), ogTitle: meta('og:title'), lang: document.documentElement.lang };
  for (const k of ['contrast', 'tiny', 'tap', 'label', 'alt', 'headings']) out[k] = [...new Set(out[k])];
  return JSON.stringify(out);
})()`;

const proc = spawn(findChrome(), ["--headless", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
let failures = 0;
try {
  let webSocketDebuggerUrl = "";
  for (let i = 0; i < 40 && !webSocketDebuggerUrl; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try { ({ webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()); } catch { /* 起動待ち */ }
  }
  if (!webSocketDebuggerUrl) throw new Error("ブラウザーを起動できませんでした。");
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const waits = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
  const send = (method, params = {}, sessionId) => new Promise((r) => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
  const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s("Page.enable");

  for (const w of WIDTHS) {
    await s("Emulation.setDeviceMetricsOverride", { width: w, height: w < 768 ? 812 : 900, deviceScaleFactor: 1, mobile: w < 768 });
    for (const p of PAGES) {
      await s("Page.navigate", { url: BASE + p });
      await new Promise((r) => setTimeout(r, Number(process.env.WAIT || 3000)));
      await s("Runtime.evaluate", { expression: "document.querySelectorAll('nextjs-portal').forEach(e => e.remove())" });
      const { result } = await s("Runtime.evaluate", { expression: CHECK, returnByValue: true });
      const r = JSON.parse(result.result.value || "{}");
      const problems = [];
      if (r.contrast?.length) problems.push(`文字が薄い(${r.contrast.length}): ` + r.contrast.slice(0, 6).join(" | "));
      if (r.tiny?.length) problems.push(`文字が小さい(${r.tiny.length}): ` + r.tiny.slice(0, 6).join(" | "));
      if (r.tap?.length) problems.push(`押しにくい(${r.tap.length}): ` + r.tap.slice(0, 6).join(" | "));
      if (r.label?.length) problems.push("名前のない入力欄: " + r.label.join(" | "));
      if (r.alt?.length) problems.push("代替テキストのない画像: " + r.alt.join(" | "));
      if (r.headings?.length) problems.push("見出し: " + r.headings.join(" | "));
      if (!r.cta && !NO_CTA.some((re) => re.test(p))) problems.push("最初の画面に主ボタンがない");
      if (r.hscroll) problems.push("横スクロールが出る");
      if (!r.meta?.desc) problems.push("説明文(description)がない");
      if (!r.meta?.ogImage) problems.push("共有画像(og:image)がない");
      failures += problems.length;
      console.log(`${problems.length ? "NG" : "OK"} ${w}px ${p}` + (problems.length ? "\n  " + problems.join("\n  ") : ""));
    }
  }
  ws.close();
} finally {
  proc.kill();
}
console.log(failures ? `\n基準を外れた項目: ${failures}件` : "\nすべての基準を満たしています。");
process.exit(failures ? 1 : 0);
