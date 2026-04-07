// Hoved-hook som orkestrerer dashboardets widget-state, lagring og brukerhandlinger.

import { useState, useEffect, useCallback, useRef } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../lib/firebase/client";
import { useAuth } from "../../auth/useAuth";
import {
  DEFAULT_DASHBOARD_BACKGROUND_ID,
  DEFAULT_LAYOUTS,
  DEFAULT_WIDGET_BORDER_COLOR,
  DEFAULT_WIDGET_BORDER_WIDTH,
  DEFAULT_WIDGET_OPACITY,
  DEFAULT_WIDGET_SIZE_MODE,
  DEFAULT_WIDGET_SURFACE_COLOR,
  DEFAULT_WIDGET_TEXT_COLOR,
  SAVE_DEBOUNCE_MS,
  AVAILABLE_WIDGETS,
} from "./widgets/constants";
import {
  createCustomButtonId,
  createDashboardPresetId,
  createNotesWidgetId,
  migrateLegacyCustomButtonId,
  migrateLegacyMap,
} from "./widgets/idUtils";
import { createCenteredLayout } from "./widgets/layoutUtils";
import {
  normalizeDashboardPresets,
  normalizePersistedVideoUrl,
  normalizeWidgetLocks,
  sanitizePresetForPersistence,
} from "./widgets/normalize";
import type {
  CustomButtonConfig,
  DashboardBackgroundId,
  DashboardPreset,
  LayoutItem,
  WidgetLayoutDocument,
  WidgetSizeMode,
  WidgetInstance,
} from "./widgets/types";

export { AVAILABLE_WIDGETS };
export type {
  CustomButtonConfig,
  DashboardBackgroundId,
  DashboardPreset,
  LayoutItem,
  WidgetSizeMode,
  WidgetInstance,
};

export function useWidgetsState() {
  const { user } = useAuth();

  // Kjerne-state for hva som vises og hvor det vises.
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [customButtonConfigs, setCustomButtonConfigs] = useState<Record<string, CustomButtonConfig>>({});
  const [layouts, setLayouts] = useState<Record<string, LayoutItem>>({});
  const [widgetLocks, setWidgetLocks] = useState<Record<string, boolean>>({});

  // Stil/state for dashboardets utseende.
  const [widgetSurfaceColor, setWidgetSurfaceColor] = useState(
    DEFAULT_WIDGET_SURFACE_COLOR
  );
  const [widgetBorderColor, setWidgetBorderColor] = useState(
    DEFAULT_WIDGET_BORDER_COLOR
  );
  const [widgetTextColor, setWidgetTextColor] = useState(
    DEFAULT_WIDGET_TEXT_COLOR
  );
  const [widgetOpacity, setWidgetOpacity] = useState(
    DEFAULT_WIDGET_OPACITY
  );
  const [widgetBorderWidth, setWidgetBorderWidth] = useState(
    DEFAULT_WIDGET_BORDER_WIDTH
  );
  const [widgetSizeMode, setWidgetSizeMode] = useState<WidgetSizeMode>(
    DEFAULT_WIDGET_SIZE_MODE
  );
  const [dashboardBackgroundId, setDashboardBackgroundId] =
    useState<DashboardBackgroundId>(DEFAULT_DASHBOARD_BACKGROUND_ID);
  const [customVideoBackgroundUrl, setCustomVideoBackgroundUrl] = useState("");
  const [dashboardPresets, setDashboardPresets] = useState<DashboardPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hindrer autosave før første load er ferdig.
  const hasLoadedRef = useRef(false);

  // Load widget layout from Firestore
  const loadLayout = useCallback(async () => {
    // Når bruker logger ut, nullstiller vi dashboard-state lokalt.
    if (!user) {
      setActiveWidgets([]);
      setCustomButtonConfigs({});
      setLayouts({});
      setWidgetLocks({});
      setWidgetSurfaceColor(DEFAULT_WIDGET_SURFACE_COLOR);
      setWidgetBorderColor(DEFAULT_WIDGET_BORDER_COLOR);
      setWidgetTextColor(DEFAULT_WIDGET_TEXT_COLOR);
      setWidgetOpacity(DEFAULT_WIDGET_OPACITY);
      setWidgetBorderWidth(DEFAULT_WIDGET_BORDER_WIDTH);
      setWidgetSizeMode(DEFAULT_WIDGET_SIZE_MODE);
      setDashboardBackgroundId(DEFAULT_DASHBOARD_BACKGROUND_ID);
      setCustomVideoBackgroundUrl("");
      setDashboardPresets([]);
      setIsLoading(false);
      hasLoadedRef.current = false;
      return;
    }

    try {
      const docRef = doc(db, "users", user.uid, "widgetLayout", "current");
      const docSnap = await getDoc(docRef);

      // Ny bruker uten lagret dokument: start med defaults.
      if (!docSnap.exists()) {
        setActiveWidgets([]);
        setCustomButtonConfigs({});
        setLayouts({});
        setWidgetLocks({});
        setWidgetSurfaceColor(DEFAULT_WIDGET_SURFACE_COLOR);
        setWidgetBorderColor(DEFAULT_WIDGET_BORDER_COLOR);
        setWidgetTextColor(DEFAULT_WIDGET_TEXT_COLOR);
        setWidgetOpacity(DEFAULT_WIDGET_OPACITY);
        setWidgetBorderWidth(DEFAULT_WIDGET_BORDER_WIDTH);
        setWidgetSizeMode(DEFAULT_WIDGET_SIZE_MODE);
        setDashboardBackgroundId(DEFAULT_DASHBOARD_BACKGROUND_ID);
        setCustomVideoBackgroundUrl("");
        setDashboardPresets([]);
        hasLoadedRef.current = true;
        return;
      }

      const data = docSnap.data() as WidgetLayoutDocument;

      // Migrerer gamle ID-formater og normaliserer data før state settes.
      const migratedActiveWidgets = Array.isArray(data.activeWidgets)
        ? data.activeWidgets.map(migrateLegacyCustomButtonId)
        : [];
      const migratedCustomButtonConfigs = migrateLegacyMap(data.customButtonConfigs ?? {});
      const migratedLayouts = migrateLegacyMap(data.layouts ?? {});
      const migratedWidgetLocks = migrateLegacyMap(normalizeWidgetLocks(data.widgetLocks));

      setActiveWidgets(migratedActiveWidgets);
      setCustomButtonConfigs(migratedCustomButtonConfigs);
      setLayouts(migratedLayouts);
      setWidgetLocks(migratedWidgetLocks);
      setWidgetSurfaceColor(
        typeof data.widgetSurfaceColor === "string" && data.widgetSurfaceColor
          ? data.widgetSurfaceColor
          : DEFAULT_WIDGET_SURFACE_COLOR
      );
      setWidgetBorderColor(
        typeof data.widgetBorderColor === "string" && data.widgetBorderColor
          ? data.widgetBorderColor
          : DEFAULT_WIDGET_BORDER_COLOR
      );
      setWidgetTextColor(
        typeof data.widgetTextColor === "string" && data.widgetTextColor
          ? data.widgetTextColor
          : DEFAULT_WIDGET_TEXT_COLOR
      );
      setWidgetOpacity(
        typeof data.widgetOpacity === "number" && Number.isFinite(data.widgetOpacity)
          ? Math.min(1, Math.max(0.2, Number(data.widgetOpacity.toFixed(2))))
          : DEFAULT_WIDGET_OPACITY
      );
      setWidgetBorderWidth(
        typeof data.widgetBorderWidth === "number" && Number.isFinite(data.widgetBorderWidth)
          ? Math.min(12, Math.max(0, Math.round(data.widgetBorderWidth)))
          : DEFAULT_WIDGET_BORDER_WIDTH
      );
      setWidgetSizeMode(
        data.widgetSizeMode === "small" ||
          data.widgetSizeMode === "medium" ||
          data.widgetSizeMode === "large"
          ? data.widgetSizeMode
          : DEFAULT_WIDGET_SIZE_MODE
      );
      setDashboardBackgroundId(
        data.dashboardBackgroundId === "sol1" ||
        data.dashboardBackgroundId === "sol2" ||
        data.dashboardBackgroundId === "sol3" ||
        data.dashboardBackgroundId === "natt1" ||
        data.dashboardBackgroundId === "natt2" ||
        data.dashboardBackgroundId === "natt3" ||
        data.dashboardBackgroundId === "videoCustom"
          ? data.dashboardBackgroundId
          : DEFAULT_DASHBOARD_BACKGROUND_ID
      );
      setCustomVideoBackgroundUrl(
        typeof data.customVideoBackgroundUrl === "string"
          ? normalizePersistedVideoUrl(data.customVideoBackgroundUrl)
          : ""
      );
      setDashboardPresets(normalizeDashboardPresets(data.dashboardPresets));
      hasLoadedRef.current = true;
    } catch (error) {
      console.error("Failed to load widget layout:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadLayout();
  }, [loadLayout]);

  // Autosave av hele dashboardet med debounce for å redusere write-frekvens.
  useEffect(() => {
    // Ikke lagre før bruker finnes, load er ferdig og initial state er satt.
    if (!user || isLoading || !hasLoadedRef.current) return;

    const timeout = setTimeout(async () => {
      try {
        const docRef = doc(db, "users", user.uid, "widgetLayout", "current");
        await setDoc(docRef, {
          activeWidgets,
          customButtonConfigs,
          layouts,
          widgetLocks,
          widgetSurfaceColor,
          widgetBorderColor,
          widgetTextColor,
          widgetOpacity,
          widgetBorderWidth,
          widgetSizeMode,
          dashboardBackgroundId,
          customVideoBackgroundUrl: normalizePersistedVideoUrl(
            customVideoBackgroundUrl
          ),
          dashboardPresets: dashboardPresets.map(sanitizePresetForPersistence),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Failed to save widget layout:", error);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [
    user,
    activeWidgets,
    customButtonConfigs,
    layouts,
    widgetLocks,
    widgetSurfaceColor,
    widgetBorderColor,
    widgetTextColor,
    widgetOpacity,
    widgetBorderWidth,
    widgetSizeMode,
    dashboardBackgroundId,
    customVideoBackgroundUrl,
    dashboardPresets,
    isLoading,
  ]);

  const persistPresetsImmediately = useCallback(
    async (nextPresets: DashboardPreset[]) => {
      // Presets lagres direkte (merge) for rask respons i preset-UI.
      if (!user || isLoading || !hasLoadedRef.current) return;

      try {
        const docRef = doc(db, "users", user.uid, "widgetLayout", "current");
        await setDoc(
          docRef,
          {
            dashboardPresets: nextPresets.map(sanitizePresetForPersistence),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("Failed to save dashboard presets:", error);
      }
    },
    [isLoading, user]
  );

  const saveCurrentAsPreset = useCallback((name?: string) => {
    const trimmedName = name?.trim() ?? "";

    // Snapshot av hele dashboard-state på lagringstidspunktet.
    const newPreset: DashboardPreset = {
      id: createDashboardPresetId(),
      name: trimmedName || `Preset ${dashboardPresets.length + 1}`,
      activeWidgets: [...activeWidgets],
      layouts: { ...layouts },
      widgetLocks: { ...widgetLocks },
      customButtonConfigs: { ...customButtonConfigs },
      widgetSurfaceColor,
      widgetBorderColor,
      widgetTextColor,
      widgetOpacity,
      widgetBorderWidth,
      widgetSizeMode,
      dashboardBackgroundId,
      customVideoBackgroundUrl: normalizePersistedVideoUrl(customVideoBackgroundUrl),
      createdAt: Date.now(),
    };

    const nextPresets = [newPreset, ...dashboardPresets].slice(0, 30);
    setDashboardPresets(nextPresets);
    void persistPresetsImmediately(nextPresets);

    return newPreset.id;
  }, [
    activeWidgets,
    customButtonConfigs,
    customVideoBackgroundUrl,
    dashboardBackgroundId,
    dashboardPresets.length,
    dashboardPresets,
    layouts,
    widgetLocks,
    persistPresetsImmediately,
    widgetBorderColor,
    widgetTextColor,
    widgetOpacity,
    widgetBorderWidth,
    widgetSizeMode,
    widgetSurfaceColor,
  ]);

  const applyDashboardPreset = useCallback((presetId: string) => {
    const preset = dashboardPresets.find((item) => item.id === presetId);
    if (!preset) return false;

    // Rehydrerer dashboard-state fra valgt preset.
    setActiveWidgets([...preset.activeWidgets]);
    setLayouts({ ...preset.layouts });
    setWidgetLocks({ ...preset.widgetLocks });
    setCustomButtonConfigs({ ...preset.customButtonConfigs });
    setWidgetSurfaceColor(preset.widgetSurfaceColor);
    setWidgetBorderColor(preset.widgetBorderColor);
    setWidgetTextColor(preset.widgetTextColor);
    setWidgetOpacity(preset.widgetOpacity);
    setWidgetBorderWidth(preset.widgetBorderWidth);
    setWidgetSizeMode(preset.widgetSizeMode);
    setDashboardBackgroundId(preset.dashboardBackgroundId);
    setCustomVideoBackgroundUrl(preset.customVideoBackgroundUrl);

    return true;
  }, [dashboardPresets]);

  const deleteDashboardPreset = useCallback((presetId: string) => {
    const nextPresets = dashboardPresets.filter((preset) => preset.id !== presetId);
    setDashboardPresets(nextPresets);
    void persistPresetsImmediately(nextPresets);
  }, [dashboardPresets, persistPresetsImmediately]);

  // Toggle a widget on/off
  const toggleWidget = useCallback((id: string) => {
    // Notater er instansbaserte, derfor opprettes alltid ny unik widget-ID.
    if (id === "notes") {
      const noteId = createNotesWidgetId();

      setActiveWidgets((prev) => [...prev, noteId]);
      setLayouts((prev) => ({
        ...prev,
        [noteId]: createCenteredLayout("notes", prev),
      }));
      setWidgetLocks((prev) => ({ ...prev, [noteId]: false }));
      return;
    }

    setActiveWidgets((prev) => {
      const exists = prev.includes(id);
      return exists ? prev.filter((widgetId) => widgetId !== id) : [...prev, id];
    });

    setLayouts((prev) => {
      // Eksisterende widget-posisjon beholdes ved toggle on/off.
      if (prev[id]) return prev;
      const defaultLayout = DEFAULT_LAYOUTS[id]
        ? createCenteredLayout(id, prev)
        : undefined;
      return defaultLayout ? { ...prev, [id]: defaultLayout } : prev;
    });
  }, []);

  // Update widget layouts (e.g., after dragging/resizing)
  const updateLayout = useCallback((newLayouts: Record<string, LayoutItem>) => {
    setLayouts(newLayouts);
  }, []);

  // Add a new custom button
  const addCustomButton = useCallback((config: CustomButtonConfig) => {
    const id = createCustomButtonId();

    // Nye custom knapper spawner sentrert og starter ulåst.
    setActiveWidgets((prev) => [...prev, id]);
    setCustomButtonConfigs((prev) => ({ ...prev, [id]: config }));
    setLayouts((prev) => ({
      ...prev,
      [id]: createCenteredLayout("customButton", prev),
    }));
    setWidgetLocks((prev) => ({ ...prev, [id]: false }));

    return id;
  }, []);

  // Remove a custom button
  const removeCustomButton = useCallback((id: string) => {
    // Rydder opp alle referanser til widgeten i alle relevante state-map-er.
    setActiveWidgets((prev) => prev.filter((widgetId) => widgetId !== id));
    setCustomButtonConfigs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setLayouts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setWidgetLocks((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const toggleWidgetLock = useCallback((widgetId: string) => {
    // Lås toggles per widget-ID.
    setWidgetLocks((prev) => ({
      ...prev,
      [widgetId]: !prev[widgetId],
    }));
  }, []);

  return {
    activeWidgets,
    customButtonConfigs,
    layouts,
    widgetLocks,
    widgetSurfaceColor,
    widgetBorderColor,
    widgetTextColor,
    widgetOpacity,
    widgetBorderWidth,
    widgetSizeMode,
    dashboardBackgroundId,
    customVideoBackgroundUrl,
    dashboardPresets,
    isLoading,
    toggleWidget,
    updateLayout,
    addCustomButton,
    removeCustomButton,
    toggleWidgetLock,
    setWidgetSurfaceColor,
    setWidgetBorderColor,
    setWidgetTextColor,
    setWidgetOpacity,
    setWidgetBorderWidth,
    setWidgetSizeMode,
    setDashboardBackgroundId,
    setCustomVideoBackgroundUrl,
    saveCurrentAsPreset,
    applyDashboardPreset,
    deleteDashboardPreset,
  };
}
