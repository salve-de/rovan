import assert from "node:assert/strict";
import test from "node:test";
import { isSameOrigin, normalizePublicUrl } from "../lib/url-security";

test("adds https to a bare domain", () => {
  assert.equal(normalizePublicUrl("example.com"), "https://example.com/");
});

test("rejects credentials and non-http schemes", () => {
  assert.throws(() => normalizePublicUrl("https://user:pass@example.com"), /ID・パスワード/);
  assert.throws(() => normalizePublicUrl("file:///etc/passwd"), /http/);
});

test("rejects non-standard ports and localhost", () => {
  assert.throws(() => normalizePublicUrl("https://example.com:8443"), /標準ポート/);
  assert.throws(() => normalizePublicUrl("http://localhost"), /公開されているURL/);
});

test("rejects private literal IPs", () => {
  assert.throws(() => normalizePublicUrl("http://127.0.0.1"), /内部IP/);
  assert.throws(() => normalizePublicUrl("http://192.168.1.2"), /内部IP/);
});

test("redirects stay on the normalized origin", () => {
  assert.equal(isSameOrigin("https://example.com/next", "https://example.com"), true);
  assert.equal(isSameOrigin("https://example.com.evil.test/next", "https://example.com"), false);
  assert.equal(isSameOrigin("https://example.com/next", "https://example.com:443"), true);
});
