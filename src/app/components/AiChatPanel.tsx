import type { CSSProperties } from "react";
import { useLanguage } from "../providers/languageProvider";
import Chat from "./chatUI";

type AiChatPanelProps = {
  open: boolean;
  onClose: () => void;
  sidebarWidth: number;
};

export default function AiChatPanel({
  open,
  onClose,
  sidebarWidth,
}: AiChatPanelProps) {
  const { t } = useLanguage();
  const panelWidth = "min(390px, calc(100vw - 118px))";

  return (
    <aside
      aria-hidden={!open}
      style={{
        ...styles.panel,
        left: open ? sidebarWidth + 26 : `calc(-1 * ${panelWidth})`,
        width: panelWidth,
      }}
    >
      <div style={styles.header}>
        <h2 style={styles.title}>{t("chat.title")}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("editPanel.close")}
          title={t("editPanel.close")}
          style={styles.closeButton}
        >
          <span
            className="material-symbols-rounded"
            aria-hidden="true"
            style={{ fontSize: 20, lineHeight: 1 }}
          >
            close
          </span>
        </button>
      </div>

      <div style={styles.content}>
        <Chat variant="panel" autoFocus={open} />
      </div>
    </aside>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    position: "fixed",
    top: 0,
    height: "100%",
    zIndex: 999,
    padding: 24,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    color: "#0f172a",
    background: "rgba(255,255,255,0.24)",
    borderRight: "1px solid rgba(15,23,42,0.16)",
    boxShadow: "4px 0 12px rgba(0,0,0,0.1)",
    backdropFilter: "blur(10px)",
    transition: "left 0.3s ease",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 650,
    letterSpacing: 0,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.22)",
    background: "rgba(211,211,211,0.43)",
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  content: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
};
