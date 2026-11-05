import type { Metadata } from "next";
import { tr, type Home } from "@puskica/shared";
import { api, getPismo } from "@/lib/server";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Napravi nalog", robots: { index: false } };

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [pismo, sp, data] = await Promise.all([getPismo(), searchParams, api<Home>("/api/home")]);
  return (
    <div className="auth-wrap">
      <h1 className="h1" style={{ textAlign: "center" }}>{tr("Napravi nalog", pismo)}</h1>
      <p className="lead" style={{ textAlign: "center", marginInline: "auto", marginBottom: 22 }}>{tr("Bez mejla i broja telefona. Samo korisničko ime i lozinka.", pismo)}</p>
      <AuthForm mode="register" next={sp.next ?? "/profil"} faculties={data?.faculties ?? []} pismo={pismo} />
    </div>
  );
}
