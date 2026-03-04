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
  { key: "edit", label: "Rediger", icon: "✏️" },
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
        background: "linear-gradient(180deg, #f3b28a 0%, #d19b83 100%)",
        borderRight: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "8px 0 22px rgba(0,0,0,0.12)"
      }}
    >
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => {
            setActive(item.key);

            // Handle specific item actions
            if (item.key === "edit" && onEditClick) {
              onEditClick();
            } else if (onSidebarNav) {
              onSidebarNav(item.key);
            }
          }}
          style={{
            background: active === item.key ? "rgba(255,255,255,0.3)" : "transparent",
            border: "none",
            padding: 8,
            borderRadius: 8,
            cursor: "pointer"
          }}
        >
          <div>{item.icon}</div>
          <small>{item.label}</small>
        </button>
      ))}
    </aside>
  );
}
