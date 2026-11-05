"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Check } from "lucide-react";
import { errText } from "@/lib/client";
import { fmtSize, fold, KINDS, tr, type FacultyBrief, type FacultyFull, type Kind, type Pismo } from "@puskica/shared";

export function UploadForm({ faculties, initFac, initSubj, pismo }: { faculties: FacultyBrief[]; initFac?: string; initSubj?: string; pismo: Pismo }) {
  const router = useRouter();
  const [fac, setFac] = useState(initFac ?? "");
  const [detail, setDetail] = useState<FacultyFull | null>(null);
  const [subj, setSubj] = useState(initSubj ?? "");
  const [sq, setSq] = useState("");
  const [kind, setKind] = useState<Kind>("rok");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDetail(null);
    if (!fac) return;
    fetch(`/api/faculties/${fac}`).then((r) => r.json()).then(setDetail).catch(() => setDetail(null));
  }, [fac]);

  const subjects = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; semester: number }>();
    for (const p of detail?.programs ?? []) for (const s of p.subjects) if (!map.has(s.slug)) map.set(s.slug, s);
    const all = [...map.values()].sort((a, b) => a.semester - b.semester || a.name.localeCompare(b.name, "sr"));
    const q = fold(sq.trim());
    return q ? all.filter((s) => fold(s.name).includes(q)) : all;
  }, [detail, sq]);
  const chosen = subjects.find((s) => s.slug === subj) ?? [...(detail?.programs ?? [])].flatMap((p) => p.subjects).find((s) => s.slug === subj);

  const pick = (f: File | undefined) => {
    setErr("");
    if (!f) return;
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(f.type)) { setErr(tr("Dozvoljeni su PDF, JPG, PNG i WEBP.", pismo)); return; }
    if (f.size > 25 * 1024 * 1024) { setErr(tr("Fajl je veći od 25 MB.", pismo)); return; }
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!fac || !subj) return setErr(tr("Izaberi fakultet i predmet.", pismo));
    if (!file) return setErr(tr("Dodaj fajl.", pismo));
    if (title.trim().length < 2) return setErr(tr("Upiši naslov, na primer „Januar 2026, grupa A“.", pismo));
    const fd = new FormData();
    fd.set("fac", fac); fd.set("subject", subj); fd.set("kind", kind); fd.set("title", title.trim());
    if (year && kind !== "skripta") fd.set("year", year);
    if (note.trim()) fd.set("note", note.trim());
    fd.set("file", file);
    setBusy(true);
    try {
      const r = await fetch("/api/materials", { method: "POST", body: fd, credentials: "same-origin" });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) { router.push(`/prijava?next=${encodeURIComponent(`/dodaj?f=${fac}&p=${subj}`)}`); return; }
      if (!r.ok) throw new Error(errText(d, r.status));
      router.push(`/m/${d.id}?novo=1`);
      router.refresh();
    } catch (e2) { setErr((e2 as Error).message); setBusy(false); }
  };

  const years = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="fac">{tr("Fakultet", pismo)}</label>
        <select id="fac" className="select" value={fac} onChange={(e) => { setFac(e.target.value); setSubj(""); }}>
          <option value="">{tr("Izaberi fakultet", pismo)}</option>
          {faculties.filter((f) => f.subjects > 0).map((f) => <option key={f.slug} value={f.slug}>{tr(`${f.short}, ${f.name}`, pismo)}</option>)}
        </select>
      </div>

      {fac && (
        <div className="field">
          <label htmlFor="subj">{tr("Predmet", pismo)}</label>
          {chosen && subj ? (
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="badge badge-pen" style={{ height: 32, fontSize: 14 }}><Check />{tr(chosen.name, pismo)}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSubj("")}>{tr("Promeni", pismo)}</button>
            </div>
          ) : (
            <>
              <input id="subj" className="input" value={sq} onChange={(e) => setSq(e.target.value)} placeholder={tr("Počni da kucaš naziv predmeta", pismo)} />
              <div className="stack" style={{ gap: 6, maxHeight: 260, overflow: "auto" }}>
                {!detail && <span className="muted small">{tr("Učitavam predmete…", pismo)}</span>}
                {subjects.slice(0, 40).map((s) => (
                  <button key={s.slug} type="button" className="search-item" style={{ border: 0, background: "var(--bg-2)", textAlign: "left" }} onClick={() => setSubj(s.slug)}>
                    <span className="grow">{tr(s.name, pismo)}</span>
                    <span className="faint tiny">{tr(`${s.semester}. sem.`, pismo)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="field">
        <label>{tr("Šta dodaješ", pismo)}</label>
        <div className="seg" role="group">
          {KINDS.map((k) => (
            <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>{tr(k.label, pismo)}</button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="file">{tr("Fajl", pismo)}</label>
        <button type="button" className={`drop${file ? " has" : ""}`} onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}>
          <FileUp aria-hidden="true" />
          {file ? <><b>{file.name}</b><span className="small">{fmtSize(file.size)}</span></> : (
            <><b>{tr("Izaberi PDF ili fotografiju", pismo)}</b><span className="small">{tr("Do 25 MB. Sa telefona možeš odmah da slikaš rok.", pismo)}</span></>
          )}
        </button>
        <input ref={input} id="file" type="file" className="sr" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      <div className="field">
        <label htmlFor="title">{tr("Naslov", pismo)}</label>
        <input id="title" className="input" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)}
          placeholder={tr(kind === "skripta" ? "Na primer: Skripta za usmeni, sve teme" : "Na primer: Januar 2026, grupa A", pismo)} />
      </div>

      {kind !== "skripta" && (
        <div className="field">
          <label htmlFor="year">{tr("Godina", pismo)}</label>
          <select id="year" className="select" value={year} onChange={(e) => setYear(e.target.value)}>
            {years.map((y) => <option key={y} value={y}>{y}.</option>)}
            <option value="">{tr("Ne znam", pismo)}</option>
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="note">{tr("Napomena (nije obavezno)", pismo)}</label>
        <textarea id="note" className="textarea" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)}
          placeholder={tr("Na primer: rešenja su na kraju, zadatak 3 je bio na usmenom", pismo)} />
      </div>

      <div className="notice">
        <FileUp aria-hidden="true" />
        <span>{tr("Dodaj samo svoje beleške i rokove. Udžbenike i tuđe knjige ne objavljujemo.", pismo)}</span>
      </div>
      {err && <p className="err">{err}</p>}
      <button type="submit" className="btn btn-marker btn-block" disabled={busy}>{busy ? tr("Šaljem…", pismo) : tr("Objavi i dobij 10 poena", pismo)}</button>
    </form>
  );
}
