import test from "node:test";
import assert from "node:assert/strict";

// Bypass server-only guard before dynamic imports
try {
  const resolved = require.resolve("server-only");
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: {},
  } as any;
} catch {}

test("auth suite", async (t) => {
  const {
    createSessionToken,
    verifySessionToken,
    createOneTimeLoginToken,
    verifyOneTimeLoginToken,
    parseSessionCookie,
    buildSessionCookieHeader,
    buildClearCookieHeader,
    SESSION_COOKIE_NAME,
  } = await import("../lib/auth");

  const { createWatch, findWatchesByEmail } = await import("../lib/storage");
  const { sampleResult } = await import("../lib/sample-data");

  await t.test("session token creation and verification works correctly", () => {
    const token = createSessionToken({
      email: "Owner@Example.COM",
      watchToken: "token_12345",
      brandName: "テスト工務店",
    });

    const verified = verifySessionToken(token);
    assert.ok(verified);
    assert.equal(verified.email, "owner@example.com");
    assert.equal(verified.watchToken, "token_12345");
    assert.equal(verified.brandName, "テスト工務店");
    assert.ok(verified.exp > Math.floor(Date.now() / 1000));
  });

  await t.test("tampered session token is rejected", () => {
    const token = createSessionToken({ email: "legit@example.com" });
    const [body] = token.split(".");
    const tampered = `${body}.invalidSignature1234567890abcdef`;
    assert.equal(verifySessionToken(tampered), null);
  });

  await t.test("one-time login token works and expires", () => {
    const loginToken = createOneTimeLoginToken("test-user@domain.jp");
    const verified = verifyOneTimeLoginToken(loginToken);
    assert.ok(verified);
    assert.equal(verified.email, "test-user@domain.jp");

    // 改ざんトークン
    assert.equal(verifyOneTimeLoginToken("malformed-token"), null);
  });

  await t.test("cookie helpers produce correct headers", () => {
    const cookie = buildSessionCookieHeader("dummy_token", false);
    assert.match(cookie, /rovan_session=dummy_token/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);

    const clear = buildClearCookieHeader();
    assert.match(clear, /Max-Age=0/);

    const parsed = parseSessionCookie(`other=123; ${SESSION_COOKIE_NAME}=token_abc; another=456`);
    assert.equal(parsed, "token_abc");
  });

  await t.test("findWatchesByEmail retrieves registered records case-insensitively", async () => {
    const scan = {
      id: "scan_test_auth_" + Date.now(),
      targetUrl: "https://auth-test.jp",
      stage: "done",
      progress: 100,
      message: "完了",
      result: sampleResult,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const watch = await createWatch(scan as any, "Ceo@Auth-Test.jp");
    assert.ok(watch);

    // 小文字で検索
    const foundLower = await findWatchesByEmail("ceo@auth-test.jp");
    assert.ok(foundLower.length > 0);
    assert.equal(foundLower[0].email, "ceo@auth-test.jp");

    // 大文字小文字混在で検索
    const foundMixed = await findWatchesByEmail("CEO@AUTH-TEST.JP");
    assert.ok(foundMixed.length > 0);
    assert.equal(foundMixed[0].id, watch.id);

    // 未登録のアドレスで検索
    const foundNone = await findWatchesByEmail("non-existent@auth-test.jp");
    assert.equal(foundNone.length, 0);
  });

  await t.test("POST /api/auth/login never reveals whether an email is registered", async () => {
    const { POST } = await import("../app/api/auth/login/route");

    // 不正メアド（形式エラーのみ400。これは登録有無とは無関係の入力検証）
    const badRes = await POST(new Request("https://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "invalid-email" }),
    }));
    assert.equal(badRes.status, 400);

    // 未登録メアドと登録済みメアどちらも同じ200 + 同じ成功メッセージであること
    // （404や専用フラグで登録有無が外部から判別できてはいけない）
    const notFoundRes = await POST(new Request("https://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "nobody_registered_here@example.com" }),
    }));
    assert.equal(notFoundRes.status, 200);
    const notFoundData = await notFoundRes.json();
    assert.equal(notFoundData.ok, true);
    assert.equal("notFound" in notFoundData, false);

    const okRes = await POST(new Request("https://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ceo@auth-test.jp" }),
    }));
    assert.equal(okRes.status, 200);
    const okData = await okRes.json();
    assert.equal(okData.ok, true);
    assert.equal(okData.message, notFoundData.message);
  });

  await t.test("POST /api/auth/login only exposes devLoginUrl in development", async () => {
    const { POST } = await import("../app/api/auth/login/route");
    const originalEnv = process.env.NODE_ENV;

    try {
      (process.env as any).NODE_ENV = "production";
      const prodRes = await POST(new Request("https://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ceo@auth-test.jp" }),
      }));
      const prodData = await prodRes.json();
      assert.equal("devLoginUrl" in prodData && prodData.devLoginUrl !== undefined, false);

      (process.env as any).NODE_ENV = "development";
      const devRes = await POST(new Request("https://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ceo@auth-test.jp" }),
      }));
      const devData = await devRes.json();
      assert.ok(devData.devLoginUrl);
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
    }
  });

  await t.test("GET /api/auth/verify redirects and sets session cookie", async () => {
    const { GET } = await import("../app/api/auth/verify/route");

    // 不正トークン
    const invalidRes = await GET(new Request("https://localhost/api/auth/verify?token=invalid"));
    assert.equal(invalidRes.status, 307);
    assert.match(invalidRes.headers.get("location") || "", /error=expired/);

    // 正常トークン
    const token = createOneTimeLoginToken("ceo@auth-test.jp");
    const validRes = await GET(new Request(`https://localhost/api/auth/verify?token=${encodeURIComponent(token)}`));
    assert.equal(validRes.status, 307);
    assert.match(validRes.headers.get("location") || "", /\/watch\?token=/);
    const cookie = validRes.headers.get("set-cookie") || "";
    assert.match(cookie, /rovan_session=/);
  });

  await t.test("GET /api/auth/session returns authentication status from cookie", async () => {
    const { GET } = await import("../app/api/auth/session/route");

    // クッキーなし
    const noCookieRes = await GET(new Request("https://localhost/api/auth/session"));
    const unauthData = await noCookieRes.json();
    assert.equal(unauthData.authenticated, false);

    // クッキーあり
    const sessionToken = createSessionToken({
      email: "ceo@auth-test.jp",
      watchToken: "watch_tok_test",
      brandName: "Auth Test Company",
    });
    const cookieRes = await GET(new Request("https://localhost/api/auth/session", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionToken}` },
    }));
    const authData = await cookieRes.json();
    assert.equal(authData.authenticated, true);
    assert.equal(authData.user.email, "ceo@auth-test.jp");
  });

  await t.test("POST /api/auth/logout clears session cookie", async () => {
    const { POST } = await import("../app/api/auth/logout/route");
    const res = await POST(new Request("https://localhost/api/auth/logout", { method: "POST" }));
    assert.equal(res.status, 200);
    const cookie = res.headers.get("set-cookie") || "";
    assert.match(cookie, /Max-Age=0/);
  });
});
