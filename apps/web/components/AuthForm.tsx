"use client";
import Link from "next/link";
import { useState } from "react";
import { post } from "@/lib/client";
import { tr, type FacultyBrief, type Pismo } from "@puskica/shared";

export function AuthForm({ mode, next, faculties = [], pismo }: { mode: "login" | "register"; next: string; faculties?: FacultyBrief[]; pismo: Pismo }) {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [faculty, setF] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/profil";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await post(`/api/auth/${mode}`, { username: username.trim(), password, faculty: faculty || null });
      window.location.assign(safeNext);
    } catch (e2) { setErr((e2 as Error).message); setBusy(false); }
  };

  return (
    <form className="form card pad" onSubmit={submit}>
      <div className="field">
        <label htmlFor="u">{tr("Korisničko ime", pismo)}</label>
        <input id="u" className="input" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setU(e.target.value)} required minLength={3} maxLength={24} />
      </div>
      <div className="field">
        <label htmlFor="p">{tr("Lozinka", pismo)}</label>
        <input id="p" className="input" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setP(e.target.value)} required minLength={6} />
      </div>
      {mode === "register" && (
        <div className="field">
          <label htmlFor="f">{tr("Tvoj fakultet", pismo)}</label>
          <select id="f" className="select" value={faculty} onChange={(e) => setF(e.target.value)}>
            <option value="">{tr("Izaberi kasnije", pismo)}</option>
            {faculties.map((f) => <option key={f.slug} value={f.slug}>{tr(`${f.short}, ${f.name}`, pismo)}</option>)}
          </select>
          <span className="faint tiny">{tr("Tvoji poeni idu i na rang listu fakulteta.", pismo)}</span>
        </div>
      )}
      {err && <p className="err">{err}</p>}
      <button type="submit" className="btn btn-marker btn-block" disabled={busy}>
        {busy ? tr("Sačekaj…", pismo) : tr(mode === "login" ? "Prijavi se" : "Napravi nalog", pismo)}
      </button>
      <p className="muted small" style={{ margin: 0, textAlign: "center" }}>
        {mode === "login" ? (
          <>{tr("Nemaš nalog?", pismo)} <Link href={`/registracija?next=${encodeURIComponent(safeNext)}`} style={{ color: "var(--pen)", fontWeight: 600 }}>{tr("Napravi ga", pismo)}</Link></>
        ) : (
          <>{tr("Već imaš nalog?", pismo)} <Link href={`/prijava?next=${encodeURIComponent(safeNext)}`} style={{ color: "var(--pen)", fontWeight: 600 }}>{tr("Prijavi se", pismo)}</Link></>
        )}
      </p>
    </form>
  );
}
