import { useState, useEffect, useCallback, useRef } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../lib/firebase/client";
import { useAuth } from "../../auth/useAuth";
import type { WidgetLayout } from "../../../../types/firestore";
import {
  createStickyNote,
  deleteStickyNote,
} from "../../../../lib/firebase/firestore";

export const AVAILABLE_WIDGETS = [
  { id: "clock", label: "Klokke", icon: "schedule" },
  { id: "calendar", label: "Kalender", icon: "calendar_month" },
  { id: "google_search", label: "Søk", icon: "search" },
  { id: "news", label: "Nyheter", icon: "newsmode" },
  { id: "weather", label: "Vær", icon: "partly_cloudy_day" },
  { id: "bookmark", label: "Bokmerke", icon: "bookmark" },
  { id: "notes", label: "Notater", icon: "sticky_note_2" },
  { id: "spotify", label: "Spotify", icon: "music_note" },
] as const;

const SAVE_DEBOUNCE_MS = 10000; // 10 seconds

function isNotesWidgetId(widgetId: string) {
  return widgetId === "notes" || widgetId.startsWith("notes:");
}

function createNotesWidgetInstanceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `notes:${crypto.randomUUID()}`;
  }

  const randomPart = Math.random().toString(36).slice(2, 10);
  return `notes:${Date.now().toString(36)}-${randomPart}`;
}

export function useWidgets() {
  const { user } = useAuth();
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [layouts, setLayouts] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});
  const [isLoading, setIsLoading] = useState(true);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load layout from Firestore
  const loadLayout = useCallback(async () => {
    if (!user) return;

    try {
      const docRef = doc(db, "users", user.uid, "widgetLayout", "current");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as WidgetLayout;
        setActiveWidgets(data.activeWidgets);
        setLayouts(data.layouts);
      }
    } catch (error) {
      console.error("Failed to load widget layout:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Save layout to Firestore with debounce
  const saveLayout = useCallback(async () => {
    if (!user) return;

    try {
      const layoutData: WidgetLayout = {
        activeWidgets,
        layouts,
        updatedAt: Date.now(),
      };

      const docRef = doc(db, "users", user.uid, "widgetLayout", "current");
      await setDoc(docRef, {
        ...layoutData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to save widget layout:", error);
    }
  }, [user, activeWidgets, layouts]);

  // Debounced save function
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveLayout();
    }, SAVE_DEBOUNCE_MS);
  }, [saveLayout]);

  // Load layout on mount or user change
  useEffect(() => {
    if (user) {
      loadLayout();
    } else {
      setIsLoading(false);
    }
  }, [user, loadLayout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const toggleWidget = useCallback((id: string) => {
    if (id === "notes") {
      const noteWidgetId = createNotesWidgetInstanceId();
      setActiveWidgets((prev) => [...prev, noteWidgetId]);
      debouncedSave();

      if (user) {
        void createStickyNote(user.uid, noteWidgetId).catch((error) => {
          console.error("Failed to create sticky note:", error);
        });
      }

      return;
    }

    setActiveWidgets((prev) =>
      prev.includes(id)
        ? prev.filter((widgetId) => widgetId !== id)
        : [...prev, id]
    );
    debouncedSave();
  }, [debouncedSave, user]);

  const closeWidget = useCallback((widgetId: string) => {
    setActiveWidgets((prev) => prev.filter((id) => id !== widgetId));
    setLayouts((prev) => {
      if (!prev[widgetId]) return prev;

      const next = { ...prev };
      delete next[widgetId];
      return next;
    });
    debouncedSave();

    if (user && isNotesWidgetId(widgetId)) {
      void deleteStickyNote(user.uid, widgetId).catch((error) => {
        console.error("Failed to delete sticky note:", error);
      });
    }
  }, [debouncedSave, user]);

  const updateLayout = useCallback((newLayouts: Record<string, { x: number; y: number; w: number; h: number }>) => {
    setLayouts(newLayouts);
    debouncedSave();
  }, [debouncedSave]);

  return {
    activeWidgets,
    layouts,
    isLoading,
    toggleWidget,
    closeWidget,
    updateLayout,
  };
}
