import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Onest, Unbounded } from "next/font/google";
import { Search } from "lucide-react";
import { tr } from "@puskica/shared";
import { Logo } from "@/components/Logo";
import { SideNav, TabBar } from "@/components/Nav";
import { PismoToggle, ThemeButton } from "@/components/Settings";
import { getPismo, getTheme, INDEXABLE, SITE } from "@/lib/server";
import "./globals.css";

const onest = Onest({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--f-onest", display: "swap" });
const unbounded = Unbounded({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["700"], variable: "--f-unbounded", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Puškica — rokovi, kolokvijumi i skripte za studente", template: "%s | Puškica" },
  description: "Stari ispitni rokovi, kolokvijumi i skripte za svaki predmet na fakultetima u Srbiji. Besplatno, od studenata za studente.",
  applicationName: "Puškica",
  robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: { siteName: "Puškica", locale: "sr_RS", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0e1430" }, { media: "(prefers-color-scheme: light)", color: "#f2f4fa" }],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [pismo, theme] = await Promise.all([getPismo(), getTheme()]);
  return (
    <html lang={pismo === "cyr" ? "sr-Cyrl" : "sr-Latn"} data-theme={theme} className={`${onest.variable} ${unbounded.variable}`}>
      <body>
        <div className="shell">
          <aside className="side">
            <Link href="/" aria-label="Puškica, početna"><Logo /></Link>
            <SideNav pismo={pismo} />
            <div className="side-foot">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <PismoToggle pismo={pismo} />
                <ThemeButton theme={theme} />
              </div>
            </div>
          </aside>
          <div>
            <header className="topbar">
              <Link href="/" aria-label="Puškica, početna"><Logo /></Link>
              <div className="row" style={{ gap: 8 }}>
                <Link href="/pretraga" className="iconbtn" aria-label={tr("Pretraga", pismo)}><Search /></Link>
                <ThemeButton theme={theme} />
              </div>
            </header>
            <main className="main">
              {children}
              <footer className="footer">
                <div className="row wrap" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                  <span>{tr("Puškica koja te nauči.", pismo)}</span>
                  <PismoToggle pismo={pismo} />
                </div>
                <p>{tr("Materijale dodaju studenti. Udžbenike i tuđa autorska dela ne objavljujemo. Prijavi sporan materijal i uklonićemo ga.", pismo)}</p>
              </footer>
            </main>
          </div>
        </div>
        <TabBar pismo={pismo} />
      </body>
    </html>
  );
}
