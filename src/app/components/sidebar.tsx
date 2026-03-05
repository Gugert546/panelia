import { useState } from "react";

type SidebarProps = {
  onEditClick?: () => void;
  onSidebarNav?: (itemKey: string) => void;
};

const SIDEBAR_WIDTH = 86;

type NavItem = {
  key: string;
  label: string;
  icon: string;
};

const items: NavItem[] = [
  { key: "edit", label: "Rediger", icon: "⚙️" },
  { key: "calendar", label: "Calendar", icon: "📅" },
  //{ key: "music", label: "Music", icon: "🎵" },
  { key: "chat", label: "Chat", icon: "💬" },
];

export default function Sidebar({ onEditClick, onSidebarNav }: SidebarProps) {
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
        justifyContent: "center",
        gap: 14,
        padding: 12,
        zIndex: 1000,
      }}
    >
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => {
            setActive(item.key);

            if (item.key === "edit" && onEditClick) {
              onEditClick();
            } else if (onSidebarNav) {
              onSidebarNav(item.key);
            }
          }}
          style={{
            width: 56,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            background: active === item.key 
              ? "rgba(255,255,255,0.3)" 
              : "rgba(255,255,255,0.15)",
            backdropFilter: "blur(14px)",
            border: active === item.key 
              ? "1px solid rgba(255,255,255,0.4)" 
              : "1px solid rgba(255,255,255,0.2)",
            borderRadius: 16,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {item.icon}
        </button>
      ))}
    </aside>
  );
}