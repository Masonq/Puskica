import type { Metadata } from "next";
import { tr } from "@puskica/shared";
import { getPismo } from "@/lib/server";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Prijava", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [pismo, sp] = await Promise.all([getPismo(), searchParams]);
  return (
    <div className="auth-wrap">
      <h1 className="h1" style={{ textAlign: "center" }}>{tr("Prijava", pismo)}</h1>
      <p className="lead" style={{ textAlign: "center", marginInline: "auto", marginBottom: 22 }}>{tr("Dodaj materijale, ocenjuj predmete i skupljaj poene.", pismo)}</p>
      <AuthForm mode="login" next={sp.next ?? "/profil"} pismo={pismo} />
    </div>
  );
}
