import type { MetadataRoute } from "next";
import { indexableRoutes, siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // NEXT_PUBLIC_SITE_URL is required in production; without it siteUrl falls
  // back to localhost. Never publish localhost URLs into a live sitemap.
  if (!process.env.NEXT_PUBLIC_SITE_URL?.trim()) return [];
  // Do not emit a moving timestamp: lastmod should describe a real content change.
  return indexableRoutes.map((route) => ({ url: route === "/" ? siteUrl : `${siteUrl}${route}` }));
}
