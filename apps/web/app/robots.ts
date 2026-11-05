import type { MetadataRoute } from "next";
import { INDEXABLE, SITE } from "@/lib/server";

export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dodaj", "/profil", "/prijava", "/registracija", "/pretraga"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
