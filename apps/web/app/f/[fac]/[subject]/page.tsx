import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { godina, tr, type SubjectFull } from "@puskica/shared";
import { api, getPismo, isLoggedIn } from "@/lib/server";
import { Crumbs } from "@/components/Bits";
import { Difficulty, UploadLink } from "@/components/SubjectActions";
import { MaterialsList } from "@/components/MaterialsList";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ fac: string; subject: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { fac, subject } = await params;
  const s = await api<SubjectFull>(`/api/subjects/${fac}/${subject}`, { revalidate: 300 });
  if (!s) return {};
  const title = `${s.name} (${s.faculty.short}): rokovi, kolokvijumi, skripte`;
  return {
    title,
    description: `Stari ispitni rokovi, kolokvijumi i skripte za predmet ${s.name} na ${s.faculty.name}. ${s.materials.length} materijala, besplatno.`,
    alternates: { canonical: `/f/${fac}/${subject}` },
    openGraph: { title, type: "article" },
  };
}

export default async function SubjectPage({ params }: P) {
  const { fac, subject } = await params;
  const [pismo, s, loggedIn] = await Promise.all([getPismo(), api<SubjectFull>(`/api/subjects/${fac}/${subject}`, { auth: true }), isLoggedIn()]);
  if (!s) notFound();
  const sems = Array.from(new Set(s.programs.map((p) => p.semester))).sort();
  const progNames = s.programs.map((p) => p.name);

  return (
    <>
      <Crumbs pismo={pismo} items={[{ href: "/fakulteti", label: "Fakulteti" }, { href: `/f/${s.faculty.slug}`, label: s.faculty.short }, { label: s.name }]} />
      <div className="page-head">
        <div>
          <h1 className="h1" style={{ maxWidth: "22ch" }}>{tr(s.name, pismo)}</h1>
          <div className="facts">
            {s.espb != null && <span className="badge badge-pen">{s.espb} ESPB</span>}
            {sems.length > 0 && <span className="badge">{tr(`${godina(sems[0])}. godina, ${sems.join(" i ")}. semestar`, pismo)}</span>}
            {s.hours && <span className="badge" title={tr("Predavanja + vežbe + laboratorija, časova nedeljno", pismo)}>{s.hours}</span>}
            {s.code && <span className="badge">{s.code}</span>}
          </div>
        </div>
        <UploadLink fac={fac} slug={subject} pismo={pismo} />
      </div>

      <div className="subject-layout">
        <MaterialsList items={s.materials} fac={fac} slug={subject} pismo={pismo} />
        <aside className="aside">
          <Difficulty fac={fac} slug={subject} init={s.difficulty} loggedIn={loggedIn} pismo={pismo} />
          <div className="card pad ai-card">
            <h2 className="h3"><Sparkles />{tr("AI tutor za ovaj predmet", pismo)}</h2>
            <p className="muted small" style={{ margin: "8px 0 0" }}>
              {tr("Uskoro: test od starih rokova, objašnjenje zadatka korak po korak i provera tvog rešenja sa fotografije.", pismo)}
            </p>
          </div>
          {progNames.length > 0 && (
            <div className="card pad">
              <h2 className="h3">{tr("Na programima", pismo)}</h2>
              <div className="stack" style={{ gap: 6, marginTop: 10 }}>
                {progNames.map((n) => <span key={n} className="small muted">{tr(n, pismo)}</span>)}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
