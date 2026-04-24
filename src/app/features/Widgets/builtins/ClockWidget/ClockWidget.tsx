import { useEffect, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useResolvedWidgetFontSize } from "../../hooks/useResolvedWidgetFontSize";

// Legger til ledende null for enkeltsifrede tall (f.eks. 9 → "09")
function pad(n: number) {
  return String(n).padStart(2, "0");
}

type ClockWidgetProps = {
  mode?: "digital" | "analog";
};

export default function ClockWidget({ mode = "digital" }: ClockWidgetProps) {
  const [now, setNow] = useState(new Date());
  const fontSize = useResolvedWidgetFontSize();

  // Oppdaterer klokkeslettet hvert sekund
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Henter time, minutt og sekund én gang og gjenbruker for både digital og analog visning
  const hours24 = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  // Formaterte strenger for digital visning
  const h = pad(hours24);
  const m = pad(minutes);
  const s = pad(seconds);

  // Konverterer til 12-timersformat for analoge vinkler
  const hours = hours24 % 12;

  // Beregner rotasjonsvinkler for viserne (grader)
  const hourAngle = hours * 30 + minutes * 0.5 + seconds * (0.5 / 60);
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const secondAngle = seconds * 6;

  // Hjelpefunksjon som returnerer stilobjekt for en viser.
  // Dreiepunktet er 2px fra bunnen av elementet, og translateY kompenserer for dette
  // slik at viserne roterer nøyaktig rundt sentermarkøren.

  const handStyle = (angle: number, length: string, thickness: number, color: string) => ({
    position: "absolute" as const,
    left: "50%",
    top: "50%",
    width: thickness,
    height: length,
    borderRadius: 999,
    background: color,
    transformOrigin: "50% calc(100% - 2px)",
    transform: `translate(-50%, calc(-100% + 2px)) rotate(${angle}deg)`,
  });

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
          {mode === "analog" ? (
            // Analog urskive – rektangulær form for å passe widgetens proporsjoner
            <div
              style={{
                width: "96%",
                height: "90%",
                borderRadius: 16,
                border: "1.5px solid rgba(255,255,255,0.5)",
                background:
                  "linear-gradient(160deg, rgba(255,255,255,0.2), rgba(255,255,255,0.06))",
                boxShadow: "inset 0 1px 10px rgba(0,0,0,0.28)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* 12 timemerker – større for hvert kvartal (3, 6, 9, 12) */}
              {[...Array(12)].map((_, index) => {
                const angle = index * 30;
                const isMajor = index % 3 === 0;
                return (
                  // Roterer hele wrapper-elementet rundt senterets origo
                  <div
                    key={index}
                    style={{
                      position: "absolute",
                      inset: 0,
                      transform: `rotate(${angle}deg)`,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: isMajor ? "11%" : "13%",
                        width: isMajor ? 3 : 2,
                        height: isMajor ? "12%" : "8%",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.8)",
                        transform: "translateX(-50%)",
                      }}
                    />
                  </div>
                );
              })}

              {/* Visere: time, minutt, sekund */}
              <div style={handStyle(hourAngle, "24%", 5, "#f7f7f7")} />
              <div style={handStyle(minuteAngle, "34%", 3, "#f0f0f0")} />
              <div style={handStyle(secondAngle, "38%", 2, "#ff8d8d")} />

              {/* Senterpunkt som dekker visernes rotasjonspunkt */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "#ffffff",
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>
          ) : (
            // Digital visning – skalerer med container-bredden via cqw
            <span
              style={{
                fontWeight: 700,
                fontSize: `clamp(${Math.max(fontSize * 2.4, 28)}px, 20cqw, ${Math.max(fontSize * 4.2, 56)}px)`,
                fontVariantNumeric: "tabular-nums"
              }}
            >
              {h}:{m}:{s}
            </span>
          )}
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}