import { useEffect, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";

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

  const fontSize =
    size === "small" ? 18 :
    size === "medium" ? 28 :
    size === "large" ? 42 :
    28;

  return (
    <WidgetContainer size={size}>
      <WidgetPane title="">
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {h}:{m}:{s}
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}