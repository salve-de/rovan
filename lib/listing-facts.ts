import type { CrawledPage, ListingCheck } from "@/lib/types";

/**
 * ホームページの電話番号・住所と、ネット上（Googleマップ・ポータルなど）の情報の食い違いを見つける。
 * AIが調べた値は「出典のURLがあるもの」だけを比べる（出典のない値で「違います」とは言わない）。
 */

const PREFECTURES = "北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県";
const PHONE = /(?<![\d-])0\d{1,4}[-‐－―(（ ]?\d{1,4}[-‐－―)） ]?\d{3,4}(?![\d-])/gu;
const ADDRESS = new RegExp(`(?:〒?\\s?\\d{3}-?\\d{4}\\s*)?(?:${PREFECTURES})?[^\\s、。,.]{1,12}?[市区町村郡][^\\s、。,]{1,30}?\\d+(?:[-－‐丁目番地号の]+\\d+){0,3}`, "gu");

export function normalizePhone(value: string) {
  const digits = value.normalize("NFKC").replace(/\D/gu, "");
  return /^0\d{9,10}$/u.test(digits) ? digits : "";
}

export function normalizeAddress(value: string) {
  return value.normalize("NFKC")
    .replace(/〒?\d{3}-?\d{4}/gu, "")
    .replace(/\s+/gu, "")
    .replace(new RegExp(`^(${PREFECTURES})`, "u"), "")
    .replace(/(\d)\s*(丁目|番地|番|号|の)\s*/gu, "$1-")
    .replace(/[‐－―ー−]/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/-$/u, "");
}

/** 同じ場所を指しているか（建物名の有無や、都道府県の有無の違いは許す） */
export function sameAddress(a: string, b: string) {
  const x = normalizeAddress(a);
  const y = normalizeAddress(b);
  if (!x || !y) return true;
  const length = Math.min(x.length, y.length);
  if (length < 6) return true;
  return x.startsWith(y.slice(0, length)) || y.startsWith(x.slice(0, length));
}

/** ホームページに書かれている電話番号（FAXを除いて一番多く出てくるもの）と住所 */
export function extractSiteContact(pages: CrawledPage[]) {
  const phones = new Map<string, { value: string; count: number }>();
  let address = "";
  for (const page of pages) {
    for (const line of page.text.split(/\n|(?<=。)/u)) {
      if (!/fax|ファックス|ＦＡＸ/iu.test(line)) {
        for (const match of line.matchAll(PHONE)) {
          const key = normalizePhone(match[0]);
          if (key) phones.set(key, { value: match[0].trim(), count: (phones.get(key)?.count || 0) + 1 });
        }
      }
      if (!address && /(所在地|住所|アクセス|〒)/u.test(line)) address = line.match(ADDRESS)?.[0]?.trim() || "";
    }
  }
  const phone = [...phones.values()].sort((a, b) => b.count - a.count)[0]?.value || "";
  return { phone, address };
}

type WebAnswer = { found?: unknown; phone?: unknown; phone_source?: unknown; address?: unknown; address_source?: unknown };

function sourceUrl(value: unknown, ownHost: string) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    // 御社のホームページ自身は「ほかの情報源」ではないので比べない
    if (ownHost && (url.hostname === ownHost || url.hostname.endsWith(`.${ownHost}`))) return "";
    return url.toString();
  } catch { return ""; }
}

/** AIの答えからJSONを取り出す（前後に文章が付いていても読む） */
export function parseWebAnswer(text: string): WebAnswer | null {
  const match = text.match(/\{[\s\S]*\}/u);
  if (!match) return null;
  try { return JSON.parse(match[0]) as WebAnswer; } catch { return null; }
}

export function compareListing(site: { phone: string; address: string }, answer: WebAnswer | null, ownHost: string): ListingCheck {
  if (!answer) return { status: "unknown", items: [] };
  const webPhone = typeof answer.phone === "string" ? answer.phone : "";
  const webAddress = typeof answer.address === "string" ? answer.address : "";
  const phoneSource = sourceUrl(answer.phone_source, ownHost);
  const addressSource = sourceUrl(answer.address_source, ownHost);
  const items: ListingCheck["items"] = [];
  if (site.phone && webPhone && phoneSource && normalizePhone(webPhone) && normalizePhone(site.phone) !== normalizePhone(webPhone)) {
    items.push({ field: "phone", site: site.phone, web: webPhone, sourceUrl: phoneSource });
  }
  if (site.address && webAddress && addressSource && !sameAddress(site.address, webAddress)) {
    items.push({ field: "address", site: site.address, web: webAddress, sourceUrl: addressSource });
  }
  if (items.length) return { status: "mismatch", items };
  if (answer.found === false || (!webPhone && !webAddress)) return { status: "notFound", items: [] };
  const compared = (site.phone && webPhone && phoneSource) || (site.address && webAddress && addressSource);
  return { status: compared ? "match" : "unknown", items: [] };
}
