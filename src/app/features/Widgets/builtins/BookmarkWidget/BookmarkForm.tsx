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
        placeholder="Bookmark title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isLoading}
        style={{
          padding: "7px 10px",
          borderRadius: 8,
          border: "1px solid rgba(17,24,39,0.2)",
          fontSize: 13,
          background: "rgba(255,255,255,0.6)",
          color: "#0b1320",
          outline: "none",
        }}
      />

      <input
        type="url"
        placeholder="https://example.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={isLoading}
        style={{
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
          fontWeight: 600,
        }}
      >
        {isLoading ? "Adding..." : "Add Bookmark"}
      </button>
    </form>
  );
}
