import { useState } from "react";

type CategoryFormProps = {
  onSubmit: (categoryName: string) => Promise<void>;
  isLoading?: boolean;
};

export default function CategoryForm({ onSubmit, isLoading = false }: CategoryFormProps) {
  const [categoryName, setCategoryName] = useState("");
  const [error, setError] = useState<string | null>(null);

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
            color: "#111827",
            fontSize: 12,
            padding: "7px 9px",
            borderRadius: 8,
            background: "rgba(255, 200, 200, 0.65)",
          }}
        >
          {error}
        </div>
      )}

      <input
        type="text"
        placeholder="New category name"
        value={categoryName}
        onChange={(e) => setCategoryName(e.target.value)}
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "7px 10px",
          borderRadius: 8,
          border: "1px solid rgba(17,24,39,0.2)",
          fontSize: 13,
          background: "rgba(255,255,255,0.6)",
          color: "#0b1320",
          outline: "none",
        }}
      />

      <button
        type="submit"
        disabled={isLoading}
        style={{
          padding: "7px 10px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.22)",
          color: "#0b1320",
          border: "none",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1,
          fontSize: 13,
          whiteSpace: "nowrap",
          fontWeight: 600,
        }}
      >
        {isLoading ? "Adding..." : "Add Category"}
      </button>
    </form>
  );
}
