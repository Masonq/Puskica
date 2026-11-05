import type { MetadataRoute } from "next";
import { api, SITE } from "@/lib/server";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const d = await api<{ faculties: string[]; subjects: { faculty: string; slug: string }[] }>("/api/sitemap", { revalidate: 3600 });
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/fakulteti`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...(d?.faculties ?? []).map((f) => ({ url: `${SITE}/f/${f}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...(d?.subjects ?? []).map((s) => ({ url: `${SITE}/f/${s.faculty}/${s.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.6 })),
  ];
}
