"use client";
import { useState } from "react";
import { Flag, Download, Maximize2 } from "lucide-react";
import { post } from "@/lib/client";
import { tr, type Pismo } from "@puskica/shared";

export function MaterialActions({ id, pdf, pismo }: { id: number; pdf: boolean; pismo: Pismo }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"" | "sent" | string>("");
  const send = async () => {
    try { await post(`/api/materials/${id}/report`, { reason: reason || "Bez opisa" }); setState("sent"); setOpen(false); }
    catch (e) { setState((e as Error).message); }
  };
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row wrap">
        <a href={`/api/files/${id}?download=1`} className="btn btn-marker"><Download />{tr("Preuzmi", pismo)}</a>
        {pdf && <a href={`/api/files/${id}`} target="_blank" rel="noopener" className="btn btn-ghost"><Maximize2 />{tr("Otvori ceo PDF", pismo)}</a>}
        <button type="button" className="btn btn-ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <Flag />{tr("Prijavi", pismo)}
        </button>
      </div>
      {open && (
        <div className="card pad form">
          <div className="field">
            <label htmlFor="reason">{tr("Šta nije u redu?", pismo)}</label>
            <select id="reason" className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">{tr("Izaberi razlog", pismo)}</option>
              <option value="Pogrešan predmet">{tr("Pogrešan predmet", pismo)}</option>
              <option value="Nečitko ili prazno">{tr("Nečitko ili prazno", pismo)}</option>
              <option value="Udžbenik ili autorsko delo">{tr("Udžbenik ili autorsko delo", pismo)}</option>
              <option value="Uvredljiv sadržaj">{tr("Uvredljiv sadržaj", pismo)}</option>
            </select>
          </div>
          <button type="button" className="btn btn-line" onClick={send} disabled={!reason}>{tr("Pošalji prijavu", pismo)}</button>
        </div>
      )}
      {state === "sent" && <p className="ok">{tr("Prijava je poslata. Hvala!", pismo)}</p>}
      {state && state !== "sent" && <p className="err">{state}</p>}
    </div>
  );
}
