import { useEffect, useState } from "react";
import bg from "./assets/sol.png";

import iconMenu from "./assets/icon-menu.png";
import iconEdit from "./assets/icon-edit.png";
import iconCalendar from "./assets/icon-calendar.png";
import iconMusic from "./assets/icon-music.png";
import iconChat from "./assets/icon-chat.png";

const SIDEBAR_WIDTH = 86;

type NavItem = {
  key: string;
  label: string;
  icon: string;
};

const items: NavItem[] = [
  { key: "menu", label: "Meny", icon: iconMenu },
  { key: "edit", label: "Rediger", icon: iconEdit },
  { key: "calendar", label: "Calendar", icon: iconCalendar },
  { key: "music", label: "Music", icon: iconMusic },
  { key: "chat", label: "Chat", icon: iconChat },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ClockWidgetMock() {
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

function SearchWidgetMock() {
  return (
    <div
      className="google-search-widget"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "min(760px, 90vw)",
        background: "rgba(255,255,255,0.35)",
        borderRadius: 999,
        padding: "12px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
        border: "1px solid rgba(255,255,255,0.35)",
        backdropFilter: "blur(12px)",
      }}
    >
      <button
        type="button"
        aria-label="Meny"
        style={{
          border: "none",
          background: "transparent",
          cursor: "default",
          padding: 0,
          opacity: 0.85,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={iconMenu}
          alt=""
          style={{
            width: 60,
            height: 60,
            objectFit: "contain",
            display: "block",
          }}
        />
      </button>

      <input
        type="text"
        placeholder="Søk på Google"
        readOnly
        value=""
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 15,
          color: "#111",
          opacity: 0.85,
        }}
      />

      <button
        type="button"
        aria-label="Søk"
        style={{
          border: "none",
          background: "transparent",
          cursor: "default",
          padding: 0,
          opacity: 0.9,
          pointerEvents: "none",
        }}
      >
        🔍
      </button>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("calendar");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* SIDEMENY */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: SIDEBAR_WIDTH,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          padding: 12,
          zIndex: 1000,
          background:
            "linear-gradient(180deg, rgba(243,178,138,0.85) 0%, rgba(209,155,131,0.85) 100%)",
          backdropFilter: "blur(14px)",
          borderRight: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "8px 0 22px rgba(0,0,0,0.12)",
        }}
      >
        {items.map((it) => {
          const isActive = active === it.key;

          return (
            <button
              key={it.key}
              type="button"
              onClick={() => setActive(it.key)}
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
  style={{
    width: 70,              // din størrelse
    height: 70,
    borderRadius: 999,

    display: "grid",        // 🔥 viktig
    placeItems: "center",   // 🔥 dead center

    background: isActive
      ? "rgba(255,255,255,0.85)"
      : "rgba(255,255,255,0.25)",

    border: "1px solid rgba(255,255,255,0.35)",
  }}
>
                  <img
  src={it.icon}
  alt=""
  style={{
    width: "150%",          // 👈 magisk verdi
    height: "150%",
    objectFit: "contain",
    display: "block",
    transform: "translateX(-1px)"
  }}
/>
                </div>

                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#1f2937",
                    opacity: isActive ? 1 : 0.85,
                  }}
                >
                  {it.label}
                </span>
              </div>
            </button>
          );
        })}

        <div style={{ marginTop: "auto" }} />
      </aside>

      {/* INNHOLD */}
      <main
        style={{
          marginLeft: SIDEBAR_WIDTH,
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          paddingTop: 220,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignItems: "center",
          }}
        >
          <ClockWidgetMock />
          <SearchWidgetMock />
        </div>
      </main>
    </div>
  );
}