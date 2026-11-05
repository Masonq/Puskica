"use client";
import { LogOut } from "lucide-react";
import { post } from "@/lib/client";
export function LogoutButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await post("/api/auth/logout", {}); window.location.assign("/"); }}>
      <LogOut />{label}
    </button>
  );
}
