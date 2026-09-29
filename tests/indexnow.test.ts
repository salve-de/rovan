import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type IndexNow = {
  notifySearchEngines: (paths: string[]) => Promise<boolean>;
  notifySearchEnginesAfterResponse: (paths: string[]) => void;
  indexNowEnabled: () => boolean;
};

function loadIndexNow(input: { key?: string; siteUrl: string; after?: (task: () => Promise<void>) => void }) {
  const calls: Array<{ url: string; body: any }> = [];
  const code = ts.transpileModule(readFileSync("lib/indexnow.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} as IndexNow };
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports, URL, AbortController, setTimeout, clearTimeout,
    process: { env: { INDEXNOW_KEY: input.key } },
    fetch: async (url: string, init: RequestInit) => { calls.push({ url, body: JSON.parse(String(init.body)) }); return new Response(null, { status: 202 }); },
    require: (name: string) => {
      if (name === "server-only") return {};
      if (name === "next/server") return { after: input.after || (() => { throw new Error("outside a request scope"); }) };
      if (name === "@/lib/site") return { siteUrl: input.siteUrl };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { module: loaded.exports, calls };
}

test("鍵と本番のURLがあるときだけ、公開ページのURLを IndexNow に知らせる", async () => {
  const { module, calls } = loadIndexNow({ key: "0123456789abcdef", siteUrl: "https://rovan.jp" });
  assert.equal(await module.notifySearchEngines(["/ai/company/a", "/ai/company/a", "/ai/company/b"]), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.indexnow.org/indexnow");
  assert.deepEqual(calls[0].body, {
    host: "rovan.jp", key: "0123456789abcdef", keyLocation: "https://rovan.jp/indexnow-key.txt",
    urlList: ["https://rovan.jp/ai/company/a", "https://rovan.jp/ai/company/b"],
  });
});

test("鍵がない・開発環境のURL・形式の悪い鍵では、外に何も送らない", async () => {
  for (const input of [{ siteUrl: "https://rovan.jp" }, { key: "0123456789abcdef", siteUrl: "http://localhost:3000" }, { key: "bad key!", siteUrl: "https://rovan.jp" }]) {
    const { module, calls } = loadIndexNow(input);
    assert.equal(module.indexNowEnabled(), false);
    assert.equal(await module.notifySearchEngines(["/ai/company/a"]), false);
    module.notifySearchEnginesAfterResponse(["/ai/company/a"]);
    assert.equal(calls.length, 0);
  }
});

test("応答のあとに送る。リクエストの外から呼ばれたときは、その場で送る", async () => {
  const scheduled: Array<() => Promise<void>> = [];
  const later = loadIndexNow({ key: "0123456789abcdef", siteUrl: "https://rovan.jp", after: (task) => { scheduled.push(task); } });
  later.module.notifySearchEnginesAfterResponse(["/ai/company/a"]);
  assert.equal(later.calls.length, 0, "応答を返すまでは送らない");
  await scheduled[0]();
  assert.equal(later.calls.length, 1);

  const immediate = loadIndexNow({ key: "0123456789abcdef", siteUrl: "https://rovan.jp" });
  immediate.module.notifySearchEnginesAfterResponse(["/ai/company/a"]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(immediate.calls.length, 1);
});
