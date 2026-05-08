import { useState } from "react";
import { useLanguage } from "../../../../providers/languageProvider";

type BookmarkFormProps = {
  onSubmit: (title: string, url: string) => Promise<void>;
  isLoading?: boolean;
  textColor?: string;
  surfaceColor?: string;
  borderColor?: string;
};

export default function BookmarkForm({
  onSubmit,
  isLoading = false,
  textColor = "inherit",
}: BookmarkFormProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const readableInputStyle = {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(20, 26, 41, 0.16)",
    fontSize: 13,
    background: "rgba(255,255,255,0.76)",
    color: "#0f172a",
    outline: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.42)",
  } as const;
  const editPanelButtonStyle = {
    padding: "8px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.54)",
    color: "#0f172a",
    border: "1px solid rgba(20, 26, 41, 0.16)",
    cursor: isLoading ? "not-allowed" : "pointer",
    opacity: isLoading ? 0.6 : 1,
    fontSize: 13,
    fontWeight: 600,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.42)",
  } as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!url.trim()) {
      setError("URL is required");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    try {
      await onSubmit(title, url);
      setTitle("");
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add bookmark");
    }
  };
  const { t } = useLanguage();
  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {error && (
        <div
          style={{
            color: textColor,
            fontSize: 12,
            padding: "7px 9px",
            borderRadius: 8,
            background: "rgba(255, 200, 200, 0.65)",
          }}
        >
          {error}
        </div>
      )}
      <label style={{fontWeight:600}}>{t("widgets.bookmarkWidget.bookmarkTitle")}:</label>
      <input
        type="text"
        placeholder={t("widgets.bookmarkWidget.bookmarkTitle")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isLoading}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        style={readableInputStyle}
      />
      <label style={{fontWeight:600}}>{t("widgets.bookmarkWidget.bookmarkURL")}:</label>
      <input
        type="url"
        placeholder={t("widgets.bookmarkWidget.bookmarkURL")}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={isLoading}
        style={readableInputStyle}
      />

      <button
        type="submit"
        disabled={isLoading}
        style={editPanelButtonStyle}
      >
        {isLoading ? t("widgets.bookmarkWidgets.adding") : t("widgets.bookmarkWidget.addBookmark")}
      </button>
    </form>
  );
}
