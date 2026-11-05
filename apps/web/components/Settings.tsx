"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { setCookie } from "@/lib/client";
import type { Pismo } from "@puskica/shared";

export function PismoToggle({ pismo }: { pismo: Pismo }) {
  const r = useRouter();
  const set = (v: Pismo) => { setCookie("pismo", v); r.refresh(); };
  return (
    <div className="toggle" role="group" aria-label="Pismo">
      <button type="button" aria-pressed={pismo === "lat"} onClick={() => set("lat")}>Lat</button>
      <button type="button" aria-pressed={pismo === "cyr"} onClick={() => set("cyr")}>Ћир</button>
    </div>
  );
}

export function ThemeButton({ theme }: { theme: "dark" | "light" }) {
  const [t, setT] = useState(theme);
  const toggle = () => {
    const next = t === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    setCookie("tema", next);
    setT(next);
  };
  return (
    <button type="button" className="iconbtn" onClick={toggle} aria-label="Promeni temu">
      {t === "light" ? <Moon /> : <Sun />}
    </button>
  );
}
