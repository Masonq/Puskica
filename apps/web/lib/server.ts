import "server-only";
import { cookies } from "next/headers";
import type { Pismo } from "@puskica/shared";

const API = process.env.API_INTERNAL || "http://localhost:8710";
export const SITE = (process.env.SITE_URL || "http://localhost:3710").replace(/\/$/, "");
export const INDEXABLE = process.env.INDEXABLE === "1";

export async function api<T>(path: string, opts: { revalidate?: number; auth?: boolean } = {}): Promise<T | null> {
  const init: RequestInit & { next?: { revalidate: number } } = {};
  if (opts.auth) {
    const c = (await cookies()).get("pk_session");
    init.headers = c ? { cookie: `pk_session=${c.value}` } : {};
    init.cache = "no-store";
  } else {
    init.next = { revalidate: opts.revalidate ?? 60 };
  }
  const r = await fetch(`${API}${path}`, init);
  if (r.status === 404 || r.status === 401) return null;
  if (!r.ok) throw new Error(`API ${path} -> ${r.status}`);
  return (await r.json()) as T;
}

export async function getPismo(): Promise<Pismo> {
  return (await cookies()).get("pismo")?.value === "cyr" ? "cyr" : "lat";
}
export async function getTheme(): Promise<"dark" | "light"> {
  return (await cookies()).get("tema")?.value === "light" ? "light" : "dark";
}
export async function isLoggedIn() {
  return Boolean((await cookies()).get("pk_session"));
}
