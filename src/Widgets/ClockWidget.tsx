import { useEffect, useState } from "react";
import type { WidgetComponentProps } from "../WidgetRegistry";

type Props = WidgetComponentProps & {
  onRemove?: () => void;
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function ClockWidget({ onRemove }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = now.getHours();
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid #d1d5db",
        background: "#f5f5f5",
        fontSize: 14,
        fontWeight: 500,
        color: "#111",
      }}
    >
      <span>
        {hour12}:{m}:{s}
      </span>

      <span style={{ fontSize: 12, opacity: 0.7 }}>{ampm}</span>

      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Fjern klokke"
          style={{
            marginLeft: 6,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 14,
            opacity: 0.6,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
