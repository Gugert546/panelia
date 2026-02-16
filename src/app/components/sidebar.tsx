  {/* SIDEMENY */}
  import iconMenu from "../../assets/icon-menu.png";
import iconEdit from "../../assets/icon-edit.png";
import iconCalendar from "../../assets/icon-calendar.png";
import iconMusic from "../../assets/icon-music.png";
import iconChat from "../../assets/icon-chat.png";
import { useState } from "react";
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
  

  const SIDEBAR_WIDTH = 86;
  export default function Sidebar() {
    const [active, setActive] = useState("calendar");
    return (
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
    );
  }
