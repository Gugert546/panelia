import { useEffect, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());

  return (
    <WidgetContainer>
      <WidgetPane title="">
        <div
          style={{
            containerType: "inline-size",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: "20cqw",
              fontVariantNumeric: "tabular-nums"
            }}
          >
            {h}:{m}:{s}
          </span>
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}