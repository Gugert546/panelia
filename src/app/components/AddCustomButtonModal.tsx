import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWidgets } from "../features/dashboard/hooks/WidgetsContext";
import type { CustomButtonConfig } from "../features/dashboard/hooks/useWidgetsState";
import { useLanguage } from "../providers/languageProvider";
import {
  getPreferredFavicon,
  normalizeUrl,
} from "../../lib/utils/favicon";

type AddCustomButtonModalProps = {
  open: boolean;
  onClose: () => void;
  customButtonConfigs: Record<string, CustomButtonConfig>;
  removeCustomButton: (id: string) => void;
  openerRef?: React.RefObject<HTMLButtonElement | null>;
};

const MODAL_BACKDROP_COLOR = "transparent";

export default function AddCustomButtonModal({ open, onClose, customButtonConfigs, removeCustomButton, openerRef }: AddCustomButtonModalProps) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const labelInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const existingButtonsRef = useRef<HTMLDivElement>(null);

  const { addCustomButton } = useWidgets();
  const { t } = useLanguage();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Trap Tab focus inside modal
    if (e.key === "Tab") {
      e.preventDefault();
      const focusables = [labelInputRef, urlInputRef, addButtonRef, cancelButtonRef].map(r => r.current).filter(Boolean) as HTMLElement[];
      const current = document.activeElement as HTMLElement;
      const idx = focusables.indexOf(current);
      const next = e.shiftKey
        ? focusables[(idx - 1 + focusables.length) % focusables.length]
        : focusables[(idx + 1) % focusables.length];
      next?.focus();
    }
  };

  async function handleAddButton() {
    const trimmedLabel = label.trim();
    const normalizedUrl = normalizeUrl(url);

    if (!trimmedLabel || !normalizedUrl) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/link-preview?url=${encodeURIComponent(normalizedUrl)}`
      );

      let favicon = "";

      if (res.ok) {
        const data = (await res.json()) as { favicon?: string };
        favicon = getPreferredFavicon(normalizedUrl, data.favicon);
      } else {
        favicon = getPreferredFavicon(normalizedUrl);
      }

      addCustomButton({
        label: trimmedLabel,
        url: normalizedUrl,
        favicon,
      });

      setLabel("");
      setUrl("");
      onClose();
      requestAnimationFrame(() => openerRef?.current?.focus());
    } catch (err) {
      console.error(t('addCustomButtonModal.fetchPreviewError'), err);

      addCustomButton({
        label: trimmedLabel,
        url: normalizedUrl,
        favicon: getPreferredFavicon(normalizedUrl),
      });

      setLabel("");
      setUrl("");
      onClose();
      requestAnimationFrame(() => openerRef?.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: MODAL_BACKDROP_COLOR,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(14px)",
          padding: 20,
          borderRadius: 20,
          width: 300,
          maxWidth: "90%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h3
          style={{
            margin: 0,
            fontWeight: 500,
            letterSpacing: 0.4,
          }}
        >
          {t('addCustomButtonModal.title')}
        </h3>
        
        <div style={{ flex: 1 }}>
          <label> {t("addCustomButtonModal.buttonName")}:</label>
          <input
            ref={labelInputRef}
            type="text"
            placeholder={t('addCustomButtonModal.buttonName')}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); return; }
              if (e.key === "ArrowDown") { e.preventDefault(); urlInputRef.current?.focus(); }
            }}
            style={{
              width: "100%",
              padding: 8,
              marginBottom: 12,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />
          <label> {t('addCustomButtonModal.link')}:</label>
          <input
            ref={urlInputRef}
            type="text"
            placeholder={t('addCustomButtonModal.link')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); return; }
              if (e.key === "ArrowUp") { e.preventDefault(); labelInputRef.current?.focus(); }
              if (e.key === "ArrowDown") { e.preventDefault(); addButtonRef.current?.focus(); }
            }}
            style={{
              width: "100%",
              padding: 8,
              marginBottom: 12,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              ref={addButtonRef}
              onClick={handleAddButton}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddButton();
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const first = existingButtonsRef.current?.querySelector<HTMLButtonElement>("button");
                  first?.focus();
                }
                if (e.key === "ArrowUp") { e.preventDefault(); urlInputRef.current?.focus(); }
                if (e.key === "ArrowRight") { e.preventDefault(); cancelButtonRef.current?.focus(); }
                if (e.key === "ArrowLeft") { e.preventDefault(); }
              }}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 4,
                border: "none",
                background: "#cde8ff",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? t('addCustomButtonModal.adding') : t('addCustomButtonModal.add')}
            </button>
            <button
              ref={cancelButtonRef}
              onClick={onClose}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                  requestAnimationFrame(() => openerRef?.current?.focus());
                  return;
                }
                if (e.key === "ArrowUp") { e.preventDefault(); urlInputRef.current?.focus(); }
                if (e.key === "ArrowLeft") { e.preventDefault(); addButtonRef.current?.focus(); }
                if (e.key === "ArrowRight") { e.preventDefault(); }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const first = existingButtonsRef.current?.querySelector<HTMLButtonElement>("button");
                  first?.focus();
                }
              }}
              style={{
                padding: 8,
                borderRadius: 4,
                border: "1px solid #ccc",
                background: "white",
                cursor: "pointer",
              }}
            >
              {t('addCustomButtonModal.cancel')}
            </button>
          </div>
        </div>

        {Object.keys(customButtonConfigs).length > 0 && (
          <div ref={existingButtonsRef} style={{ marginTop: 12 }}>
            <h4 style={{ margin: 0, marginBottom: 8 }}>{t('addCustomButtonModal.existingButtons')}</h4>
            {Object.entries(customButtonConfigs).map(([id, config]) => (
              <div
                key={id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 8,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  marginBottom: 4,
                }}
              >
                <span>{config.label}</span>
                <button
                  onClick={() => removeCustomButton(id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      const allDeleteBtns = Array.from(
                        existingButtonsRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []
                      );
                      const idx = allDeleteBtns.indexOf(e.currentTarget);
                      removeCustomButton(id);
                      requestAnimationFrame(() => {
                        const updated = Array.from(
                          existingButtonsRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []
                        );
                        if (updated.length > 0) {
                          updated[Math.min(idx, updated.length - 1)]?.focus();
                        } else {
                          addButtonRef.current?.focus();
                        }
                      });
                      return;
                    }
                    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                      e.preventDefault();
                      return;
                    }
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      const allDeleteBtns = Array.from(
                        existingButtonsRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []
                      );
                      const idx = allDeleteBtns.indexOf(e.currentTarget);
                      const next = e.key === "ArrowDown"
                        ? allDeleteBtns[idx + 1]
                        : allDeleteBtns[idx - 1];
                      if (next) {
                        next.focus();
                      } else if (e.key === "ArrowUp") {
                        addButtonRef.current?.focus();
                      }
                    }
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "red",
                    cursor: "pointer",
                    fontSize: "16px",
                  }}
                  title={t('addCustomButtonModal.deleteButton')}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
