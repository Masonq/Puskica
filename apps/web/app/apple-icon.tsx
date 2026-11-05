import { ImageResponse } from "next/og";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, background: "#0e1430", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="120" height="120" viewBox="0 0 32 32">
          <g transform="rotate(-14 16 16)">
            <rect x="9" y="3" width="14" height="26" rx="4" fill="#ffe14d" />
            <path d="M12.5 12.5h7M12.5 16h5" stroke="#231d00" strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12.2 24.2 16 20.4l3.8 3.8" fill="none" stroke="#231d00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
