import Link from "next/link";
import { tr } from "@puskica/shared";
import { getPismo } from "@/lib/server";

export default async function NotFound() {
  const pismo = await getPismo();
  return (
    <div className="empty" style={{ marginTop: 40 }}>
      <h1 className="h2">{tr("Ova stranica ne postoji", pismo)}</h1>
      <p>{tr("Možda je predmet preimenovan ili je link pogrešan. Potraži ga preko pretrage.", pismo)}</p>
      <div className="row wrap" style={{ justifyContent: "center" }}>
        <Link href="/pretraga" className="btn btn-marker">{tr("Pretraži predmete", pismo)}</Link>
        <Link href="/" className="btn btn-ghost">{tr("Na početnu", pismo)}</Link>
      </div>
    </div>
  );
}
