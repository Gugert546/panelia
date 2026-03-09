import { useState } from "react";

type BookmarkFormProps = {
  onSubmit: (title: string, url: string) => Promise<void>;
  isLoading?: boolean;
};

export default function BookmarkForm({
  onSubmit,
  isLoading = false,
}: BookmarkFormProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!url.trim()) {
      setError("URL is required");
      return;
    }

    // Validate URL format
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

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {error && (
        <div style={{ color: "#dc3545", fontSize: 12 }}>
          {error}
        </div>
      )}

      <input
        type="text"
        placeholder="Bookmark title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isLoading}
        style={{
          padding: "6px 8px",
          borderRadius: 4,
          border: "1px solid #ccc",
          fontSize: 14,
        }}
      />

      <input
        type="url"
        placeholder="https://example.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={isLoading}
        style={{
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
          background: "#28a745",
          color: "#fff",
          border: "none",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1,
          fontSize: 14,
        }}
      >
        {isLoading ? "Adding..." : "Add Bookmark"}
      </button>
    </form>
  );
}