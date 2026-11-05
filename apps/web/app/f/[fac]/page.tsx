import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Upload } from "lucide-react";
import { plural, tr, type FacultyFull } from "@puskica/shared";
import { api, getPismo } from "@/lib/server";
import { Crumbs } from "@/components/Bits";
import { SubjectBrowser } from "@/components/SubjectBrowser";

export const revalidate = 120;
type P = { params: Promise<{ fac: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const f = await api<FacultyFull>(`/api/faculties/${(await params).fac}`, { revalidate: 300 });
  if (!f) return {};
  return {
    title: `${f.short}: rokovi, kolokvijumi i skripte`,
    description: `Stari ispitni rokovi, kolokvijumi i skripte za ${f.subjects} predmeta na ${f.name} (${f.university}).`,
    alternates: { canonical: `/f/${f.slug}` },
  };
}

export default async function FacultyPage({ params }: P) {
  const { fac } = await params;
  const [pismo, f] = await Promise.all([getPismo(), api<FacultyFull>(`/api/faculties/${fac}`)]);
  if (!f) notFound();

  return (
    <>
      <Crumbs pismo={pismo} items={[{ href: "/fakulteti", label: "Fakulteti" }, { label: f.short }]} />
      <div className="page-head">
        <div>
          <h1 className="h1">{tr(f.name, pismo)}</h1>
          <div className="facts">
            <span className="badge">{tr(f.university, pismo)}</span>
            {f.subjects > 0 && <span className="badge">{f.subjects} {tr(plural(f.subjects, "predmet", "predmeta", "predmeta"), pismo)}</span>}
            {f.materials > 0 && <span className="badge badge-marker">{f.materials} {tr("materijala", pismo)}</span>}
          </div>
        </div>
        {f.url && (
          <a href={f.url} target="_blank" rel="noopener noreferrer" className="btn btn-line btn-sm">
            <ExternalLink />{tr("Sajt fakulteta", pismo)}
          </a>
        )}
      </div>

      {f.programs.length > 0 ? (
        <SubjectBrowser fac={f.slug} programs={f.programs} pismo={pismo} />
      ) : (
        <div className="empty" style={{ marginTop: 24 }}>
          <Upload aria-hidden="true" />
          <p>{tr("Spisak predmeta za ovaj fakultet stiže uskoro. Studiraš ovde? Prijavi se i dodaj materijale čim predmeti budu dostupni.", pismo)}</p>
          <Link href="/registracija" className="btn btn-marker">{tr("Napravi nalog", pismo)}</Link>
        </div>
      )}
    </>
  );
}
