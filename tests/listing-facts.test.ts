import assert from "node:assert/strict";
import test from "node:test";
import { compareListing, extractSiteContact, normalizePhone, parseWebAnswer, sameAddress } from "../lib/listing-facts";
import type { CrawledPage } from "../lib/types";

const page = (text: string): CrawledPage => ({ url: "https://example.com/", title: "", description: "", headings: [], text } as CrawledPage);

test("ホームページの電話番号はFAXを除いて一番多く出てくるもの、住所は所在地の行から取る", () => {
  const site = extractSiteContact([
    page("お問い合わせ TEL 03-1234-5678\nFAX 03-1234-5679\n所在地 〒144-0051 東京都大田区西蒲田7丁目1-1 ビル2F"),
    page("お電話は 03-1234-5678 まで"),
  ]);
  assert.equal(normalizePhone(site.phone), "0312345678");
  assert.match(site.address, /大田区西蒲田7丁目1-1/);
});

test("住所は都道府県・郵便番号・丁目の書き方・建物名の違いを同じとみなす", () => {
  assert.equal(sameAddress("〒144-0051 東京都大田区西蒲田7丁目1-1 ビル2F", "大田区西蒲田7-1-1"), true);
  assert.equal(sameAddress("東京都大田区西蒲田7-1-1", "東京都大田区蒲田5-2-3"), false);
});

test("出典のURLがある食い違いだけを知らせ、御社のホームページ自身は出典として数えない", () => {
  const site = { phone: "03-1234-5678", address: "東京都大田区西蒲田7-1-1" };
  const wrong = compareListing(site, { found: true, phone: "03-9999-0000", phone_source: "https://maps.example/a", address: "大田区西蒲田7-1-1", address_source: "https://maps.example/a" }, "example.com");
  assert.equal(wrong.status, "mismatch");
  assert.deepEqual(wrong.items.map((item) => item.field), ["phone"]);
  assert.equal(compareListing(site, { found: true, phone: "03-9999-0000", phone_source: null }, "example.com").status, "unknown", "出典のない値では違うと言わない");
  assert.equal(compareListing(site, { found: true, phone: "03-9999-0000", phone_source: "https://www.example.com/contact" }, "example.com").status, "unknown", "自社サイトは比べる相手にしない");
  assert.equal(compareListing(site, { found: true, phone: "(03) 1234-5678", phone_source: "https://maps.example/a" }, "example.com").status, "match");
  assert.equal(compareListing(site, { found: false, phone: null, address: null }, "example.com").status, "notFound");
  assert.equal(compareListing(site, null, "example.com").status, "unknown");
});

test("AIの答えに前置きがあっても、JSONの部分だけを読む", () => {
  assert.deepEqual(parseWebAnswer('調べました。\n{"found": true, "phone": "03-1234-5678", "phone_source": "https://maps.example/a"}\n以上です。'), { found: true, phone: "03-1234-5678", phone_source: "https://maps.example/a" });
  assert.equal(parseWebAnswer("見つかりませんでした"), null);
});
