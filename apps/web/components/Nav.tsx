"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LibraryBig, Plus, Sparkles, UserRound, Search } from "lucide-react";
import { tr, type Pismo } from "@puskica/shared";

const items = [
  { href: "/", label: "Početna", icon: Home, match: (p: string) => p === "/" },
  { href: "/fakulteti", label: "Predmeti", icon: LibraryBig, match: (p: string) => p.startsWith("/fakulteti") || p.startsWith("/f/") },
  { href: "/ai", label: "AI", icon: Sparkles, match: (p: string) => p.startsWith("/ai") },
  { href: "/profil", label: "Profil", icon: UserRound, match: (p: string) => p.startsWith("/profil") || p.startsWith("/prijava") || p.startsWith("/registracija") },
];

export function SideNav({ pismo }: { pismo: Pismo }) {
  const p = usePathname();
  return (
    <nav className="stack" style={{ gap: 4 }} aria-label="Glavna navigacija">
      {[items[0], { href: "/pretraga", label: "Pretraga", icon: Search, match: (x: string) => x.startsWith("/pretraga") }, ...items.slice(1)].map((it) => (
        <Link key={it.href} href={it.href} className="navlink" aria-current={it.match(p) ? "page" : undefined}>
          <it.icon strokeWidth={2} />
          {tr(it.label, pismo)}
        </Link>
      ))}
      <Link href="/dodaj" className="btn btn-marker upload-cta">
        <Plus strokeWidth={2.4} /> {tr("Dodaj materijal", pismo)}
      </Link>
    </nav>
  );
}

export function TabBar({ pismo }: { pismo: Pismo }) {
  const p = usePathname();
  const tab = (it: (typeof items)[number]) => (
    <Link key={it.href} href={it.href} className="tab" aria-current={it.match(p) ? "page" : undefined}>
      <it.icon strokeWidth={it.match(p) ? 2.4 : 2} />
      <span>{tr(it.label, pismo)}</span>
    </Link>
  );
  return (
    <nav className="tabbar" aria-label="Navigacija">
      {tab(items[0])}
      {tab(items[1])}
      <Link href="/dodaj" className="tab" aria-label={tr("Dodaj materijal", pismo)}>
        <span className="tab-plus"><Plus strokeWidth={2.6} /></span>
      </Link>
      {tab(items[2])}
      {tab(items[3])}
    </nav>
  );
}
