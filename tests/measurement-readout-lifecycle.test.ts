// Sealed hook host for exercising the real components without a browser.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sampleResult, sampleWatch } from "../lib/sample-data";
import { toPublicWatch } from "../lib/public-dto";
import { safeReadoutResultHref } from "../lib/measurement-readout";

const nativeRequire = createRequire(import.meta.url);
const flush = () => new Promise((resolve) => setImmediate(resolve));

function harness(kind: "result" | "watch") {
  let query = "sample=1";
  let key: unknown;
  let frame: any[] = [];
  let cursor = 0;
  let effects: Array<() => void> = [];
  let tree: any;
  let interval: (() => Promise<void>) | undefined;
  const requests: Array<{ url: string; init: RequestInit; resolve: (response: Response) => void }> = [];
  const navigations: string[] = [];
  const copied: string[] = [];
  const empty = () => null;
  const fetchMock = (url: string, init: RequestInit = {}) => new Promise<Response>((resolve) => requests.push({ url, init, resolve }));
  const hooks = {
    ...React,
    useState(initial: any) {
      const index = cursor++, cells = frame;
      if (!cells[index]) cells[index] = { value: typeof initial === "function" ? initial() : initial };
      return [cells[index].value, (value: any) => { cells[index].value = typeof value === "function" ? value(cells[index].value) : value; }];
    },
    useRef(value: any) { const index = cursor++; return frame[index] ||= { current: value }; },
    useMemo(fn: () => any) { cursor++; return fn(); },
    useEffect(fn: () => any, deps: unknown[]) {
      const index = cursor++, cells = frame, previous = cells[index];
      if (previous && deps.every((value, i) => value === previous.deps[i])) return;
      effects.push(() => { previous?.cleanup?.(); cells[index] = { deps, cleanup: fn() }; });
    },
  };
  const mocks: Record<string, any> = {
    react: hooks,
    "next/link": { default: ({ children }: { children: React.ReactNode }) => React.createElement("a", null, children) },
    "next/navigation": { useSearchParams: () => new URLSearchParams(query), useRouter: () => ({ push: (url: string) => navigations.push(url) }) },
    "@/lib/sample-data": { sampleResult, sampleWatch },
    "@/lib/no-site": { isNoSiteTarget: () => false },
    "@/lib/sample-value-proof": { sampleValueWatch: sampleWatch },
    "@/lib/public-dto": { toPublicWatch },
    "@/lib/pricing": { WATCH_MONTHLY_PRICE_LABEL: "¥19,800" },
    "@/components/icons": { ArrowIcon: empty, QuoteIcon: empty, WarningIcon: empty },
  };
  for (const [file, name] of [["site-header", "SiteHeader"], ["site-footer", "SiteFooter"], ["citation-map", "CitationMap"], ["question-list", "QuestionList"], ["report-actions", "ReportActions"], ["positioning-panel", "PositioningPanel"], ["public-profile-actions", "PublicProfileActions"], ["executive-diagnostic-summary", "ExecutiveDiagnosticSummary"], ["profile-automation-controls", "ProfileAutomationControls"], ["executive-referral-card", "ExecutiveReferralCard"], ["value-proof-board", "ValueProofBoard"]]) mocks[`@/components/${file}`] = { [name]: empty };
  function load(file: string) {
    const loaded = { exports: {} as any };
    const source = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInNewContext(source, {
      module: loaded, exports: loaded.exports, URL, URLSearchParams, Intl, AbortController, fetch: fetchMock,
      navigator: { clipboard: { writeText: async (value: string) => { copied.push(value); } } },
      window: { location: { origin: "https://rovan.test", assign: (url: string) => navigations.push(url) }, setInterval: (fn: () => Promise<void>) => { interval = fn; return 1; }, clearInterval: () => { interval = undefined; } },
      require: (name: string) => { if (name === "react/jsx-runtime") return nativeRequire(name); if (Object.hasOwn(mocks, name)) return mocks[name]; throw new Error(`Unexpected import ${name}`); },
    }, { filename: file });
    return loaded.exports;
  }
  mocks["@/lib/measurement-readout"] = load("lib/measurement-readout.ts");
  const component = load(`components/${kind}-client.tsx`)[kind === "watch" ? "WatchClient" : "ResultClient"];
  function render(nextQuery = query) {
    query = nextQuery;
    const wrapper = component();
    if (key !== wrapper.key) { frame.forEach((cell) => cell?.cleanup?.()); frame = []; key = wrapper.key; }
    cursor = 0;
    tree = wrapper.type(wrapper.props);
    const pending = effects; effects = []; pending.forEach((fn) => fn());
    return renderToStaticMarkup(tree);
  }
  function nodes(value = tree): any[] {
    if (Array.isArray(value)) return value.flatMap((child) => nodes(child ?? null));
    if (!value || typeof value !== "object") return [];
    return [value, ...nodes(value.props?.children ?? null)];
  }
  return { render, requests, navigations, copied, nodes, poll: () => interval?.(), dispose: () => frame.forEach((cell) => cell?.cleanup?.()) };
}

for (const kind of ["result", "watch"] as const) {
  test(`${kind}: sample↔real and real ID switch reset state; late aborted response cannot replace current data`, async () => {
    const h = harness(kind);
    const param = kind === "result" ? "id" : "token";
    assert.match(h.render(), /見本/);
    assert.match(h.render(`${param}=first`), /読み込んで/);
    assert.equal(h.requests.length, 1);
    assert.match(h.render("sample=1"), /見本/);
    assert.equal(h.requests[0].init.signal?.aborted, true);
    h.requests[0].resolve(Response.json({ error: "stale failure" }, { status: 500 }));
    await flush();
    assert.doesNotMatch(h.render(), /stale failure/);
    assert.match(h.render(`${param}=second`), /読み込んで/);
    const watch = toPublicWatch(sampleWatch());
    watch.latest.discovery.brandName = "実測対象B";
    const result = structuredClone(sampleResult); result.discovery.brandName = "実測対象B";
    h.requests[1].resolve(Response.json(kind === "watch" ? { ...watch, resultUrl: "/result?id=real" } : { result }));
    await flush();
    assert.match(h.render(), /実測対象B/);
    assert.match(h.render(`${param}=third`), /読み込んで/);
    assert.doesNotMatch(h.render(), /実測対象B/);
    assert.match(h.render(""), /読み込んで/);
    assert.match(h.render(), /開けませんでした/);
    assert.match(h.render("sample=1"), /見本/);
    h.dispose();
  });
}

test("Watch unsubscribe invokes PATCH with empty email, updates UI, and exposes saved URL without local storage", async () => {
  const h = harness("watch");
  h.render("token=private-token");
  h.requests[0].resolve(Response.json({ ...toPublicWatch(sampleWatch()), emailConfigured: true, maskedEmail: "a***@example.com", resultUrl: "https://evil.test/result?id=stolen" }));
  await flush();
  assert.match(h.render(), /管理用リンク/);
  const header = h.nodes().find((node) => node.props?.context);
  assert.equal(header.props.context.profileHref, "/profile/manage?watchToken=private-token");
  assert.doesNotMatch(header.props.context.resultHref, /evil/);
  assert.equal(h.nodes().find((node) => node.props?.watchToken)?.props.watchToken, "private-token");
  await h.nodes().find((node) => node.type === "button" && node.props.children === "管理用リンクをコピー").props.onClick();
  assert.equal(h.copied[0], "https://rovan.test/watch?token=private-token");
  h.nodes().find((node) => node.type === "button" && node.props.children === "通知を止める").props.onClick();
  assert.deepEqual(JSON.parse(String(h.requests[1].init.body)), { token: "private-token", email: "" });
  h.requests[1].resolve(Response.json({ email: null }));
  await flush();
  assert.match(h.render(), /通知を止めました/);
  assert.doesNotMatch(h.render(), /a\*\*\*@example.com/);
  h.nodes().find((node) => node.type === "button" && String(node.props.children).includes("メールアドレスを登録する")).props.onClick();
  h.render();
  const input = h.nodes().find((node) => node.type === "input" && node.props.type === "email");
  assert.equal(input.props.value, "");
  assert.equal(input.props.name, "notificationEmail");
  assert.equal(input.props["aria-label"], "通知先メールアドレス");
  h.dispose();
});

test("result startWatch completion after sample switch cannot navigate; real header targets current scan", async () => {
  const h = harness("result");
  h.render("id=actual");
  h.requests[0].resolve(Response.json({ result: sampleResult }));
  await flush(); h.render();
  const context = h.nodes().find((node) => node.props?.context).props.context;
  assert.equal(context.resultHref, "/result?id=actual");
  assert.equal(context.profileHref, "/result?id=actual#step-2");
  assert.equal(context.watchHref, "/result?id=actual#step-3");
  const form = h.nodes().find((node) => node.type === "form" && h.nodes(node).some((child) => child.props?.id === "watch-email"));
  const action = form.props.onSubmit({ preventDefault() {} });
  h.render("sample=1");
  assert.equal(h.requests[1].init.signal?.aborted, true);
  h.requests[1].resolve(Response.json({ token: "old-result" }));
  await action;
  assert.equal(h.navigations.length, 0);
  h.dispose();
});

test("Watch polling is single-flight and aborts when changing token", async () => {
  const h = harness("watch");
  h.render("token=old");
  h.requests[0].resolve(Response.json({ ...toPublicWatch(sampleWatch()), measurementRun: { status: "running" } }));
  await flush(); h.render();
  const pending = h.poll(); h.poll();
  assert.equal(h.requests.length, 2);
  h.render("token=new");
  assert.equal(h.requests[1].init.signal?.aborted, true);
  h.requests[1].resolve(Response.json({ error: "old polling error" }, { status: 500 }));
  await pending;
  assert.doesNotMatch(h.render(), /old polling error/);
  h.dispose();
});

test("result URL sanitization only accepts relative result IDs", () => {
  for (const value of ["https://evil.test/result?id=x", "//evil.test", "/result?sample=1", "/result/other?id=x", "/result?\\evil=x"]) assert.equal(safeReadoutResultHref(value, "known"), "/result?id=known");
  assert.equal(safeReadoutResultHref("/result?id=real&sample=1#other"), "/result?id=real");
});

test("a poll started before unsubscribe cannot restore the old email setting", async () => {
  const h = harness("watch");
  const old = { ...toPublicWatch(sampleWatch()), emailConfigured: true, maskedEmail: "a***@example.com", measurementRun: { status: "running" } };
  h.render("token=current");
  h.requests[0].resolve(Response.json(old));
  await flush(); h.render();
  const pending = h.poll();
  h.nodes().find((node) => node.type === "button" && node.props.children === "通知を止める").props.onClick();
  h.requests[2].resolve(Response.json({ email: null }));
  await flush();
  h.requests[1].resolve(Response.json(old));
  await pending;
  assert.doesNotMatch(h.render(), /a\*\*\*@example.com/);
  assert.match(h.render(), /通知を止めました/);
  h.dispose();
});

test("email save completion is ignored after switching to another Watch", async () => {
  const h = harness("watch");
  h.render("token=first");
  h.requests[0].resolve(Response.json({ ...toPublicWatch(sampleWatch()), emailConfigured: true, maskedEmail: "a***@example.com" }));
  await flush(); h.render();
  h.nodes().find((node) => node.type === "button" && node.props.children === "通知を止める").props.onClick();
  h.render("token=second");
  assert.equal(h.requests[1].init.signal?.aborted, true);
  h.requests[1].resolve(Response.json({ email: null }));
  await flush();
  h.requests[2].resolve(Response.json({ ...toPublicWatch(sampleWatch()), emailConfigured: true, maskedEmail: "b***@example.com" }));
  await flush();
  assert.match(h.render(), /b\*\*\*@example.com/);
  assert.doesNotMatch(h.render(), /通知を止めました/);
  h.dispose();
});
