import type { Metadata } from "next";
import { tr, type Home } from "@puskica/shared";
import { api, getPismo } from "@/lib/server";
import { FacultyCard } from "@/components/Bits";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Fakulteti Univerziteta u Beogradu",
  description: "Izaberi fakultet i pronađi stare rokove, kolokvijume i skripte za svoje predmete.",
  alternates: { canonical: "/fakulteti" },
};

export default async function Faculties() {
  const [pismo, data] = await Promise.all([getPismo(), api<Home>("/api/home")]);
  const facs = [...(data?.faculties ?? [])].sort((a, b) => b.subjects - a.subjects || a.name.localeCompare(b.name, "sr"));
  return (
    <>
      <h1 className="h1">{tr("Fakulteti", pismo)}</h1>
      <p className="lead">{tr("Univerzitet u Beogradu. Novi Sad, Niš i Kragujevac dolaze sledeći.", pismo)}</p>
      <div className="fac-grid" style={{ marginTop: 24 }}>
        {facs.map((f) => <FacultyCard key={f.slug} f={f} pismo={pismo} />)}
      </div>
    </>
  );
}
