import { useState } from "react";
import { useWidgets } from "../../../dashboard/hooks/WidgetsContext";

function normalizeUrl(url: string) {
  const trimmed = url.trim();

  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function useCustomButtonsWidget() {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const { addCustomButton } = useWidgets();

  async function addButton() {
    const trimmedLabel = label.trim();
    const normalizedUrl = normalizeUrl(url);

    if (!trimmedLabel || !normalizedUrl) return;

    try {
      const res = await fetch(
        `/api/link-preview?url=${encodeURIComponent(normalizedUrl)}`
      );

      let favicon = "";

      if (res.ok) {
        const data = (await res.json()) as { favicon?: string };
        favicon = data.favicon || "";
      }

      addCustomButton({
        label: trimmedLabel,
        url: normalizedUrl,
        favicon,
      });

      setLabel("");
      setUrl("");
    } catch (err) {
      console.error("Kunne ikke hente link preview:", err);

      addCustomButton({
        label: trimmedLabel,
        url: normalizedUrl,
        favicon: "",
      });

      setLabel("");
      setUrl("");
    }
  }

  return {
    state: {
      label,
      url,
    },
    actions: {
      setLabel,
      setUrl,
      addButton,
    },
  };
}
