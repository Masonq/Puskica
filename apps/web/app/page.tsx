import Link from "next/link";
import { Upload, Trophy, Sparkles } from "lucide-react";
import { tr, type Home } from "@puskica/shared";
import { api, getPismo } from "@/lib/server";
import { SearchBox } from "@/components/Search";
import { FacultyCard, MaterialItem, RokChip } from "@/components/Bits";

export const revalidate = 60;

export default async function HomePage() {
  const [pismo, data] = await Promise.all([getPismo(), api<Home>("/api/home")]);
  const facs = data?.faculties ?? [];
  const live = facs.filter((f) => f.subjects > 0).sort((a, b) => b.subjects - a.subjects);
  const rest = facs.filter((f) => f.subjects === 0);

  return (
    <>
      <section className="hero">
        <h1 className="h1">{tr("Svaki stari rok, za svaki predmet.", pismo)}</h1>
        <p className="lead">
          {tr("Ispitni rokovi, kolokvijumi i skripte sa tvog fakulteta na jednom mestu. Studenti dodaju, svi uče. Besplatno.", pismo)}
        </p>
        <div className="hero-strip"><SearchBox pismo={pismo} /></div>
        <RokChip pismo={pismo} />
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="h2">{tr("Fakulteti", pismo)}</h2>
          <Link href="/fakulteti">{tr("Svi fakulteti", pismo)}</Link>
        </div>
        <div className="fac-grid">
          {live.map((f, i) => <FacultyCard key={f.slug} f={f} pismo={pismo} big={i < 2} />)}
          {rest.slice(0, live.length ? 6 : 12).map((f) => <FacultyCard key={f.slug} f={f} pismo={pismo} />)}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2 className="h2">{tr("Najnoviji materijali", pismo)}</h2></div>
        {data && data.latest.length > 0 ? (
          <div className="stack">{data.latest.map((m) => <MaterialItem key={m.id} m={m} pismo={pismo} showSubject />)}</div>
        ) : (
          <div className="empty">
            <Upload aria-hidden="true" />
            <p>{tr("Još nema materijala. Imaš stari rok ili skriptu na telefonu? Dodaj je za minut i dobij prve poene.", pismo)}</p>
            <Link href="/dodaj" className="btn btn-marker">{tr("Dodaj materijal", pismo)}</Link>
          </div>
        )}
      </section>

      <section className="section" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div className="card pad">
          <h3 className="h3 row"><Trophy width={18} height={18} className="faint" />{tr("Koji fakultet najviše pomaže", pismo)}</h3>
          {data && data.leaderboard.length > 0 ? (
            <div className="lb" style={{ marginTop: 14 }}>
              {data.leaderboard.slice(0, 5).map((r, i) => (
                <Link key={r.slug} href={`/f/${r.slug}`} className="lb-row">
                  <span className="lb-pos">{i + 1}</span>
                  <span className="grow ellipsis"><b>{r.short}</b> <span className="muted small">{tr(r.name, pismo)}</span></span>
                  <span className="badge badge-marker">{r.points}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted small" style={{ margin: "10px 0 0" }}>{tr("Rang lista se puni poenima studenata. Prvi koji dodaju materijale stavljaju svoj fakultet na vrh.", pismo)}</p>
          )}
        </div>
        <div className="card pad ai-card">
          <h3 className="h3"><Sparkles />{tr("Poeni otključavaju AI", pismo)}</h3>
          <p className="muted small" style={{ margin: "10px 0 14px" }}>
            {tr("Za svaki dodat materijal dobijaš 10 poena, a za svako preuzimanje još jedan. Poenima uskoro otključavaš AI tutora koji objašnjava zadatke iz rokova.", pismo)}
          </p>
          <Link href="/ai" className="btn btn-ghost btn-sm">{tr("Kako radi AI tutor", pismo)}</Link>
        </div>
      </section>
    </>
  );
}
