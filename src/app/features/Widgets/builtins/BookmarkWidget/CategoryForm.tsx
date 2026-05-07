import { useState } from "react";
import { useLanguage } from "../../../../providers/languageProvider";

type CategoryFormProps = {
  onSubmit: (categoryName: string) => Promise<void>;
  isLoading?: boolean;
  textColor?: string;
  surfaceColor?: string;
  borderColor?: string;
};

export default function CategoryForm({
  onSubmit,
  isLoading = false,
  textColor = "inherit",
}: CategoryFormProps) {
  const [categoryName, setCategoryName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();
  const readableInputStyle = {
    width: "100%",
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
    whiteSpace: "nowrap",
    fontWeight: 600,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.42)",
  } as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryName.trim()) {
      setError("Category name is required");
      return;
    }

    try {
      await onSubmit(categoryName.trim());
      setCategoryName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category");
    }
  };

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
      <label style={{fontWeight:600}}>{t("widgets.bookmarkWidget.newCategoryName")}:</label>
      <input
        type="text"
        autoFocus
        placeholder={t("widgets.bookmarkWidget.newCategoryName")}
        value={categoryName}
        onChange={(e) => setCategoryName(e.target.value)}
        disabled={isLoading}
        style={readableInputStyle}
      />

      <button
        type="submit"
        disabled={isLoading}
        style={editPanelButtonStyle}
      >
        {isLoading ? t("widgets.bookmarkWidget.adding") : t("widgets.bookmarkWidget.addCategory")}
      </button>
    </form>
  );
}
