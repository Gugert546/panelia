import { useState, useRef, useEffect } from "react";

type SidebarProps = {
  onEditClick?: () => void;
  onSidebarNav?: (itemKey: string) => void;
  onSidebarArrowRight?: (itemKey: string) => void;
  onSidebarArrowLeft?: (itemKey: string) => void;
  onEditArrowRight?: () => void;
  disabled?: boolean;
};

const SIDEBAR_WIDTH = 86;

type NavItem = {
  key: string;
  label: string;
  icon: string;
};

const items: NavItem[] = [
  { key: "edit", label: "Rediger", icon: "settings" },
  { key: "calendar", label: "Calendar", icon: "calendar_month" },
  //{ key: "music", label: "Music", icon: "🎵" },
  { key: "chat", label: "Chat", icon: "chat_bubble" },
];

export default function Sidebar({
  onEditClick,
  onSidebarNav,
  onSidebarArrowRight,
  onSidebarArrowLeft,
  onEditArrowRight,
  disabled = false,
}: SidebarProps) {
  const [active, setActive] = useState("calendar");
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;

      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement?.closest('[data-arrow-scope="edit-panel"]') ||
        activeElement?.closest('[data-arrow-scope="calendar-panel"]')
      ) {
        return;
      }

      const focused = document.activeElement;
      const focusedIndex = buttonRefs.current.findIndex((b) => b === focused);

      if (focusedIndex === -1) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          // Ingenting i sidebar er fokusert – send fokus til første knapp
          e.preventDefault();
          buttonRefs.current[0]?.focus();
        }
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const focusedItem = items[focusedIndex];
        if (!focusedItem) return;

        if (focusedItem.key === "edit") {
          onEditArrowRight?.();
          return;
        }

        setActive(focusedItem.key);
        onSidebarArrowRight?.(focusedItem.key);
        return;
      }

      if (e.key === "ArrowLeft") {
        const focusedItem = items[focusedIndex];
        if (!focusedItem) return;

        if (focusedItem.key === "edit" || focusedItem.key === "calendar") {
          e.preventDefault();
          onSidebarArrowLeft?.(focusedItem.key);
        }
        return;
      }

      e.preventDefault();
      if (e.key === "ArrowDown") {
        buttonRefs.current[(focusedIndex + 1) % items.length]?.focus();
      } else {
        buttonRefs.current[(focusedIndex - 1 + items.length) % items.length]?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onEditArrowRight, onSidebarArrowRight, onSidebarArrowLeft]);

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
      {items.map((item, index) => (
        <button
          key={item.key}
          ref={(el) => { buttonRefs.current[index] = el; }}
          aria-label={item.label}
          disabled={disabled}
          title={disabled ? "Sign in to use the side panel" : item.label}
          onClick={() => {
            if (disabled) return;
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
            background: active === item.key 
              ? "rgba(255,255,255,0.3)" 
              : "rgba(255,255,255,0.15)",
            backdropFilter: "blur(14px)",
            border: active === item.key 
              ? "1px solid rgba(255,255,255,0.4)" 
              : "1px solid rgba(255,255,255,0.2)",
            borderRadius: 16,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            transition: "all 0.2s ease",
          }}
        >
          <span className="material-symbols-rounded sidebar-icon" aria-hidden="true">
            {item.icon}
          </span>
        </button>
      ))}
    </aside>
  );
}
