const FALLBACK_SITE_URL = "http://localhost:3000";

function normalizedSiteUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (!(["http:", "https:"] as string[]).includes(parsed.protocol)) throw new Error("Unsupported site URL protocol");
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return FALLBACK_SITE_URL;
  }
}

/** The configured public origin used by metadata, robots and sitemap routes. */
export const siteUrl = normalizedSiteUrl(process.env.NEXT_PUBLIC_SITE_URL?.trim() || FALLBACK_SITE_URL);

/** Pages that are safe and useful for public discovery. Private result surfaces are excluded. */
export const indexableRoutes = [
  "/",
  "/methodology",
  "/pricing",
  "/privacy",
  "/terms",
] as const;

export const privateRoutes = [
  "/api/",
  "/scan",
  "/result",
  "/watch",
  "/ai-info",
  "/billing",
  "/setup",
  "/data-rights",
  "/manage",
  "/profile/manage",
  "/login",
] as const;
