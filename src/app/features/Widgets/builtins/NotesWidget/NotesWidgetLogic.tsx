import { useEffect, useState } from "react";

const STORAGE_KEY = "panelia_notes_v1";

export function useNotesWidget() {
  const [text, setText] = useState("");

  // Last inn ved start
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved != null) setText(saved);
  }, []);

  // Lagre når tekst endres
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, text);
  }, [text]);

  return {
    state: { text },
    actions: {
      setText,
      clear: () => setText(""),
    },
  };
}