import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { tr, type Home } from "@puskica/shared";
import { api, getPismo, isLoggedIn } from "@/lib/server";
import { UploadForm } from "@/components/UploadForm";

export const metadata: Metadata = { title: "Dodaj materijal", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Dodaj({ searchParams }: { searchParams: Promise<{ f?: string; p?: string }> }) {
  const sp = await searchParams;
  if (!(await isLoggedIn())) {
    const next = `/dodaj${sp.f ? `?f=${sp.f}${sp.p ? `&p=${sp.p}` : ""}` : ""}`;
    redirect(`/prijava?next=${encodeURIComponent(next)}`);
  }
  const [pismo, data] = await Promise.all([getPismo(), api<Home>("/api/home")]);
  return (
    <div style={{ maxWidth: 620 }}>
      <h1 className="h1">{tr("Dodaj materijal", pismo)}</h1>
      <p className="lead">{tr("Rok, kolokvijum ili skripta. Za svaki dodat materijal dobijaš 10 poena, a za svako preuzimanje još jedan.", pismo)}</p>
      <div style={{ marginTop: 24 }}>
        <UploadForm faculties={data?.faculties ?? []} initFac={sp.f} initSubj={sp.p} pismo={pismo} />
      </div>
    </div>
  );
}
