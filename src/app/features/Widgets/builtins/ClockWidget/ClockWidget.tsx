import { useEffect, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}


export default function ClockWidgetMock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 140,
        height: 48,
        padding: "0 20px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.35)",
        border: "1px solid rgba(255,255,255,0.35)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        backdropFilter: "blur(14px)",
        color: "#111",
        fontWeight: 700,
        fontSize: 19,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {h}:{m}:{s}
    </div>
  );
}