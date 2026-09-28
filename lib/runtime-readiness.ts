type Configuration = Record<string, string | undefined>;

export function isProductionRuntime(source: Configuration = process.env) {
  return source.NODE_ENV === "production";
}

export function configurationFailures(source: Configuration = process.env) {
  const required = ["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RATE_LIMIT_SALT", "NEXT_PUBLIC_SITE_URL", "AUTH_SECRET"];
  const failures = required.filter((key) => !source[key]?.trim());
  if (source.RATE_LIMIT_SALT && (source.RATE_LIMIT_SALT === "development-only" || source.RATE_LIMIT_SALT.length < 32)) failures.push("RATE_LIMIT_SALT:too-short");
  if (source.AUTH_SECRET && source.AUTH_SECRET.length < 32) failures.push("AUTH_SECRET:too-short");
  if (source.NEXT_PUBLIC_SITE_URL) {
    try {
      const url = new URL(source.NEXT_PUBLIC_SITE_URL);
      if (url.protocol !== "https:" || url.username || url.password || url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname === "127.0.0.1" || url.hostname === "[::1]" || url.pathname !== "/" || url.search || url.hash) failures.push("NEXT_PUBLIC_SITE_URL:invalid-public-origin");
    } catch { failures.push("NEXT_PUBLIC_SITE_URL:invalid-public-origin"); }
  }
  return failures;
}

/** Production must not acknowledge writes that disappear on restart. */
export function durableStorageAvailable(source: Configuration = process.env) {
  const configured = Boolean(source.SUPABASE_URL?.trim() && source.SUPABASE_SERVICE_ROLE_KEY?.trim());
  if (!configured && isProductionRuntime(source)) throw new Error("保存先に接続できません。時間を置いて再度お試しください。");
  return configured;
}
