import { useEffect, useState } from "react";

type WidgetSize = "small" | "medium" | "large" | "wide";

type Props = {
  size: WidgetSize;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function ClockWidget({ size }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());

  // Size-based styling
  const fontSize =
    size === "small" ? 18 :
    size === "medium" ? 26 :
    size === "large" ? 40 :
    24;

  const padding =
    size === "small" ? "0 16px" :
    size === "medium" ? "0 24px" :
    size === "large" ? "0 32px" :
    "0 28px";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "70%",
          padding,
          borderRadius: 999,
          background: "rgba(255,255,255,0.35)",
          border: "1px solid rgba(255,255,255,0.35)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          backdropFilter: "blur(14px)",
          color: "#111",
          fontWeight: 700,
          fontSize,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {h}:{m}:{s}
      </div>
    </div>
  );
}