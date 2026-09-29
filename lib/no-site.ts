/**
 * ホームページのないお店を「名前だけ」で調べるときの診断対象。
 * .invalid は名前解決されない予約ドメイン（RFC 2606）なので、誤って外部へ接続することはない。
 */
export const NO_SITE_HOST = "no-site.invalid";

export function noSiteTarget(name: string) {
  return `https://${NO_SITE_HOST}/${encodeURIComponent(name.trim())}`;
}

export function isNoSiteTarget(url: string) {
  try { return new URL(url).hostname === NO_SITE_HOST; } catch { return false; }
}

/** 名前だけの診断対象から、入力された名前を取り出す */
export function noSiteInput(url: string) {
  try { return decodeURIComponent(new URL(url).pathname.slice(1)); } catch { return ""; }
}
