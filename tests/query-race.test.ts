import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { watchTokenFromInput } from "../lib/management-link";

// Execute the real clients with keyed component lifetimes and deferred network
// responses. Fetch deliberately ignores abort, so cleanup must also guard writes
// and download side effects. This does not simulate browser layout/navigation.
function harness(file: string, component: string, initialQuery: string) {
  type Instance = { type: any; key: any; slots: any[]; mounted: boolean };
  let query = initialQuery;
  let current: Instance;
  let index = 0;
  let staleWrites = 0;
  let downloads = 0;
  const instances: Instance[] = [];
  const effects: Array<() => void> = [];
  const calls: Array<{ url: string; init: RequestInit; resolve: (response: Response) => void }> = [];
  const react = {
    useState(initial: any) {
      const instance = current, slot = index++;
      if (!(slot in instance.slots)) instance.slots[slot] = initial;
      return [instance.slots[slot], (value: any) => {
        if (!instance.mounted) { staleWrites++; return; }
        instance.slots[slot] = value;
      }];
    },
    useRef(initial: any) {
      const slot = index++;
      if (!(slot in current.slots)) current.slots[slot] = { current: initial };
      return current.slots[slot];
    },
    useEffect(effect: () => void | (() => void), deps: any[]) {
      const instance = current, slot = index++;
      if (instance.slots[slot] && deps.every((v, i) => v === instance.slots[slot].deps[i])) return;
      instance.slots[slot]?.cleanup?.();
      const entry = { deps, effect, cleanup: undefined as void | (() => void) };
      instance.slots[slot] = entry;
      effects.push(() => { entry.cleanup = effect(); });
    },
  };
  const jsx = (type: any, props: any, key: any) => ({ type, props, key });
  const mocks: Record<string, any> = {
    react, "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/navigation": { useSearchParams: () => new URLSearchParams(query) },
    "next/link": { default: "link" }, "@/components/icons": {},
    "@/components/site-header": { SiteHeader: () => null }, "@/components/site-footer": { SiteFooter: () => null },
    "@/lib/brand": { DATA_DELETION_CONFIRMATION: "DELETE ROVAN DATA" },
    "@/lib/management-link": { watchTokenFromInput },
    "@/lib/sample-report-content": { sampleAiReadable: () => ({ llmsTxt: "架空の見本", jsonLd: "{}", sourcePages: [], publishChecks: [] }) },
  };
  const loaded = { exports: {} as any };
  vm.runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    module: loaded, exports: loaded.exports, AbortController, URLSearchParams,
    URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    document: {
      createElement: () => ({ click() { downloads++; }, remove() {} }),
      body: { appendChild() {} },
    },
    setTimeout: (fn: () => void) => fn(),
    fetch: (url: string, init: RequestInit) => new Promise<Response>(resolve => calls.push({ url, init, resolve })),
    require: (name: string) => { if (name in mocks) return mocks[name]; throw new Error(`Unexpected import ${name}`); },
  });
  function unmountFrom(depth: number) {
    for (const instance of instances.splice(depth)) {
      instance.mounted = false;
      for (const slot of instance.slots) slot?.cleanup?.();
    }
  }
  return {
    calls,
    get staleWrites() { return staleWrites; },
    get downloads() { return downloads; },
    setQuery(value: string) { query = value; },
    unmount() { unmountFrom(0); },
    replayEffects() {
      for (const instance of instances) for (const slot of instance.slots) {
        if (slot?.effect) { slot.cleanup?.(); slot.cleanup = slot.effect(); }
      }
    },
    render() {
      let tree: any = { type: loaded.exports[component], props: {}, key: undefined };
      let depth = 0;
      while (typeof tree?.type === "function") {
        if (instances[depth]?.type !== tree.type || instances[depth]?.key !== tree.key) {
          unmountFrom(depth);
          instances.push({ type: tree.type, key: tree.key, slots: [], mounted: true });
        }
        current = instances[depth++]; index = 0;
        tree = tree.type(tree.props);
      }
      unmountFrom(depth);
      while (effects.length) effects.shift()!();
      return tree;
    },
  };
}

function nodes(tree: any, type: string): any[] {
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, type));
  if (!tree || typeof tree !== "object") return [];
  return [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)];
}
const event = { preventDefault() {} };
const tick = () => new Promise(resolve => setImmediate(resolve));
const ai = (query = "token=A") => harness("components/ai-readable-client.tsx", "AiReadableClient", query);
const privacy = () => harness("components/data-rights-client.tsx", "DataRightsClient", "token=A");
const watch = (name: string) => ({
  latest: { targetUrl: `https://${name}.example` },
  changePack: { aiReadable: { sourcePages: [], publishChecks: [], suggestedFileName: name, llmsTxt: `PRIVATE_DRAFT_${name}`, jsonLd: "{}" } },
});

test("privacy query changes reset credentials/confirmation and submit only the new target", async () => {
  const h = privacy();
  let tree = h.render();
  nodes(tree, "input")[1].props.onChange({ target: { value: "owner@example.com" } });
  nodes(tree, "input")[4].props.onChange({ target: { value: "DELETE ROVAN DATA" } });
  h.render(); h.setQuery("token=B"); tree = h.render();
  assert.deepEqual(nodes(tree, "input").map(node => node.props.value), ["B", "", "B", "", ""]);
  nodes(tree, "input")[4].props.onChange({ target: { value: "DELETE ROVAN DATA" } });
  tree = h.render();
  const pending = nodes(tree, "form")[1].props.onSubmit(event);
  assert.deepEqual(JSON.parse(String(h.calls[0].init.body)), { token: "B", email: "", confirmation: "DELETE ROVAN DATA" });
  h.calls[0].resolve(Response.json({ deleted: true })); await pending;
  assert.match(JSON.stringify(h.render()), /削除しました/);
});

test("pasting a different privacy target resets email and confirmation", () => {
  const h = privacy(); let tree = h.render();
  nodes(tree, "input")[1].props.onChange({ target: { value: "owner@example.com" } });
  nodes(tree, "input")[4].props.onChange({ target: { value: "DELETE ROVAN DATA" } });
  tree = h.render();
  nodes(tree, "input")[0].props.onChange({ target: { value: "/watch?token=B" } });
  assert.deepEqual(nodes(h.render(), "input").map(node => node.props.value), ["/watch?token=B", "", "/watch?token=B", "", ""]);
});

test("privacy aborts old exports/deletions and suppresses late downloads/messages", async () => {
  for (const form of [0, 1]) {
    const h = privacy(); const tree = h.render();
    const pending = nodes(tree, "form")[form].props.onSubmit(event);
    h.setQuery("token=B"); h.render();
    assert.equal(h.calls[0].init.signal?.aborted, true);
    h.calls[0].resolve(Response.json({ deleted: true })); await pending;
    assert.equal(h.downloads, 0); assert.equal(h.staleWrites, 0);
    assert.doesNotMatch(JSON.stringify(h.render()), /削除しました|ダウンロードしました/);
    assert.ok(nodes(h.render(), "button").every(node => !node.props.disabled));
  }
});

test("AI query race keeps the current draft and management link together", async () => {
  const h = ai(); h.render(); h.setQuery("token=B");
  assert.match(JSON.stringify(h.render()), /読み込んでいます/);
  assert.equal(h.calls[0].init.signal?.aborted, true);
  h.calls[1].resolve(Response.json(watch("B"))); await tick();
  h.calls[0].resolve(Response.json(watch("A"))); await tick();
  const tree = JSON.stringify(h.render());
  assert.match(tree, /PRIVATE_DRAFT_B/); assert.match(tree, /watchToken=B/);
  assert.doesNotMatch(tree, /PRIVATE_DRAFT_A/); assert.equal(h.staleWrites, 0);
});

test("AI resets on failure, token removal, sample switch, and URL-only changes", async () => {
  for (const query of ["token=B", "", "sample=1&url=sample.example", "token=A&url=changed.example"]) {
    const h = ai(); h.render(); h.calls[0].resolve(Response.json(watch("A"))); await tick();
    assert.match(JSON.stringify(h.render()), /PRIVATE_DRAFT_A/);
    h.setQuery(query); let tree = h.render();
    assert.doesNotMatch(JSON.stringify(tree), /PRIVATE_DRAFT_A/);
    if (h.calls.length === 2) {
      h.calls[1].resolve(Response.json({ error: "forbidden" }, { status: 403 })); await tick();
      tree = h.render(); assert.match(JSON.stringify(tree), /forbidden/);
      assert.equal(nodes(tree, "button").length, 0);
    }
    assert.doesNotMatch(JSON.stringify(tree), /PRIVATE_DRAFT_A/);
  }
});

test("AI recovery from error and sample mode starts a fresh request", async () => {
  const h = ai(); h.render(); h.calls[0].resolve(Response.json({ error: "old failure" }, { status: 403 })); await tick();
  assert.match(JSON.stringify(h.render()), /old failure/);
  h.setQuery("sample=1&url=sample.example"); assert.match(JSON.stringify(h.render()), /aoba-souzoku.example/);
  h.setQuery("token=B"); assert.match(JSON.stringify(h.render()), /読み込んでいます/);
  h.calls[1].resolve(Response.json(watch("B"))); await tick();
  const tree = JSON.stringify(h.render());
  assert.match(tree, /PRIVATE_DRAFT_B/); assert.doesNotMatch(tree, /old failure|sample.example/);
});

test("effect replay and unmount cannot revive an obsolete AI request", async () => {
  const h = ai(); h.render(); h.replayEffects();
  assert.equal(h.calls[0].init.signal?.aborted, true);
  h.calls[0].resolve(Response.json({ error: "stale failure" }, { status: 500 })); await tick();
  assert.match(JSON.stringify(h.render()), /読み込んでいます/);
  h.calls[1].resolve(Response.json(watch("A"))); await tick();
  assert.match(JSON.stringify(h.render()), /PRIVATE_DRAFT_A/);
  h.setQuery("token=B"); h.render(); h.unmount();
  assert.equal(h.calls[2].init.signal?.aborted, true);
  h.calls[2].resolve(Response.json(watch("B"))); await tick();
  assert.equal(h.staleWrites, 0);
});
