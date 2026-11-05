"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search as Icon, BookOpen, Building2 } from "lucide-react";
import { tr, type Pismo } from "@puskica/shared";

type Res = {
  subjects: { slug: string; name: string; code?: string | null; espb?: number | null; faculty: string; faculty_short: string }[];
  faculties: { slug: string; name: string; short: string }[];
};

export function SearchBox({ pismo, autoFocus = false, initial = "" }: { pismo: Pismo; autoFocus?: boolean; initial?: string }) {
  const [q, setQ] = useState(initial);
  const [res, setRes] = useState<Res | null>(null);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => r.json()).then((d) => { setRes(d); setSel(-1); }).catch(() => {});
    }, 160);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const links = [
    ...(res?.faculties ?? []).map((f) => ({ href: `/f/${f.slug}`, title: f.name, sub: f.short, fac: true })),
    ...(res?.subjects ?? []).map((s) => ({
      href: `/f/${s.faculty}/${s.slug}`, title: s.name,
      sub: [s.faculty_short, s.espb ? `${s.espb} ESPB` : null, s.code].filter(Boolean).join(", "), fac: false,
    })),
  ];

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, links.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, -1)); }
    if (e.key === "Enter") {
      e.preventDefault();
      if (sel >= 0 && links[sel]) router.push(links[sel].href);
      else if (q.trim()) router.push(`/pretraga?q=${encodeURIComponent(q.trim())}`);
      setOpen(false);
    }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="search" ref={box}>
      <div className="search-field">
        <Icon aria-hidden="true" />
        <input
          type="search" value={q} autoFocus={autoFocus} enterKeyHint="search"
          placeholder={tr("Predmet, fakultet ili šifra predmeta", pismo)}
          aria-label={tr("Pretraga", pismo)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} onKeyDown={onKey}
        />
      </div>
      {open && q.trim().length >= 2 && res && (
        <div className="search-pop" role="listbox">
          {links.length === 0 && <div className="search-empty">{tr("Ništa nije pronađeno. Probaj kraći naziv ili šifru predmeta.", pismo)}</div>}
          {links.map((l, i) => (
            <Link key={l.href} href={l.href} className="search-item" role="option" aria-selected={i === sel} onClick={() => setOpen(false)}>
              {l.fac ? <Building2 width={18} height={18} className="faint" /> : <BookOpen width={18} height={18} className="faint" />}
              <span className="grow">
                <span className="subj-name" style={{ display: "block" }}>{tr(l.title, pismo)}</span>
                <span className="subj-sub">{tr(l.sub, pismo)}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
