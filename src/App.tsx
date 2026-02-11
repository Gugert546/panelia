import { useState } from "react";
import bg from "./assets/sol.png";

const SIDEBAR_WIDTH = 86;

type NavItem = {
  key: string;
  label: string;
  icon: string; // bruker emoji for enkelhet
};

const items: NavItem[] = [
  { key: "menu", label: "Meny", icon: "☰" },
  { key: "edit", label: "Rediger", icon: "✏️" },
  { key: "calendar", label: "Calendar", icon: "📅" },
  { key: "music", label: "Music", icon: "🎵" },
  { key: "chat", label: "Chat", icon: "💬" },
];

export default function App() {
  const [active, setActive] = useState("calendar");

  return (
    <div
      style={{
        minHeight: "100vh",
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

          // Solid “sol/peach” look (ikke transparent)
          background: "linear-gradient(180deg, #f3b28a 0%, #d19b83 100%)",
          borderRight: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "8px 0 22px rgba(0,0,0,0.12)",
        }}
      >
        {/* Top icons */}
        <button
          type="button"
          onClick={() => setActive("menu")}
          style={iconBtnStyle(active === "menu")}
          aria-label="Meny"
        >
          ☰
        </button>

        <button
          type="button"
          onClick={() => setActive("edit")}
          style={iconBtnStyle(active === "edit")}
          aria-label="Rediger"
        >
          ✏️
        </button>

        <div style={{ height: 6 }} />

        {/* Nav items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
          {items.slice(2).map((it) => {
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
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    color: "#1f2937",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",

                      // aktiv “pill”
                      background: isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)",
                      boxShadow: isActive ? "0 10px 18px rgba(0,0,0,0.12)" : "none",
                      border: "1px solid rgba(255,255,255,0.35)",
                    }}
                    aria-hidden="true"
                  >
                    <span style={{ fontSize: 20 }}>{it.icon}</span>
                  </div>

                  <span style={{ opacity: isActive ? 1 : 0.85 }}>{it.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto" }} />
      </aside>

      {/* INNHOLD */}
      <main
        style={{
          marginLeft: SIDEBAR_WIDTH,
          minHeight: "100vh",
          padding: 24,
        }}
      >
        {/* Tomt område foreløpig */}
      </main>
    </div>
  );
}

function iconBtnStyle(active: boolean): React.CSSProperties {
  return {
    width: 44,
    height: 44,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.35)",
    background: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: active ? "0 10px 18px rgba(0,0,0,0.12)" : "none",
    fontSize: 20,
  };
}