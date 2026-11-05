import Link from "next/link";
import { ChevronRight, Download, CalendarClock, FileText } from "lucide-react";
import { fmtSize, kindLabel, nextRok, plural, tr, type FacultyBrief, type Material, type Pismo } from "@puskica/shared";

export function RokChip({ pismo }: { pismo: Pismo }) {
  const r = nextRok();
  if (!r) return null;
  const txt = r.days === 0 ? `${r.name} počinje danas` : `${r.name} za ${r.days} ${plural(r.days, "dan", "dana", "dana")}`;
  return (
    <div className="rok" title={tr("Okvirni datum za Univerzitet u Beogradu. Tačan raspored proveri na sajtu fakulteta.", pismo)}>
      <span className="rok-days">{r.days}</span>
      <span>{tr(txt, pismo)}</span>
      <CalendarClock width={16} height={16} className="faint" aria-hidden="true" />
    </div>
  );
}

export function FacultyCard({ f, pismo, big = false }: { f: FacultyBrief; pismo: Pismo; big?: boolean }) {
  const live = f.subjects > 0;
  return (
    <Link href={`/f/${f.slug}`} className={`fac${live ? " live" : ""}${big ? " big" : ""}`}>
      <div>
        <div className="fac-short">{f.short}</div>
        <div className="fac-name">{tr(f.name, pismo)}</div>
      </div>
      <div className="fac-meta">
        {live ? (
          <span className="badge">{f.subjects} {tr(plural(f.subjects, "predmet", "predmeta", "predmeta"), pismo)}</span>
        ) : (
          <span className="badge">{tr("Uskoro", pismo)}</span>
        )}
        {f.materials > 0 && <span className="badge badge-marker">{f.materials} {tr("materijala", pismo)}</span>}
      </div>
    </Link>
  );
}

export function MaterialItem({ m, pismo, showSubject = false }: { m: Material; pismo: Pismo; showSubject?: boolean }) {
  const date = new Date(m.created_at).toLocaleDateString("sr-Latn-RS", { day: "numeric", month: "short", year: "numeric" });
  return (
    <Link href={`/m/${m.id}`} className="mat">
      <span className={`paper k-${m.kind}`}>{m.year ?? (m.mime === "application/pdf" ? "PDF" : "IMG")}</span>
      <span className="grow">
        <span className="mat-title" style={{ display: "block" }}>{tr(m.title, pismo)}</span>
        <span className="mat-meta">
          <span>{tr(kindLabel(m.kind), pismo)}</span>
          {showSubject && m.subject && <span className="ellipsis">{tr(`${m.subject.faculty_short}, ${m.subject.name}`, pismo)}</span>}
          <span><FileText aria-hidden="true" />{fmtSize(m.size)}</span>
          <span><Download aria-hidden="true" />{m.downloads}</span>
          {!showSubject && <span>{tr(date, pismo)}</span>}
        </span>
      </span>
      <ChevronRight className="subj-arrow" aria-hidden="true" />
    </Link>
  );
}

export function Crumbs({ items, pismo }: { items: { href?: string; label: string }[]; pismo: Pismo }) {
  return (
    <nav className="crumbs" aria-label="Putanja">
      {items.map((it, i) => (
        <span key={i} className="row" style={{ gap: 6 }}>
          {i > 0 && <ChevronRight aria-hidden="true" />}
          {it.href ? <Link href={it.href}>{tr(it.label, pismo)}</Link> : <span>{tr(it.label, pismo)}</span>}
        </span>
      ))}
    </nav>
  );
}
