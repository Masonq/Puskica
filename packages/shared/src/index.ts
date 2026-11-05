// Общий код для сайта (Next.js) и будущего приложения (Expo).

export type Pismo = "lat" | "cyr";
export type Kind = "rok" | "kolokvijum" | "skripta" | "ostalo";

export interface FacultyBrief {
  slug: string; name: string; short: string; city: string; university: string;
  url?: string | null; subjects: number; materials: number;
}
export interface SubjectRow {
  slug: string; name: string; code?: string | null; espb?: number | null;
  semester: number; status: string; materials: number;
}
export interface Program { slug: string; name: string; level: string; subjects: SubjectRow[] }
export interface FacultyFull extends FacultyBrief { programs: Program[] }
export interface Material {
  id: number; kind: Kind; title: string; year?: number | null; note?: string | null; mime: string;
  size: number; downloads: number; created_at: string; author?: string | null; hidden?: boolean;
  subject?: { slug: string; name: string; faculty: string; faculty_short: string };
}
export interface SubjectFull {
  slug: string; name: string; code?: string | null; espb?: number | null; hours?: string | null;
  faculty: FacultyBrief; programs: { name: string; semester: number; status: string }[];
  materials: Material[]; difficulty: { avg: number | null; count: number; mine: number | null };
}
export interface Me {
  id: number; username: string; points: number; uploads: number;
  faculty: { slug: string; short: string; name: string } | null; created_at: string | null;
}
export interface Home {
  faculties: FacultyBrief[]; latest: Material[];
  leaderboard: { slug: string; short: string; name: string; points: number }[];
  totals: { subjects: number; materials: number; users: number };
}

export const KINDS: { id: Kind; label: string; plural: string }[] = [
  { id: "rok", label: "Ispitni rok", plural: "Rokovi" },
  { id: "kolokvijum", label: "Kolokvijum", plural: "Kolokvijumi" },
  { id: "skripta", label: "Skripta", plural: "Skripte" },
  { id: "ostalo", label: "Ostalo", plural: "Ostalo" },
];
export const kindLabel = (k: string) => KINDS.find((x) => x.id === k)?.label ?? k;

// ---------- латиница → кириллица ----------
const DIGRAPHS: [string, string][] = [["Lj", "Љ"], ["LJ", "Љ"], ["lj", "љ"], ["Nj", "Њ"], ["NJ", "Њ"], ["nj", "њ"], ["Dž", "Џ"], ["DŽ", "Џ"], ["dž", "џ"]];
const SINGLE: Record<string, string> = {
  A: "А", B: "Б", V: "В", G: "Г", D: "Д", Đ: "Ђ", E: "Е", Ž: "Ж", Z: "З", I: "И", J: "Ј", K: "К", L: "Л",
  M: "М", N: "Н", O: "О", P: "П", R: "Р", S: "С", T: "Т", Ć: "Ћ", U: "У", F: "Ф", H: "Х", C: "Ц", Č: "Ч", Š: "Ш",
};
for (const [k, v] of Object.entries({ ...SINGLE })) SINGLE[k.toLowerCase()] = v.toLowerCase();

// Слова, которые не транслитерируются (латинские аббревиатуры, бренд, коды).
const KEEP = /^(ETF|MATF|FON|ESPB|AI|PDF|JPG|PNG|WEBP|MB|KB|IT|SI|ER|OA|Puškica|Puskica|[A-Z0-9]*\d[A-Z0-9]*)$/;

export function toCyr(s: string): string {
  return s.replace(/[A-Za-zČĆŠŽĐčćšžđ0-9]+/g, (w) => {
    if (KEEP.test(w)) return w;
    let out = "";
    for (let i = 0; i < w.length; i++) {
      const two = w.slice(i, i + 2);
      const d = DIGRAPHS.find(([l]) => l === two);
      if (d) { out += d[1]; i++; continue; }
      out += SINGLE[w[i]] ?? w[i];
    }
    return out;
  });
}
export const tr = (s: string, p: Pismo) => (p === "cyr" ? toCyr(s) : s);

// ---------- поиск без диакритики ----------
const CYR_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "dj", е: "e", ж: "z", з: "z", и: "i", ј: "j", к: "k", л: "l", љ: "lj",
  м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ћ: "c", у: "u", ф: "f", х: "h", ц: "c", ч: "c",
  џ: "dz", ш: "s",
};
export function fold(s: string): string {
  return s.toLowerCase().replace(/[а-яђјљњћџ]/g, (c) => CYR_LAT[c] ?? c).replace(/đ/g, "dj")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

// ---------- ispitni rokovi (okvirni datumi, Univerzitet u Beogradu) ----------
export const ROKOVI: { name: string; start: string }[] = [
  { name: "Januarski rok", start: "2027-01-18" },
  { name: "Februarski rok", start: "2027-02-08" },
  { name: "Aprilski rok", start: "2027-04-05" },
  { name: "Junski rok", start: "2027-06-07" },
  { name: "Julski rok", start: "2027-06-28" },
  { name: "Septembarski rok", start: "2027-08-30" },
  { name: "Oktobarski rok", start: "2027-09-20" },
];
export function nextRok(now = new Date()) {
  const today = new Date(now.toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  for (const r of ROKOVI) {
    const t = new Date(r.start + "T00:00:00Z").getTime();
    if (t >= today) return { ...r, days: Math.round((t - today) / 86400000) };
  }
  return null;
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
export const fmtSize = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
export const godina = (sem: number) => Math.ceil(sem / 2);
