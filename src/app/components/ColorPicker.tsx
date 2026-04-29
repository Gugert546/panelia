import { useRef, useEffect, useCallback, useState } from "react";

interface Props {
  value: string;
  onChange: (hex: string) => void;
  onClose?: () => void;
  autoFocus?: boolean;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function hexToHsv(hex: string): [number, number, number] {
  const clean = (hex.startsWith("#") ? hex.slice(1) : hex).padEnd(6, "0");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min, vv = max, sv = max === 0 ? 0 : d / max;
  let hh = 0;
  if (d !== 0) {
    if (max === r) hh = ((g - b) / d + 6) % 6;
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60;
  }
  return [hh, sv * 100, vv * 100];
}

function hsvToHex(h: number, s: number, v: number): string {
  const sv = s / 100, vv = v / 100;
  const c = vv * sv, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = vv - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const to2 = (n: number) =>
    clamp(Math.round((n + m) * 255), 0, 255).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

export function ColorPicker({ value, onChange, onClose, autoFocus }: Props) {
  const gradientRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const draggingGradient = useRef(false);
  const draggingHue = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Intern HSV-tilstand — renderer fra mus direkte, ingen hex-roundtrip drift
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(value));
  // Ref-speil så callbacks alltid ser siste HSV uten å bli nye instanser
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const [h, s, v] = hsv;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [focused, setFocused] = useState<"gradient" | "hue" | "close">("gradient");
  const [activeControl, setActiveControlState] = useState<"gradient" | "hue" | null>(null);
  const activeControlRef = useRef<"gradient" | "hue" | null>(null);
  const setActiveControl = useCallback((val: "gradient" | "hue" | null) => {
    activeControlRef.current = val;
    setActiveControlState(val);
  }, []);

  useEffect(() => {
    if (autoFocus) requestAnimationFrame(() => gradientRef.current?.focus());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable commit — ingen deps, registreres aldri på nytt
  const commit = useCallback((newHsv: [number, number, number]) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      onChangeRef.current(hsvToHex(newHsv[0], newHsv[1], newHsv[2]));
    });
  }, []);

  const updateGradient = useCallback((clientX: number, clientY: number) => {
    if (!gradientRef.current) return;
    const rect = gradientRef.current.getBoundingClientRect();
    const newS = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const newV = clamp((1 - (clientY - rect.top) / rect.height) * 100, 0, 100);
    const next: [number, number, number] = [hsvRef.current[0], newS, newV];
    hsvRef.current = next;
    setHsv(next);
    commit(next);
  }, [commit]);

  const updateHue = useCallback((clientX: number) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const newH = clamp(((clientX - rect.left) / rect.width) * 360, 0, 359);
    const next: [number, number, number] = [newH, hsvRef.current[1], hsvRef.current[2]];
    hsvRef.current = next;
    setHsv(next);
    commit(next);
  }, [commit]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (draggingGradient.current) updateGradient(e.clientX, e.clientY);
      if (draggingHue.current) updateHue(e.clientX);
    };
    const onMouseUp = () => {
      draggingGradient.current = false;
      draggingHue.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [updateGradient, updateHue]);

  const handleGradientKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key.startsWith("Arrow")) e.preventDefault();
    const step = e.shiftKey ? 10 : 2;
    if (activeControlRef.current === "gradient") {
      const [ch, cs, cv] = hsvRef.current;
      if (e.key === "ArrowRight") { e.preventDefault(); const next: [number,number,number] = [ch, clamp(cs + step, 0, 100), cv]; hsvRef.current = next; setHsv(next); onChangeRef.current(hsvToHex(...next)); return; }
      if (e.key === "ArrowLeft")  { e.preventDefault(); const next: [number,number,number] = [ch, clamp(cs - step, 0, 100), cv]; hsvRef.current = next; setHsv(next); onChangeRef.current(hsvToHex(...next)); return; }
      if (e.key === "ArrowUp")    { e.preventDefault(); const next: [number,number,number] = [ch, cs, clamp(cv + step, 0, 100)]; hsvRef.current = next; setHsv(next); onChangeRef.current(hsvToHex(...next)); return; }
      if (e.key === "ArrowDown")  { e.preventDefault(); const next: [number,number,number] = [ch, cs, clamp(cv - step, 0, 100)]; hsvRef.current = next; setHsv(next); onChangeRef.current(hsvToHex(...next)); return; }
      if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); setActiveControl(null); return; }
    } else {
      if (e.key === "Enter")     { e.preventDefault(); setActiveControl("gradient"); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setFocused("hue"); hueRef.current?.focus(); return; }
      if (e.key === "Escape")    { e.preventDefault(); onClose?.(); return; }
    }
  };

  const handleHueKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key.startsWith("Arrow")) e.preventDefault();
    const step = e.shiftKey ? 10 : 2;
    if (activeControlRef.current === "hue") {
      const [ch, cs, cv] = hsvRef.current;
      if (e.key === "ArrowRight") { e.preventDefault(); const next: [number,number,number] = [clamp(ch + step, 0, 359), cs, cv]; hsvRef.current = next; setHsv(next); onChangeRef.current(hsvToHex(...next)); return; }
      if (e.key === "ArrowLeft")  { e.preventDefault(); const next: [number,number,number] = [clamp(ch - step, 0, 359), cs, cv]; hsvRef.current = next; setHsv(next); onChangeRef.current(hsvToHex(...next)); return; }
      if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); setActiveControl(null); return; }
    } else {
      if (e.key === "Enter")     { e.preventDefault(); setActiveControl("hue"); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setFocused("gradient"); gradientRef.current?.focus(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setFocused("close"); closeRef.current?.focus(); return; }
      if (e.key === "Escape")    { e.preventDefault(); onClose?.(); return; }
    }
  };

  const focusRing  = "2px solid #3b82f6";
  const activeRing = "2px solid #f97316";
  const gradientOutline = activeControl === "gradient" ? activeRing : focused === "gradient" ? focusRing : "none";
  const hueOutline      = activeControl === "hue"      ? activeRing : focused === "hue"      ? focusRing : "none";
  const closeOutline    = focused === "close" ? focusRing : "none";

  // Klemmer sirkelposisjonen innenfor gradient-boksen uten overflow:hidden
  const HALF = 6.5;
  const circleLeft = `clamp(${HALF}px, ${s}%, calc(100% - ${HALF}px))`;
  const circleTop  = `clamp(${HALF}px, ${100 - v}%, calc(100% - ${HALF}px))`;

  return (
    <div
      style={{
        display: "flex", flexDirection: "column", gap: 8,
        padding: 10, background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(12px)", borderRadius: 12,
        boxShadow: "0 6px 28px rgba(0,0,0,0.28)", width: 220, marginTop: 6,
      }}
    >
      {/* Gradient (metning + lysstyrke) */}
      <div
        ref={gradientRef}
        tabIndex={0}
        role="slider"
        aria-label={activeControl === "gradient" ? "Aktiv – piltaster justerer, Enter/Esc ferdig" : "Metning/lysstyrke – Enter for å redigere"}
        onMouseDown={(e) => {
          e.preventDefault();
          draggingGradient.current = true;
          updateGradient(e.clientX, e.clientY);
          gradientRef.current?.focus();
        }}
        onKeyDown={handleGradientKeyDown}
        onFocus={() => setFocused("gradient")}
        style={{
          position: "relative", height: 130, borderRadius: 7,
          userSelect: "none", cursor: "crosshair",
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${Math.round(h)}, 100%, 50%))`,
          outline: gradientOutline, outlineOffset: 1,
        }}
      >
        <div style={{
          position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center",
          fontSize: 10, color: "rgba(255,255,255,0.9)",
          textShadow: "0 1px 2px rgba(0,0,0,0.8)", pointerEvents: "none",
        }}>
          {activeControl === "gradient"
            ? "← → ↑ ↓  ·  Enter/Esc ferdig"
            : focused === "gradient"
              ? "Enter for å redigere  ·  ↓ neste"
              : ""}
        </div>
        <div style={{
          position: "absolute",
          left: circleLeft, top: circleTop,
          width: 13, height: 13, borderRadius: "50%",
          pointerEvents: "none",
          border: `2px solid ${v > 50 ? "rgba(0,0,0,0.7)" : "white"}`,
          boxShadow: activeControl === "gradient"
            ? "0 0 0 3px #f97316, 0 0 0 4px rgba(255,255,255,0.5)"
            : "0 0 0 1px rgba(128,128,128,0.3)",
          transform: "translate(-50%, -50%)",
        }} />
      </div>

      {/* Fargetone-strip */}
      <div
        ref={hueRef}
        tabIndex={0}
        role="slider"
        aria-label={activeControl === "hue" ? "Aktiv – piltaster justerer fargetone, Enter/Esc ferdig" : "Fargetone – Enter for å redigere"}
        onMouseDown={(e) => {
          e.preventDefault();
          draggingHue.current = true;
          updateHue(e.clientX);
          hueRef.current?.focus();
        }}
        onKeyDown={handleHueKeyDown}
        onFocus={() => setFocused("hue")}
        style={{
          position: "relative", height: 14, borderRadius: 7,
          cursor: "pointer", userSelect: "none",
          background: "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
          outline: hueOutline, outlineOffset: 1,
        }}
      >
        <div style={{
          position: "absolute",
          left: `${(h / 360) * 100}%`, top: "50%",
          width: 16, height: 16, borderRadius: "50%",
          pointerEvents: "none",
          background: `hsl(${Math.round(h)}, 100%, 50%)`,
          border: "2px solid white",
          boxShadow: activeControl === "hue"
            ? "0 0 0 3px #f97316, 0 0 0 4px rgba(255,255,255,0.5)"
            : "0 0 0 1px rgba(0,0,0,0.3)",
          transform: "translate(-50%, -50%)",
        }} />
      </div>

      {/* Forhåndsvisning + Lukk */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 5,
          background: `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(50 + v / 2 * (1 - s / 100))}%)`,
          border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0,
        }} />
        <span style={{ fontSize: 12, fontFamily: "monospace", color: "#444", flex: 1 }}>{hsvToHex(h, s, v)}</span>
        <button
          ref={closeRef}
          type="button"
          tabIndex={0}
          onFocus={() => setFocused("close")}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key.startsWith("Arrow")) e.preventDefault();
            if (e.key === "ArrowUp")   { setFocused("hue"); hueRef.current?.focus(); return; }
            if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose?.(); }
          }}
          onClick={onClose}
          style={{
            padding: "3px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
            border: "1px solid rgba(0,0,0,0.2)", background: "rgba(0,0,0,0.07)",
            color: "#333", fontWeight: 500, flexShrink: 0,
            outline: closeOutline, outlineOffset: 1,
          }}
        >
          Lukk
        </button>
      </div>
    </div>
  );
}
