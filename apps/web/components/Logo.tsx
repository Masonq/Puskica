export function LogoMark({ className = "logo-mark" }: { className?: string }) {
  // свёрнутая полоска-пушкица со стрелкой вверх («položio»)
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <g transform="rotate(-14 16 16)">
        <rect x="9" y="3" width="14" height="26" rx="4" fill="var(--marker)" />
        <path d="M9 7.5h14" stroke="var(--marker-ink)" strokeOpacity=".25" strokeWidth="1.4" />
        <path d="M12.5 12.5h7M12.5 16h5" stroke="var(--marker-ink)" strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12.2 24.2 16 20.4l3.8 3.8" fill="none" stroke="var(--marker-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo-word">Puškica</span>
    </span>
  );
}
