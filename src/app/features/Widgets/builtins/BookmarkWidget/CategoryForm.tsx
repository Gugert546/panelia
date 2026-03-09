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
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
      {error && (
        <div style={{ color: "#dc3545", fontSize: 12, width: "100%" }}>
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
          flex: 1,
          padding: "6px 8px",
          borderRadius: 4,
          border: "1px solid #ccc",
          fontSize: 14,
        }}
      />

      <button
        type="submit"
        disabled={isLoading}
        style={{
          padding: "6px 10px",
          borderRadius: 4,
          background: "#007BFF",
          color: "#fff",
          border: "none",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1,
          fontSize: 14,
          whiteSpace: "nowrap",
        }}
      >
        {isLoading ? "Adding..." : "Add Category"}
      </button>
    </form>
  );
}