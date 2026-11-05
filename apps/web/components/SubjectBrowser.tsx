"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { fold, godina, plural, tr, type Pismo, type Program } from "@puskica/shared";

export function SubjectBrowser({ fac, programs, pismo }: { fac: string; programs: Program[]; pismo: Pismo }) {
  const [prog, setProg] = useState(programs[0]?.slug ?? "");
  const [year, setYear] = useState(0);
  const [q, setQ] = useState("");
  const p = programs.find((x) => x.slug === prog) ?? programs[0];
  const years = useMemo(() => Array.from(new Set((p?.subjects ?? []).map((s) => godina(s.semester)))).sort(), [p]);

  const groups = useMemo(() => {
    const fq = fold(q.trim());
    const list = (p?.subjects ?? []).filter((s) =>
      (!year || godina(s.semester) === year) && (!fq || fold(s.name).includes(fq) || fold(s.code ?? "").includes(fq)));
    const by = new Map<number, typeof list>();
    for (const s of list) by.set(s.semester, [...(by.get(s.semester) ?? []), s]);
    return [...by.entries()].sort((a, b) => a[0] - b[0]);
  }, [p, year, q]);

  if (!p) return null;
  return (
    <>
      {programs.length > 1 && (
        <div className="chips" style={{ marginTop: 22 }} role="group" aria-label={tr("Studijski program", pismo)}>
          {programs.map((x) => (
            <button key={x.slug} type="button" className="chip" aria-pressed={x.slug === p.slug} onClick={() => { setProg(x.slug); setYear(0); }}>
              {tr(x.name, pismo)}
            </button>
          ))}
        </div>
      )}
      <div className="filters">
        <div className="chips" role="group" aria-label={tr("Godina", pismo)}>
          <button type="button" className="chip" aria-pressed={year === 0} onClick={() => setYear(0)}>{tr("Sve godine", pismo)}</button>
          {years.map((y) => (
            <button key={y} type="button" className="chip" aria-pressed={year === y} onClick={() => setYear(y)}>{tr(`${y}. godina`, pismo)}</button>
          ))}
        </div>
        <label className="search-field filter-search">
          <Search aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Nađi predmet", pismo)} aria-label={tr("Nađi predmet", pismo)} />
        </label>
      </div>

      {groups.length === 0 && <div className="empty" style={{ marginTop: 20 }}><p>{tr("Nema predmeta za ovaj filter.", pismo)}</p></div>}
      {groups.map(([sem, list]) => (
        <section key={sem}>
          <div className="sem-title">
            <h2 className="h3">{tr(`${sem}. semestar`, pismo)}</h2>
            <span className="faint small">{list.length} {tr(plural(list.length, "predmet", "predmeta", "predmeta"), pismo)}</span>
          </div>
          <div className="subj-list">
            {list.map((s) => (
              <Link key={s.slug + sem} href={`/f/${fac}/${s.slug}`} className="subj">
                <span className="subj-espb">{s.espb ?? "–"}<span>ESPB</span></span>
                <span className="grow">
                  <span className="subj-name" style={{ display: "block" }}>{tr(s.name, pismo)}</span>
                  <span className="subj-sub">{[s.status === "izborni" ? tr("Izborni", pismo) : tr("Obavezni", pismo), s.code].filter(Boolean).join(", ")}</span>
                </span>
                {s.materials > 0 && <span className="badge badge-marker subj-count">{s.materials}</span>}
                <ChevronRight className="subj-arrow" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
