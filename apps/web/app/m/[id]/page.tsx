import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fmtSize, kindLabel, tr, type Material } from "@puskica/shared";
import { api, getPismo } from "@/lib/server";
import { Crumbs } from "@/components/Bits";
import { MaterialActions } from "@/components/MaterialActions";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const m = await api<Material>(`/api/materials/${Number((await params).id) || 0}`);
  if (!m?.subject) return {};
  return {
    title: `${m.title}, ${m.subject.name} (${m.subject.faculty_short})`,
    description: `${kindLabel(m.kind)} iz predmeta ${m.subject.name}${m.year ? `, ${m.year}.` : "."} Preuzmi besplatno.`,
    alternates: { canonical: `/m/${m.id}` },
  };
}

export default async function MaterialPage({ params, searchParams }: P) {
  const id = Number((await params).id);
  const novo = (await searchParams).novo === "1";
  if (!Number.isInteger(id) || id < 1) notFound();
  const [pismo, m] = await Promise.all([getPismo(), api<Material>(`/api/materials/${id}`)]);
  if (!m || !m.subject) notFound();
  const s = m.subject;
  return (
    <>
      <Crumbs pismo={pismo} items={[{ href: `/f/${s.faculty}`, label: s.faculty_short }, { href: `/f/${s.faculty}/${s.slug}`, label: s.name }, { label: kindLabel(m.kind) }]} />
      {novo && <div className="notice" style={{ marginBottom: 16 }}><span>{tr("Objavljeno! Dobio si 10 poena. Podeli link sa kolegama iz grupe.", pismo)}</span></div>}
      <h1 className="h2">{tr(m.title, pismo)}</h1>
      <div className="facts">
        <span className={`badge ${m.kind === "rok" ? "badge-marker" : "badge-pen"}`}>{tr(kindLabel(m.kind), pismo)}</span>
        {m.year && <span className="badge">{m.year}.</span>}
        <span className="badge">{fmtSize(m.size)}</span>
        {m.author && <span className="badge">@{m.author}</span>}
      </div>
      {m.note && <p className="muted" style={{ maxWidth: "70ch" }}>{m.note}</p>}
      <div style={{ margin: "18px 0" }}><MaterialActions id={m.id} pdf={m.mime === "application/pdf"} pismo={pismo} /></div>
      {m.mime === "application/pdf" ? (
        <object data={`/api/files/${m.id}`} type="application/pdf" className="viewer" aria-label={m.title}>
          <div className="empty"><p>{tr("Pregled PDF-a nije dostupan u ovom pregledaču. Preuzmi fajl.", pismo)}</p></div>
        </object>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/files/${m.id}`} alt={m.title} className="viewer-img" />
      )}
    </>
  );
}
