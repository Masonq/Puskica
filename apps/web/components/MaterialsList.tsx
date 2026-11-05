"use client";
import Link from "next/link";
import { useState } from "react";
import { FileUp } from "lucide-react";
import { fmtSize, kindLabel, tr, type Material, type Pismo } from "@puskica/shared";
import { KindTabs } from "./SubjectActions";
import { ChevronRight, Download, FileText } from "lucide-react";

export function MaterialsList({ items, fac, slug, pismo }: { items: Material[]; fac: string; slug: string; pismo: Pismo }) {
  const [kind, setKind] = useState("");
  const counts: Record<string, number> = { all: items.length };
  for (const m of items) counts[m.kind] = (counts[m.kind] ?? 0) + 1;
  const list = kind ? items.filter((m) => m.kind === kind) : items;
  return (
    <div className="stack" style={{ gap: 14 }}>
      <KindTabs counts={counts} value={kind} onChange={setKind} pismo={pismo} />
      {list.length === 0 ? (
        <div className="empty">
          <FileUp aria-hidden="true" />
          <p>{tr(items.length ? "Nema materijala ovog tipa." : "Za ovaj predmet još nema materijala. Imaš rok, kolokvijum ili skriptu? Dodaj i dobij 10 poena.", pismo)}</p>
          <Link href={`/dodaj?f=${fac}&p=${slug}`} className="btn btn-marker">{tr("Dodaj materijal", pismo)}</Link>
        </div>
      ) : (
        <div className="stack">
          {list.map((m) => (
            <Link key={m.id} href={`/m/${m.id}`} className="mat">
              <span className={`paper k-${m.kind}`}>{m.year ?? (m.mime === "application/pdf" ? "PDF" : "IMG")}</span>
              <span className="grow">
                <span className="mat-title" style={{ display: "block" }}>{tr(m.title, pismo)}</span>
                <span className="mat-meta">
                  <span>{tr(kindLabel(m.kind), pismo)}</span>
                  <span><FileText aria-hidden="true" />{fmtSize(m.size)}</span>
                  <span><Download aria-hidden="true" />{m.downloads}</span>
                  {m.author && <span>@{m.author}</span>}
                </span>
              </span>
              <ChevronRight className="subj-arrow" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
