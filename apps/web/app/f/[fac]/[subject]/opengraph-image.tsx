import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { nextRok, type SubjectFull } from "@puskica/shared";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;
const API = process.env.API_INTERNAL || "http://localhost:8710";

export default async function OG({ params }: { params: Promise<{ fac: string; subject: string }> }) {
  const { fac, subject } = await params;
  const [s, display, body] = await Promise.all([
    fetch(`${API}/api/subjects/${fac}/${subject}`, { next: { revalidate: 3600 } }).then((r) => (r.ok ? (r.json() as Promise<SubjectFull>) : null)).catch(() => null),
    readFile(path.join(process.cwd(), "assets/Unbounded.ttf")),
    readFile(path.join(process.cwd(), "assets/Onest.ttf")),
  ]);
  const name = s?.name ?? "Puškica";
  const rok = nextRok();
  const count = s?.materials.length ?? 0;
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: "#0e1430", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, fontFamily: "Onest", color: "#eef1fa" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: "#ffe14d", transform: "rotate(-14deg)", display: "flex" }} />
          <div style={{ fontFamily: "Unbounded", fontSize: 34 }}>Puškica</div>
          <div style={{ marginLeft: "auto", fontSize: 30, color: "#9aa3c7" }}>{s?.faculty.short ?? ""}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontFamily: "Unbounded", fontSize: name.length > 34 ? 58 : 72, lineHeight: 1.08, letterSpacing: -1 }}>{name}</div>
          <div style={{ fontSize: 32, color: "#9aa3c7" }}>Rokovi, kolokvijumi i skripte{count ? `: ${count} materijala` : ""}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28 }}>
          {rok && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#18214a", borderRadius: 999, padding: "10px 24px 10px 10px" }}>
              <div style={{ background: "#ffe14d", color: "#231d00", borderRadius: 999, padding: "8px 18px", fontFamily: "Unbounded", fontSize: 26 }}>{rok.days}</div>
              <div>{`dana do roka: ${rok.name}`}</div>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Unbounded", data: display, weight: 700 }, { name: "Onest", data: body, weight: 600 }] },
  );
}
