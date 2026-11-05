"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="empty" style={{ marginTop: 40 }}>
      <h1 className="h2">Server trenutno ne odgovara</h1>
      <p>Pokušaj ponovo za nekoliko sekundi.</p>
      <button type="button" className="btn btn-marker" onClick={reset}>Pokušaj ponovo</button>
    </div>
  );
}
