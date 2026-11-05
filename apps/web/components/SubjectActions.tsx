"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { post } from "@/lib/client";
import { tr, type Pismo } from "@puskica/shared";

const LABELS = ["Lak", "Prolazan", "Srednji", "Težak", "Pakao"];

export function Difficulty({ fac, slug, init, loggedIn, pismo }: {
  fac: string; slug: string; init: { avg: number | null; count: number; mine: number | null }; loggedIn: boolean; pismo: Pismo;
}) {
  const [d, setD] = useState(init);
  const [err, setErr] = useState("");
  const router = useRouter();
  const vote = async (v: number) => {
    if (!loggedIn) { router.push(`/prijava?next=/f/${fac}/${slug}`); return; }
    setErr("");
    try { setD(await post(`/api/subjects/${fac}/${slug}/rate`, { difficulty: v })); } catch (e) { setErr((e as Error).message); }
  };
  return (
    <div className="card pad">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 className="h3">{tr("Težina predmeta", pismo)}</h2>
        <span className="muted small">{d.count > 0 ? `${d.avg?.toFixed(1)} / 5` : tr("Bez ocena", pismo)}</span>
      </div>
      <div className="meter" aria-hidden="true"><i style={{ width: `${((d.avg ?? 0) / 5) * 100}%` }} /></div>
      <p className="muted tiny" style={{ margin: "8px 0 0" }}>
        {d.count > 0 ? tr(`${LABELS[Math.round(d.avg ?? 1) - 1]}, po oceni ${d.count} ${d.count === 1 ? "studenta" : "studenata"}`, pismo) : tr("Budi prvi koji će oceniti.", pismo)}
      </p>
      <div className="diff" role="group" aria-label={tr("Tvoja ocena težine", pismo)}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} type="button" aria-pressed={d.mine === v} onClick={() => vote(v)} title={tr(LABELS[v - 1], pismo)}>{v}</button>
        ))}
      </div>
      {err && <p className="err" style={{ marginTop: 8 }}>{err}</p>}
    </div>
  );
}

export function KindTabs({ counts, value, onChange, pismo }: { counts: Record<string, number>; value: string; onChange: (v: string) => void; pismo: Pismo }) {
  const tabs = [["", "Sve"], ["rok", "Rokovi"], ["kolokvijum", "Kolokvijumi"], ["skripta", "Skripte"], ["ostalo", "Ostalo"]];
  return (
    <div className="chips" role="group" aria-label={tr("Tip materijala", pismo)}>
      {tabs.map(([id, label]) => (
        <button key={id} type="button" className="chip" aria-pressed={value === id} onClick={() => onChange(id)}>
          {tr(label, pismo)} <span className="count">{id ? counts[id] ?? 0 : counts.all}</span>
        </button>
      ))}
    </div>
  );
}

export function UploadLink({ fac, slug, pismo }: { fac: string; slug: string; pismo: Pismo }) {
  return <Link href={`/dodaj?f=${fac}&p=${slug}`} className="btn btn-marker">{tr("Dodaj materijal", pismo)}</Link>;
}
