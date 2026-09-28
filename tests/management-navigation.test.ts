import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { managementDestination, watchTokenFromInput } from "../lib/management-link";

test("management entry accepts only known local routes and keeps owner context", () => {
  const origin = "https://rovan.example";
  assert.equal(managementDestination(`${origin}/watch?token=owner&sample=1`, origin), "/watch?token=owner");
  assert.equal(managementDestination("/profile/manage?profileId=p&token=t", origin), "/profile/manage?profileId=p&token=t");
  assert.equal(managementDestination("/profile/manage?watchToken=t", origin), "/profile/manage?watchToken=t");
  assert.equal(managementDestination("/profile/manage?profileId=p&token=t&watchToken=w", origin), "/profile/manage?profileId=p&token=t&watchToken=w");
  assert.equal(managementDestination("/result?id=s", origin), "/result?id=s");
  for (const input of ["https://attacker.example/watch?token=t", "//attacker.example/watch?token=t", "javascript:alert(1)", "/watch?sample=1", "/ai/company/company", "/profile/manage", "https://user:pass@rovan.example/watch?token=t"]) {
    assert.equal(managementDestination(input, origin), null, input);
  }
});

test("data management accepts whole Watch URL without asking users to extract a token", () => {
  assert.equal(watchTokenFromInput("https://rovan.example/watch?token=secret%2Dkey"), "secret-key");
  assert.equal(watchTokenFromInput("/watch?token=key"), "key");
  assert.equal(watchTokenFromInput(" key "), "key");
  assert.equal(watchTokenFromInput("https://rovan.example/result?id=s"), "");
});

test("public menus label samples and user-facing policies have no developer instructions", () => {
  const header = readFileSync("components/site-header.tsx", "utf8");
  assert.match(header, /context\.resultHref/);
  assert.match(header, /診断結果の見本/);
  assert.match(header, /管理画面を開く/);
  for (const file of ["app/privacy/page.tsx", "app/terms/page.tsx", "app/support/page.tsx", "app/commerce/page.tsx"]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /設定してください|確定してください|一般公開しないでください|製品実装用の初期ポリシー/);
  }
});
