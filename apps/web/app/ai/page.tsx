import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, ListChecks, Camera, MessageCircleQuestion } from "lucide-react";
import { tr } from "@puskica/shared";
import { getPismo } from "@/lib/server";

export const metadata: Metadata = { title: "AI tutor", description: "AI tutor koji uči iz starih rokova tvog predmeta." };

export default async function AI() {
  const pismo = await getPismo();
  const items = [
    { icon: ListChecks, t: "Test od starih rokova", d: "Izaberi predmet, a tutor složi probni ispit od zadataka koji su stvarno dolazili." },
    { icon: MessageCircleQuestion, t: "Objašnjenje korak po korak", d: "Zapeo si na zadatku iz roka? Tutor ga rastavi na korake tvojim jezikom." },
    { icon: Camera, t: "Provera rešenja sa slike", d: "Slikaj svoje rešenje, tutor nađe gde je greška." },
  ];
  return (
    <div style={{ maxWidth: 720 }}>
      <span className="badge badge-pen"><Sparkles />{tr("Uskoro", pismo)}</span>
      <h1 className="h1" style={{ marginTop: 14 }}>{tr("AI tutor koji je video sve rokove", pismo)}</h1>
      <p className="lead">{tr("Uči iz materijala koje studenti dodaju za svaki predmet. Što više rokova, to pametniji tutor.", pismo)}</p>
      <div className="stack" style={{ marginTop: 24 }}>
        {items.map((it) => (
          <div key={it.t} className="card pad row" style={{ alignItems: "flex-start", gap: 14 }}>
            <span className="subj-espb" style={{ width: 44 }}><it.icon width={20} height={20} /></span>
            <div><h2 className="h3">{tr(it.t, pismo)}</h2><p className="muted small" style={{ margin: "4px 0 0" }}>{tr(it.d, pismo)}</p></div>
          </div>
        ))}
      </div>
      <div className="row wrap" style={{ marginTop: 22 }}>
        <Link href="/dodaj" className="btn btn-marker">{tr("Dodaj rok i skupljaj poene", pismo)}</Link>
      </div>
    </div>
  );
}
