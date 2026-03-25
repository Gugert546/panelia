import { useState } from "react";
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
};

export default function AddCustomButtonModal({ open, onClose, customButtonConfigs, removeCustomButton }: AddCustomButtonModalProps) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const { addCustomButton } = useWidgets();
  const { t } = useLanguage();

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
      onClose(); // Lukk modalen når knapp er lagt til
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
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.15)",
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
          <input
            type="text"
            placeholder={t('addCustomButtonModal.buttonName')}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              marginBottom: 12,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />
          <input
            type="text"
            placeholder={t('addCustomButtonModal.link')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
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
              onClick={handleAddButton}
              disabled={loading}
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
              onClick={onClose}
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
          <div style={{ marginTop: 12 }}>
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
    </div>
  );
}