import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { tr, type Material, type Me } from "@puskica/shared";
import { api, getPismo } from "@/lib/server";
import { MaterialItem } from "@/components/Bits";
import { LogoutButton } from "@/components/Logout";
import { PismoToggle } from "@/components/Settings";

export const metadata: Metadata = { title: "Profil", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Profile() {
  const [pismo, me] = await Promise.all([getPismo(), api<Me>("/api/me", { auth: true })]);
  if (!me) redirect("/prijava?next=/profil");
  const mats = (await api<Material[]>("/api/me/materials", { auth: true })) ?? [];
  const visible = mats.filter((m) => !m.hidden);
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">@{me.username}</h1>
          <div className="facts">
            {me.faculty ? <Link href={`/f/${me.faculty.slug}`} className="badge badge-pen">{tr(me.faculty.name, pismo)}</Link> : <span className="badge">{tr("Fakultet nije izabran", pismo)}</span>}
          </div>
        </div>
        <div className="row"><PismoToggle pismo={pismo} /><LogoutButton label={tr("Odjavi se", pismo)} /></div>
      </div>
      <div className="stat-row">
        <div className="stat"><b>{me.points}</b><span>{tr("poena", pismo)}</span></div>
        <div className="stat"><b>{me.uploads}</b><span>{tr("materijala", pismo)}</span></div>
        <div className="stat"><b>{visible.reduce((a, m) => a + m.downloads, 0)}</b><span>{tr("preuzimanja", pismo)}</span></div>
      </div>
      <section className="section">
        <div className="section-head">
          <h2 className="h2">{tr("Moji materijali", pismo)}</h2>
          <Link href="/dodaj">{tr("Dodaj novi", pismo)}</Link>
        </div>
        {visible.length ? (
          <div className="stack">{visible.map((m) => <MaterialItem key={m.id} m={m} pismo={pismo} showSubject />)}</div>
        ) : (
          <div className="empty"><p>{tr("Još nisi dodao nijedan materijal. Prvi rok ti donosi 10 poena.", pismo)}</p><Link href="/dodaj" className="btn btn-marker">{tr("Dodaj materijal", pismo)}</Link></div>
        )}
      </section>
    </>
  );
}
