"use client";
export async function post<T = unknown>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin",
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(errText(data, r.status));
  return data as T;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errText(data: any, status: number) {
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) {
    const f = data.detail[0];
    const field = f?.loc?.[f.loc.length - 1];
    if (field === "username") return "Korisničko ime: 3–24 znaka.";
    if (field === "password") return "Lozinka mora imati bar 6 znakova.";
    if (field === "title") return "Naslov mora imati bar 2 znaka.";
    return "Proveri unete podatke.";
  }
  if (status === 413) return "Fajl je veći od 25 MB.";
  if (status === 401) return "Prijavi se da nastaviš.";
  return "Server trenutno ne odgovara. Pokušaj ponovo.";
}
export function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}
