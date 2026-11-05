import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { tr } from "@puskica/shared";
import { api, getPismo } from "@/lib/server";
import { SearchBox } from "@/components/Search";

export const metadata: Metadata = { title: "Pretraga", robots: { index: false } };
export const dynamic = "force-dynamic";
type R = { subjects: { slug: string; name: string; code?: string | null; espb?: number | null; faculty: string; faculty_short: string }[] };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [pismo, sp] = await Promise.all([getPismo(), searchParams]);
  const q = (sp.q ?? "").slice(0, 80);
  const res = q.trim().length >= 2 ? await api<R>(`/api/search?q=${encodeURIComponent(q)}`, { revalidate: 30 }) : null;
  return (
    <>
      <h1 className="h1" style={{ marginBottom: 18 }}>{tr("Pretraga", pismo)}</h1>
      <SearchBox pismo={pismo} autoFocus={!q} initial={q} />
      {res && (
        <div className="subj-list" style={{ marginTop: 22 }}>
          {res.subjects.length === 0 && <div className="empty"><p>{tr("Ništa nije pronađeno. Probaj kraći naziv ili šifru predmeta.", pismo)}</p></div>}
          {res.subjects.map((s) => (
            <Link key={`${s.faculty}/${s.slug}`} href={`/f/${s.faculty}/${s.slug}`} className="subj">
              <span className="subj-espb">{s.espb ?? "–"}<span>ESPB</span></span>
              <span className="grow">
                <span className="subj-name" style={{ display: "block" }}>{tr(s.name, pismo)}</span>
                <span className="subj-sub">{[s.faculty_short, s.code].filter(Boolean).join(", ")}</span>
              </span>
              <ChevronRight className="subj-arrow" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
