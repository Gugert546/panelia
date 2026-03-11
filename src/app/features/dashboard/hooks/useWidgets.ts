import { useState, useEffect, useCallback, useRef } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../lib/firebase/client";
import { useAuth } from "../../auth/useAuth";
import type { WidgetLayout } from "../../../../types/firestore";

export const AVAILABLE_WIDGETS = [
  { id: "clock", label: "Klokke" },
  { id: "google_search", label: "Søk" },
  { id: "news", label: "Nyheter" },
  { id: "weather", label: "Vær" },
  { id: "bookmark", label: "Bokmerke" },
  { id: "notes", label: "Notater" },
  { id: "spotify", label: "Spotify" },
];

const SAVE_DEBOUNCE_MS = 10000; // 10 seconds

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
    setActiveWidgets(prev =>
      prev.includes(id)
        ? prev.filter(w => w !== id)
        : [...prev, id]
    );
    debouncedSave();
  }, [debouncedSave]);

  const updateLayout = useCallback((newLayouts: Record<string, { x: number; y: number; w: number; h: number }>) => {
    setLayouts(newLayouts);
    debouncedSave();
  }, [debouncedSave]);

  return {
    activeWidgets,
    layouts,
    isLoading,
    toggleWidget,
    updateLayout,
  };
}