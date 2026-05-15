import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../auth/useAuth";
import {
  subscribeToStickyNote,
  updateStickyNote,
} from "../../../../../lib/firebase/firestore";

const SAVE_DEBOUNCE_MS = 500;

export function useNotesWidget(widgetId: string) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [isReady, setIsReady] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRemoteTextRef = useRef("");

  useEffect(() => {
    if (!user) {
      setIsReady(true);
      return;
    }

    setIsReady(false);

    // Lytter til endringer for dette notatet.
    const unsubscribe = subscribeToStickyNote(user.uid, widgetId, (note) => {
      const nextText = note?.text ?? "";
      lastRemoteTextRef.current = nextText;
      setText(nextText);
      setIsReady(true);
    });

    return unsubscribe;
  }, [user, widgetId]);

  useEffect(() => {
    if (!user || !isReady) return;
    if (text === lastRemoteTextRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce lagring mens bruker skriver.
    saveTimeoutRef.current = setTimeout(() => {
      void updateStickyNote(user.uid, widgetId, text)
        .then(() => {
          lastRemoteTextRef.current = text;
        })
        .catch((error) => {
          console.error("Failed to save sticky note:", error);
        });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isReady, text, user, widgetId]);

  return {
    state: { text },
    actions: {
      setText,
    },
  };
}