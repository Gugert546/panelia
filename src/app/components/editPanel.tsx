import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import AddCustomButtonModal from "./AddCustomButtonModal";
import type {
  CustomBackgroundMediaType,
  CustomButtonConfig,
  DashboardPreset,
  DashboardBackgroundId,
  WidgetSizeMode,
} from "../features/dashboard/hooks/useWidgetsState";
import { useFontSize } from '../providers/themeProviders';
import { useLanguage } from '../providers/languageProvider';
import {
  detectBackgroundMediaType,
  uploadBackgroundMedia,
  validateFileSize,
} from "../../lib/firebase/storage";
import { useAuth } from "../features/auth/useAuth";
import paneliabgmashup from "../../assets/panelia-bg/paneliabgmashup.png";
import sol1 from "../../assets/panelia-bg/Sol 1.png";
import sol2 from "../../assets/panelia-bg/Sol 2.png";
import sol3 from "../../assets/panelia-bg/Sol 3.png";
import natt1 from "../../assets/panelia-bg/Natt 1.png";
import natt2 from "../../assets/panelia-bg/Natt 2.png";
import natt3 from "../../assets/panelia-bg/Natt 3.png";


type Widget = {
  id: string;
  label: string;
  icon?: string;
};

type EditPanelProps = {
  open: boolean;
  onClose: () => void;
  onFocusSidebar?: () => void;
  availableWidgets: readonly Widget[];
  activeWidgets: string[];
  toggleWidget: (id: string) => void;
  customButtonConfigs: Record<string, CustomButtonConfig>;
  removeCustomButton: (id: string) => void;
  widgetSurfaceColor: string;
  setWidgetSurfaceColor: (color: string) => void;
  widgetBorderColor: string;
  setWidgetBorderColor: (color: string) => void;
  widgetTextColor: string;
  setWidgetTextColor: (color: string) => void;
  widgetOpacity: number;
  setWidgetOpacity: (opacity: number) => void;
  widgetBorderWidth: number;
  setWidgetBorderWidth: (width: number) => void;
  widgetSizeMode: WidgetSizeMode;
  setWidgetSizeMode: (mode: WidgetSizeMode) => void;
  dashboardBackgroundId: DashboardBackgroundId;
  setDashboardBackgroundId: (backgroundId: DashboardBackgroundId) => void;
  setCustomBackgroundUrl: (url: string) => void;
  setCustomBackgroundType: (type: CustomBackgroundMediaType) => void;
  dashboardPresets: DashboardPreset[];
  saveCurrentAsPreset: (name?: string) => string;
  applyDashboardPreset: (presetId: string) => boolean;
  deleteDashboardPreset: (presetId: string) => void;
  clearUnlockedWidgetStyles: () => void;
  clearAllWidgetStyles: () => void;
};

export type EditPanelHandle = {
  focusFirstWidget: () => void;
};

const BACKGROUND_OPTIONS: Array<{
  id: DashboardBackgroundId;
  labelKey: string;
  preview?: string;
}> = [
  { id: "defaultbg", labelKey: "editPanel.paneliabgmashup", preview: paneliabgmashup },
  { id: "sol1", labelKey: "editPanel.backgroundSol1", preview: sol1 },
  { id: "sol2", labelKey: "editPanel.backgroundSol2", preview: sol2 },
  { id: "sol3", labelKey: "editPanel.backgroundSol3", preview: sol3 },
  { id: "natt1", labelKey: "editPanel.backgroundNatt1", preview: natt1 },
  { id: "natt2", labelKey: "editPanel.backgroundNatt2", preview: natt2 },
  { id: "natt3", labelKey: "editPanel.backgroundNatt3", preview: natt3 },
];

const DEFAULT_WIDGET_SURFACE_COLOR = "rgba(255,255,255,0.15)";
const DEFAULT_WIDGET_BORDER_COLOR = "rgba(255,255,255,0.35)";
const DEFAULT_WIDGET_TEXT_COLOR = "#000000";
const DEFAULT_WIDGET_OPACITY = 1;
const DEFAULT_WIDGET_BORDER_WIDTH = 1;
const DEFAULT_WIDGET_SIZE_MODE: WidgetSizeMode = "medium";
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 22;

function toColorInputValue(value: string) {
  const trimmed = value.trim();

  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    if (trimmed.length === 4) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }

    return trimmed;
  }

  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i
  );

  if (rgbaMatch) {
    const [, red, green, blue] = rgbaMatch;
    return `#${[red, green, blue]
      .map((channel) => Number(channel).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  return "#ffffff";
}

function getColorAlpha(value: string) {
  const trimmed = value.trim();
  const rgbaMatch = trimmed.match(
    /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/i
  );

  if (rgbaMatch) {
    return Number(rgbaMatch[1]);
  }

  return 1;
}

function withAlpha(color: string, alpha: number) {
  const normalizedColor = toColorInputValue(color);
  const hex = normalizedColor.slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${red},${green},${blue},${alpha})`;
}

export default forwardRef<EditPanelHandle, EditPanelProps>(function EditPanel({
  open,
  onClose,
  onFocusSidebar,
  availableWidgets,
  activeWidgets,
  toggleWidget,
  customButtonConfigs,
  removeCustomButton,
  widgetSurfaceColor,
  setWidgetSurfaceColor,
  widgetBorderColor,
  setWidgetBorderColor,
  widgetTextColor: selectedWidgetTextColor,
  setWidgetTextColor,
  setWidgetOpacity,
  widgetBorderWidth,
  setWidgetBorderWidth,

  setWidgetSizeMode,
  dashboardBackgroundId,
  setDashboardBackgroundId,
  setCustomBackgroundUrl,
  setCustomBackgroundType,
  dashboardPresets,
  saveCurrentAsPreset,
  applyDashboardPreset,
  deleteDashboardPreset,
  clearUnlockedWidgetStyles,
  clearAllWidgetStyles,
}: EditPanelProps, ref) {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"widgets" | "background">("widgets");
  const [presetName, setPresetName] = useState("");
  const [focusedColorButton, setFocusedColorButton] = useState<"widget" | "border" | "text" | null>(null);
  const [activeSlider, setActiveSlider] = useState<"fontSize" | "opacity" | "borderWidth" | null>(null);
  const widgetItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const norwegianButtonRef = useRef<HTMLButtonElement | null>(null);
  const englishButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const widgetsTabButtonRef = useRef<HTMLButtonElement | null>(null);
  const backgroundTabButtonRef = useRef<HTMLButtonElement | null>(null);
  const customBackgroundInputRef = useRef<HTMLInputElement | null>(null);
  const fontSizeSliderRef = useRef<HTMLInputElement | null>(null);
  const widgetColorResetRef = useRef<HTMLButtonElement | null>(null);
  const widgetColorButtonRef = useRef<HTMLButtonElement | null>(null);
  const widgetColorInputRef = useRef<HTMLInputElement | null>(null);
  const widgetOpacitySliderRef = useRef<HTMLInputElement | null>(null);
  const borderColorResetRef = useRef<HTMLButtonElement | null>(null);
  const borderColorButtonRef = useRef<HTMLButtonElement | null>(null);
  const borderColorInputRef = useRef<HTMLInputElement | null>(null);
  const borderWidthSliderRef = useRef<HTMLInputElement | null>(null);
  const textColorResetRef = useRef<HTMLButtonElement | null>(null);
  const textColorButtonRef = useRef<HTMLButtonElement | null>(null);
  const textColorInputRef = useRef<HTMLInputElement | null>(null);
  const resetAllButtonRef = useRef<HTMLButtonElement | null>(null);
  const uploadBgButtonRef = useRef<HTMLButtonElement | null>(null);
  const presetNameInputRef = useRef<HTMLInputElement | null>(null);
  const savePresetButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedSliderRef = useRef<HTMLElement | null>(null);
  const lastFocusedScrollSourceRef = useRef<HTMLElement | null>(null);
  const backgroundOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadBackgroundError, setUploadBackgroundError] = useState("");
  const { fontSize: widgetFontSize, setFontSize } = useFontSize();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const widgetSurfaceAlpha = getColorAlpha(widgetSurfaceColor);
  const panelSurfaceColor = "rgba(255,255,255,0.24)";
  const panelBorderColor = "rgba(15,23,42,0.22)";
  const panelTextColor = "#0f172a";
  const widgetTextColor = panelTextColor;
  const fontSize = 14;
  const notesWidgetCount = activeWidgets.filter(
    (activeWidgetId) => activeWidgetId === "notes" || activeWidgetId.startsWith("notes:")
  ).length;

  useEffect(() => {
    setModalOpen(false);
    setViewMode("widgets");
  }, [open]);

  useEffect(() => {
    if (open) return;

    const activeElement = document.activeElement as HTMLElement | null;
    if (!activeElement || !panelRef.current?.contains(activeElement)) return;

    requestAnimationFrame(() => {
      onFocusSidebar?.();
    });
  }, [open, onFocusSidebar]);

  useImperativeHandle(ref, () => ({
    focusFirstWidget: () => {
      setViewMode("widgets");
      requestAnimationFrame(() => {
        const firstWidget = widgetItemRefs.current[0];
        if (firstWidget) {
          firstWidget.focus();
          return;
        }
        widgetsTabButtonRef.current?.focus();
      });
    },
  }), []);

  useEffect(() => {
    if (!open || viewMode !== "widgets") return;

    const handleWidgetListArrows = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const inEditPanel = activeElement?.closest('[data-arrow-scope="edit-panel"]');
      if (!inEditPanel) return;

      const refs = widgetItemRefs.current.filter(
        (item): item is HTMLButtonElement => Boolean(item)
      );
      if (refs.length === 0) return;

      const focusedIndex = refs.findIndex((item) => item === document.activeElement);
      if (focusedIndex === -1) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        refs[(focusedIndex + 1) % refs.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (focusedIndex === 0) {
          widgetsTabButtonRef.current?.focus();
        } else {
          refs[(focusedIndex - 1 + refs.length) % refs.length]?.focus();
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onFocusSidebar?.();
      }
    };

    window.addEventListener("keydown", handleWidgetListArrows);
    return () => window.removeEventListener("keydown", handleWidgetListArrows);
  }, [open, viewMode, onFocusSidebar]);

  useEffect(() => {
    if (!open) return;

    const focusTarget = (target: "norsk" | "english" | "close" | "widgets" | "background") => {
      if (target === "norsk") {
        norwegianButtonRef.current?.focus();
        return;
      }
      if (target === "english") {
        englishButtonRef.current?.focus();
        return;
      }
      if (target === "close") {
        closeButtonRef.current?.focus();
        return;
      }
      if (target === "widgets") {
        setViewMode("widgets");
        requestAnimationFrame(() => widgetsTabButtonRef.current?.focus());
        return;
      }

      setViewMode("background");
      requestAnimationFrame(() => backgroundTabButtonRef.current?.focus());
    };

    const handleTopButtonArrows = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      const activeElement = document.activeElement as HTMLElement | null;
      const inEditPanel = activeElement?.closest('[data-arrow-scope="edit-panel"]');
      if (!inEditPanel) return;

      const currentKey =
        activeElement === norwegianButtonRef.current
          ? "norsk"
          : activeElement === englishButtonRef.current
            ? "english"
            : activeElement === closeButtonRef.current
              ? "close"
            : activeElement === widgetsTabButtonRef.current
              ? "widgets"
              : activeElement === backgroundTabButtonRef.current
                ? "background"
                : null;

      if (!currentKey) return;

      if (currentKey === "background" && e.key === "ArrowDown" && viewMode === "background") {
        e.preventDefault();
        fontSizeSliderRef.current?.focus();
        return;
      }

      if (currentKey === "widgets" && e.key === "ArrowDown") {
        const clockIndex = availableWidgets.findIndex((widget) => widget.id === "clock");
        const clockButton = clockIndex >= 0 ? widgetItemRefs.current[clockIndex] : null;
        if (clockButton) {
          e.preventDefault();
          clockButton.focus();
          return;
        }

        const refs = widgetItemRefs.current.filter(
          (item): item is HTMLButtonElement => Boolean(item)
        );
        if (refs.length > 0) {
          e.preventDefault();
          refs[0].focus();
          return;
        }
      }

      const nextMap: Record<"norsk" | "english" | "close" | "widgets" | "background", {
        ArrowUp: "norsk" | "english" | "close" | "widgets" | "background";
        ArrowDown: "norsk" | "english" | "close" | "widgets" | "background";
        ArrowLeft: "norsk" | "english" | "close" | "widgets" | "background";
        ArrowRight: "norsk" | "english" | "close" | "widgets" | "background";
      }> = {
        norsk: {
          ArrowUp: "widgets",
          ArrowDown: "widgets",
          ArrowLeft: "english",
          ArrowRight: "english",
        },
        english: {
          ArrowUp: "background",
          ArrowDown: "background",
          ArrowLeft: "norsk",
          ArrowRight: "close",
        },
        close: {
          ArrowUp: "background",
          ArrowDown: "background",
          ArrowLeft: "english",
          ArrowRight: "norsk",
        },
        widgets: {
          ArrowUp: "norsk",
          ArrowDown: "norsk",
          ArrowLeft: "background",
          ArrowRight: "background",
        },
        background: {
          ArrowUp: "english",
          ArrowDown: "english",
          ArrowLeft: "widgets",
          ArrowRight: "close",
        },
      };

      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        return;
      }

      e.preventDefault();
      const next = nextMap[currentKey][e.key as "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"];
      focusTarget(next);
    };

    window.addEventListener("keydown", handleTopButtonArrows);
    return () => window.removeEventListener("keydown", handleTopButtonArrows);
  }, [open, availableWidgets, viewMode]);

  useEffect(() => {
    if (!open || viewMode !== "background") return;

    const bgSettingRefs = [
      fontSizeSliderRef,
      widgetColorResetRef,
      widgetColorButtonRef,
      widgetOpacitySliderRef,
      borderColorResetRef,
      borderColorButtonRef,
      borderWidthSliderRef,
      textColorResetRef,
      textColorButtonRef,
      resetAllButtonRef,
      uploadBgButtonRef,
      presetNameInputRef,
    ];

    const sliderRefList = [fontSizeSliderRef, widgetOpacitySliderRef, borderWidthSliderRef] as const;
    const sliderKeyList = ["fontSize", "opacity", "borderWidth"] as const;

    const handleBgSettingsArrows = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const activeElement = document.activeElement as HTMLElement | null;
      const inEditPanel = activeElement?.closest('[data-arrow-scope="edit-panel"]');
      if (!inEditPanel) return;

      // Slider activation logic
      const focusedSliderIdx = sliderRefList.findIndex((r) => r.current === activeElement);
      if (focusedSliderIdx !== -1) {
        const sliderKey = sliderKeyList[focusedSliderIdx];

        if (activeSlider === sliderKey) {
          // Activated: ArrowUp/Down blocked
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            return;
          }
          // Activated: Enter or Esc deactivates; ArrowLeft/Right adjusts (passed through)
          if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            setActiveSlider(null);
            if (e.key === "Escape") {
              // Navigate away: move to previous element or background tab
              const elements = bgSettingRefs
                .map((r) => r.current as HTMLElement | null)
                .filter((el): el is HTMLElement => Boolean(el));
              const idx = elements.findIndex((el) => el === activeElement);
              if (idx <= 0) {
                backgroundTabButtonRef.current?.focus();
              } else {
                elements[idx - 1]?.focus();
              }
            }
          }
          return;
        }

        // Not activated: Enter activates; ArrowLeft/Right blocked; Esc navigates away
        if (e.key === "Enter") {
          e.preventDefault();
          setActiveSlider(sliderKey);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          const elements = bgSettingRefs
            .map((r) => r.current as HTMLElement | null)
            .filter((el): el is HTMLElement => Boolean(el));
          const idx = elements.findIndex((el) => el === activeElement);
          if (idx <= 0) {
            backgroundTabButtonRef.current?.focus();
          } else {
            elements[idx - 1]?.focus();
          }
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          lastFocusedSliderRef.current = activeElement;
          lastFocusedScrollSourceRef.current = activeElement;
          scrollContainerRef.current?.focus();
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          return;
        }
        // ArrowUp/Down fall through to navigation below
      }

      // ArrowLeft from scroll container: navigate back to the control that sent focus here
      if (e.key === "ArrowLeft" && document.activeElement === scrollContainerRef.current) {
        e.preventDefault();
        lastFocusedScrollSourceRef.current?.focus();
        return;
      }

      const elements = bgSettingRefs
        .map((r) => r.current as HTMLElement | null)
        .filter((el): el is HTMLElement => Boolean(el));
      const focusedIndex = elements.findIndex((el) => el === document.activeElement);

      // ArrowRight: reset → color button. ArrowLeft: color button → reset.
      // Must be checked before focusedIndex guard since color buttons are not in bgSettingRefs.
      if (e.key === "ArrowRight") {
        if (document.activeElement === widgetColorResetRef.current) {
          e.preventDefault();
          widgetColorButtonRef.current?.focus();
          return;
        }
        if (document.activeElement === borderColorResetRef.current) {
          e.preventDefault();
          borderColorButtonRef.current?.focus();
          return;
        }
        if (document.activeElement === textColorResetRef.current) {
          e.preventDefault();
          textColorButtonRef.current?.focus();
          return;
        }
        if (
          document.activeElement === widgetColorButtonRef.current ||
          document.activeElement === borderColorButtonRef.current ||
          document.activeElement === textColorButtonRef.current
        ) {
          e.preventDefault();
          lastFocusedScrollSourceRef.current = document.activeElement as HTMLElement;
          scrollContainerRef.current?.focus();
          return;
        }
        if (
          document.activeElement === resetAllButtonRef.current ||
          document.activeElement === uploadBgButtonRef.current
        ) {
          e.preventDefault();
          lastFocusedScrollSourceRef.current = document.activeElement as HTMLElement;
          scrollContainerRef.current?.focus();
          return;
        }
        if (document.activeElement === presetNameInputRef.current) {
          e.preventDefault();
          savePresetButtonRef.current?.focus();
          return;
        }
        if (document.activeElement === savePresetButtonRef.current) {
          e.preventDefault();
          lastFocusedScrollSourceRef.current = document.activeElement as HTMLElement;
          scrollContainerRef.current?.focus();
          return;
        }
      } else if (e.key === "ArrowLeft") {
        if (document.activeElement === savePresetButtonRef.current) {
          e.preventDefault();
          presetNameInputRef.current?.focus();
          return;
        }
        if (document.activeElement === widgetColorButtonRef.current) {
          e.preventDefault();
          widgetColorResetRef.current?.focus();
          return;
        }
        if (document.activeElement === borderColorButtonRef.current) {
          e.preventDefault();
          borderColorResetRef.current?.focus();
          return;
        }
        if (document.activeElement === textColorButtonRef.current) {
          e.preventDefault();
          textColorResetRef.current?.focus();
          return;
        }
      }

      // ArrowUp from savePresetButtonRef: go to uploadBgButtonRef (item above in the list)
      if (e.key === "ArrowUp" && document.activeElement === savePresetButtonRef.current) {
        e.preventDefault();
        uploadBgButtonRef.current?.focus();
        return;
      }

      // ArrowUp from color buttons: skip reset button, go to element above the row
      if (e.key === "ArrowUp") {
        if (document.activeElement === widgetColorButtonRef.current) {
          e.preventDefault();
          fontSizeSliderRef.current?.focus();
          return;
        }
        if (document.activeElement === borderColorButtonRef.current) {
          e.preventDefault();
          widgetOpacitySliderRef.current?.focus();
          return;
        }
        if (document.activeElement === textColorButtonRef.current) {
          e.preventDefault();
          borderWidthSliderRef.current?.focus();
          return;
        }
      }

      // Background option button navigation
      const bgOptionIdx = backgroundOptionRefs.current.findIndex((r) => r === document.activeElement);
      if (bgOptionIdx !== -1) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = backgroundOptionRefs.current[bgOptionIdx + 1];
          if (next) next.focus();
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (bgOptionIdx > 0) {
            backgroundOptionRefs.current[bgOptionIdx - 1]?.focus();
          } else {
            savePresetButtonRef.current?.focus();
          }
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          savePresetButtonRef.current?.focus();
          return;
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          return;
        }
      }

      if (focusedIndex === -1) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (focusedIndex < elements.length - 1) {
          elements[focusedIndex + 1]?.focus();
        } else {
          // Last bgSettingRef item (presetNameInputRef): go to first background option
          backgroundOptionRefs.current[0]?.focus();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (focusedIndex === 0) {
          backgroundTabButtonRef.current?.focus();
        } else {
          elements[focusedIndex - 1]?.focus();
        }
      }
    };

    // ArrowDown from savePresetButtonRef → first background option
    const handleSavePresetArrowDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown") return;
      if (document.activeElement !== savePresetButtonRef.current) return;
      const inEditPanel = (document.activeElement as HTMLElement)?.closest('[data-arrow-scope="edit-panel"]');
      if (!inEditPanel) return;
      e.preventDefault();
      backgroundOptionRefs.current[0]?.focus();
    };
    window.addEventListener("keydown", handleSavePresetArrowDown);

    window.addEventListener("keydown", handleBgSettingsArrows);
    return () => {
      window.removeEventListener("keydown", handleBgSettingsArrows);
      window.removeEventListener("keydown", handleSavePresetArrowDown);
    };
  }, [open, viewMode, activeSlider]);
  
  const handleCustomBackgroundUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user) {
      setUploadBackgroundError(t('editPanel.uploadNotSignedIn') || "Please sign in first");
      return;
    }

    const mediaType = detectBackgroundMediaType(file) as CustomBackgroundMediaType | null;

    if (!mediaType) {
      setUploadBackgroundError(
        t('editPanel.unsupportedBackgroundFile') ||
          "Unsupported file type. Please upload an image or video."
      );
      event.target.value = "";
      return;
    }

    const validation = validateFileSize(file);
    if (!validation.valid) {
      setUploadBackgroundError(t('editPanel.fileTooLarge') || validation.error || "File is too large");
      event.target.value = "";
      return;
    }

    setUploadingBackground(true);
    setUploadBackgroundError("");

    try {
      const downloadUrl = await uploadBackgroundMedia(file, mediaType);
      setCustomBackgroundUrl(downloadUrl);
      setCustomBackgroundType(mediaType);
      setDashboardBackgroundId("customMedia");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setUploadBackgroundError(errorMsg);
    } finally {
      setUploadingBackground(false);
      event.target.value = "";
    }
  };

  const handleResetWidgetStyle = () => {
    setWidgetSurfaceColor(DEFAULT_WIDGET_SURFACE_COLOR);
    setWidgetBorderColor(DEFAULT_WIDGET_BORDER_COLOR);
    setWidgetTextColor(DEFAULT_WIDGET_TEXT_COLOR);
    setWidgetOpacity(DEFAULT_WIDGET_OPACITY);
    setWidgetBorderWidth(DEFAULT_WIDGET_BORDER_WIDTH);
    setWidgetSizeMode(DEFAULT_WIDGET_SIZE_MODE);
    setFontSize(DEFAULT_FONT_SIZE);
  };

  const handleSavePreset = () => {
    saveCurrentAsPreset(presetName);
    setPresetName("");
  };

  const handleApplyPreset = (presetId: string) => {
    applyDashboardPreset(presetId);
  };
  //farge på elementer i tema/widget meny
  const backgroundColor = panelSurfaceColor;
  //border-radius på elementer i tema menyen
  const borderRadiusThemeElements =8;
  //padding på elementer i tema-menyen
  const themeElementsPadding ='8px 12px';
  //størrelser på iconene i widget-menyen
  const widgetIconSize = Math.max(fontSize + 8, 22);
  //font størrelse på titler i tema-menyen
  const titleTextSize= Math.max(fontSize+ 3);
  //font størrelse på tittelen på sidemenyen
  const bigTitleFontSize= Math.max(fontSize+7);
  //farge på knapper
  const buttonColor = "#d3d3d36e";
  //border rundt knapper
  const buttonBorder = `1px solid ${panelBorderColor}`;
  //border rundet highlightede knapper
  const buttonBorderHighlight= "2px solid #ffffffe0"

  const buttonColorHighlight = "#ffffffb7"

  function handleResetTextColor(): void {
    setWidgetTextColor(DEFAULT_WIDGET_TEXT_COLOR);
  }

  function handleResetBorderColor(): void{
    setWidgetBorderColor(DEFAULT_WIDGET_BORDER_COLOR);
  }

  function handleResetWidgetColor(): void{
    setWidgetSurfaceColor(DEFAULT_WIDGET_SURFACE_COLOR);
  }

  return (
    <div
      ref={panelRef}
      data-arrow-scope="edit-panel"
      aria-hidden={!open}
      style={{
        position: "fixed",
        top: 0,
        left: open ? 86 : "-50%",
        width: "20%",
        height: "100%",
        backdropFilter: "blur(10px)",
        transition: "left 0.3s ease",
        zIndex: 999,
        padding: 24,
        boxShadow: "4px 0 12px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        visibility: open ? "visible" : "hidden",
        pointerEvents: open ? "auto" : "none",
      }}
    >

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            ref={norwegianButtonRef}
            onClick={() => setLanguage('no')}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: language === 'no' ? buttonBorderHighlight: buttonBorder,
              background: language === 'no' ? buttonColorHighlight : buttonColor,
              cursor: 'pointer',
              fontSize,
              color:widgetTextColor,
            }}
            title="Norsk"
          >
            Norsk
          </button>
          <button
            ref={englishButtonRef}
            onClick={() => setLanguage('en')}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: language === 'en' ? buttonBorderHighlight: buttonBorder,
              background: language === 'en' ? buttonColorHighlight : buttonColor,
              cursor: 'pointer',
              fontSize,
              color:widgetTextColor,
            }}
            title="English"
          >
            English
          </button>
        </div>
        <button ref={closeButtonRef} style={{ 
          fontSize,
          background: buttonColor,
          borderRadius: 4,
          border: buttonBorder,
          padding: '4px 8px',
          color:widgetTextColor,

        }}onClick={onClose}>{t('editPanel.close')}</button>
      </div>

      <h2 style={{fontSize:bigTitleFontSize, color:widgetTextColor,}}>
        {viewMode === "widgets"
          ? t('editPanel.selectWidgets')
          : t('editPanel.modeBackground')}
      </h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        <button
          ref={widgetsTabButtonRef}
          onClick={() => setViewMode("widgets")}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: viewMode === "widgets" ? buttonBorderHighlight : buttonBorder,
            background: viewMode === "widgets" ? buttonColorHighlight : buttonColor,
            cursor: "pointer",
            fontSize,
            color:widgetTextColor,
          }}
        >
          {t('editPanel.modeWidgets')}
        </button>
        <button
          ref={backgroundTabButtonRef}
          onClick={() => setViewMode("background")}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: viewMode === "background" ? buttonBorderHighlight : buttonBorder,
            background: viewMode === "background" ? buttonColorHighlight : buttonColor,
            cursor: "pointer",
            fontSize,
            color:widgetTextColor,
          }}
        >
          {t('editPanel.modeBackground')}
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        tabIndex={-1}
        style={{
          marginTop: 20,
          overflowY: "auto",
          flex: 1,
          paddingRight: 6,
          outline: "none",
        }}
      >

        {viewMode === "widgets" &&
          availableWidgets.map((widget, index) => {
            const widgetLabel =
              widget.id === "notes" && notesWidgetCount > 0
                ? `${widget.label} (${notesWidgetCount})`
                : widget.label;

            const isActive =
              widget.id === "notes"
                ? activeWidgets.some((activeWidgetId) => activeWidgetId === "notes" || activeWidgetId.startsWith("notes:"))
                : activeWidgets.includes(widget.id);

            return (
              <button
                //alle widgets
                key={widget.id}
                type="button"
                ref={(element) => { widgetItemRefs.current[index] = element; }}
                onClick={() => toggleWidget(widget.id)}
                style={{
                  padding: 12,
                  width: "90%",
                  marginBottom: 10,
                  borderRadius: 8,
                  cursor: "pointer",
                  background:backgroundColor,
                  border: isActive
                    ? buttonBorderHighlight
                    : buttonBorder,
                    color:widgetTextColor,
                    textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize }}>{widgetLabel}</span>
                  <span
                    className="material-symbols-rounded"
                    aria-hidden="true"
                    style={{
                      fontSize: widgetIconSize,
                      lineHeight: 1,
                      opacity: 0.85,
                    }}
                  >
                    {widget.icon ?? "widgets"}
                  </span>
                </div>
                {isActive && ""}
                </button>
            );
          })}
        
        {viewMode === "widgets" && (
            <button
              type="button"
              ref={(element) => { widgetItemRefs.current[availableWidgets.length] = element; }}
            onClick={() => setModalOpen(true)}
            style={{
              padding: 12,
              width: "90%",
              marginBottom: 10,
              borderRadius: 8,
              cursor: "pointer",
              background: backgroundColor,
              color:widgetTextColor,
              border: buttonBorder,
              textAlign: "left",
              //border: "1px solid #ddd"
            }}
          >
            {t('editPanel.addCustomButton')}
          </button>
        )}

        {viewMode === "background" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              width: "90%",
            }}
          >  
        <div style={{
          //skriftstørrelse
           background: backgroundColor,
           borderRadius:borderRadiusThemeElements,
           padding: themeElementsPadding,
           }}>
          <h3 style={{
            fontSize:titleTextSize,
            margin:"auto",
            color:widgetTextColor,

          }}>{t('editPanel.fontSize')}</h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 8,
              }}
            >
              <input
                ref={fontSizeSliderRef}
                type="range"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                step={1}
                value={widgetFontSize}
                onChange={(event) => setFontSize(Number(event.target.value))}
                onBlur={() => setActiveSlider(null)}
                aria-label={t('editPanel.fontSize')}
                style={{
                  flex: 1,
                  accentColor: widgetTextColor,
                  cursor: "pointer",
                  outline: activeSlider === "fontSize" ? `2px solid ${buttonColorHighlight}` : undefined,
                  borderRadius: 4,
                }}
              />
              <span
                style={{
                  minWidth: 32,
                  fontSize,
                  color: widgetTextColor,
                  textAlign: "right",
                }}
              >
                {widgetFontSize}
              </span>
            </div>
        </div>
          <div  style={{
            //velg Widget farge
            background: backgroundColor,
            borderRadius:borderRadiusThemeElements,
            padding: themeElementsPadding,
            }} >
            <label style={{ fontSize:titleTextSize, fontWeight: 600,color:widgetTextColor, }}>
              {t('editPanel.widgetColorMenu')}
            </label>
            <div
             style={{
              display: "flex",
              gap:5,


             }}
            
            >
             <button 
                      ref={widgetColorResetRef}
                      onClick={handleResetWidgetColor}
                      style={{
                        border: buttonBorder,
                        background: buttonColor,
                        color:widgetTextColor,
                        borderRadius: 10,
                        position: "relative",
                        width: "fit-content",
                        cursor: "pointer",
                        marginTop: 5,
                        }}>
                          {t('editPanel.reset')}
                      

                    </button>
            <button
              ref={widgetColorButtonRef}
              type="button"
              onClick={() => widgetColorInputRef.current?.click()}
              onFocus={() => setFocusedColorButton("widget")}
              onBlur={() => setFocusedColorButton((current) => (current === "widget" ? null : current))}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "fit-content",
                padding: "8px 12px",
                borderRadius: 10,
                border: focusedColorButton === "widget" ? buttonBorderHighlight : buttonBorder,
                background: focusedColorButton === "widget" ? buttonColorHighlight : buttonColor,
                cursor: "pointer",
                marginTop:5,
                color:widgetTextColor,
              }}
            >
              <input
                ref={widgetColorInputRef}
                type="color"
                value={toColorInputValue(widgetSurfaceColor)}
                onChange={(event) =>
                  setWidgetSurfaceColor(withAlpha(event.target.value, widgetSurfaceAlpha))
                }
                aria-label={t('editPanel.widgetColorButton')}
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                  clipPath: "inset(50%)",
                  opacity: 0,
                  pointerEvents: "none",
                  color:widgetTextColor,
                }}
              />
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.3)",
                  background: widgetSurfaceColor,
                }}
              />
              <span style={{ fontSize, fontWeight: 500,color:widgetTextColor, }}>
                {t('editPanel.widgetColorButton')}
              </span>
            </button>
            </div>
            <label
              style={{
                display: "block",
                fontSize,
                fontWeight: 500,
                marginTop: 10,
                color:widgetTextColor,
              }}
            >
              {t('editPanel.widgetOpacity')}: {Math.round(widgetSurfaceAlpha * 100)}%
            </label>
            <input
              ref={widgetOpacitySliderRef}
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={widgetSurfaceAlpha}
              onChange={(event) =>
                setWidgetSurfaceColor(withAlpha(widgetSurfaceColor, Number(event.target.value)))
              }
              onBlur={() => setActiveSlider(null)}
              aria-label={t('editPanel.widgetOpacity')}
              style={{
                width: "100%",
                marginTop: 5,
                outline: activeSlider === "opacity" ? `2px solid ${buttonColorHighlight}` : undefined,
                borderRadius: 4,
              }}
            />
          </div>
            <div style={{
                //border farger
                background: backgroundColor,
                borderRadius:borderRadiusThemeElements,
                padding: themeElementsPadding,
                color:widgetTextColor,

                }}>  
              <label style={{ fontSize:titleTextSize, fontWeight: 600, marginTop: 8 }}>
                {t('editPanel.widgetBorderColorTitle')}
              </label>
            <div
              style={{
                display: "flex",
                gap: 5,
              }}
            >
                <button 
                      ref={borderColorResetRef}
                      onClick={handleResetBorderColor}
                      style={{
                        border: buttonBorder,
                        background: buttonColor,
                        color:widgetTextColor,
                        borderRadius: 10,
                        position: "relative",
                        width: "fit-content",
                        cursor: "pointer",
                        marginTop: 5,
                        }}>
                          {t('editPanel.reset')}
                      

                    </button>
                <button
                  ref={borderColorButtonRef}
                  type="button"
                  onClick={() => borderColorInputRef.current?.click()}
                  onFocus={() => setFocusedColorButton("border")}
                  onBlur={() => setFocusedColorButton((current) => (current === "border" ? null : current))}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "fit-content",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: focusedColorButton === "border" ? buttonBorderHighlight : buttonBorder,
                    background: focusedColorButton === "border" ? buttonColorHighlight : buttonColor,
                    cursor: "pointer",
                    marginTop: 5,
                  }}
                >
                  <input
                    ref={borderColorInputRef}
                    type="color"
                    value={toColorInputValue(widgetBorderColor)}
                    onChange={(event) => setWidgetBorderColor(event.target.value)}
                    aria-label={t('editPanel.widgetBorderColor')}
                    style={{
                      position: "absolute",
                      width: 1,
                      height: 1,
                      overflow: "hidden",
                      clipPath: "inset(50%)",
                      opacity: 0,
                      pointerEvents: "none",
                    }}
                  />
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      paddingBottom:10,
                      border: "1px solid rgba(0,0,0,0.3)",
                      background: widgetBorderColor,
                    }}
                  />
                  <span style={{ fontSize, fontWeight: 500 }}>
                    {t('editPanel.widgetBorderColor')}
                  </span>
                </button>
                </div>
               <label 
               style={{ 
                //border-bredde
                fontSize, 
                
                marginTop: 10 }}>
                {t('editPanel.widgetBorderWidth')}: {widgetBorderWidth}px
              </label>

              <input
                ref={borderWidthSliderRef}
                type="range"
                min={0}
                max={12}
                step={1}
                value={widgetBorderWidth}
                onChange={(event) => setWidgetBorderWidth(Number(event.target.value))}
                onBlur={() => setActiveSlider(null)}
                aria-label={t('editPanel.widgetBorderWidth')}
                style={{ 
                  width: "100%",
                  marginTop: 5,
                  outline: activeSlider === "borderWidth" ? `2px solid ${buttonColorHighlight}` : undefined,
                  borderRadius: 4,
                 }}
              />
            </div>
            <div style={{
              //tekstfarge
                background: backgroundColor,
                borderRadius:borderRadiusThemeElements,
                padding: themeElementsPadding,
                color:widgetTextColor,
                }}>
              <label style={{ fontSize:titleTextSize, fontWeight: 600, marginTop: 8 }}>
                {t('editPanel.widgetTextColor')}
              </label>
              <div
                style={{
                    display: "flex",
                    gap:5,
                  }}
                >
                <button 
                    ref={textColorResetRef}
                    onClick={handleResetTextColor}
                    style={{
                      border: buttonBorder,
                      background: buttonColor,
                      color:widgetTextColor,
                      borderRadius: 10,
                      position: "relative",
                      width: "fit-content",
                      cursor: "pointer",
                      marginTop: 5,
                      }}>
                        {t('editPanel.reset')}
                    

                  </button>  
                <button
                  ref={textColorButtonRef}
                  type="button"
                  onClick={() => textColorInputRef.current?.click()}
                  onFocus={() => setFocusedColorButton("text")}
                  onBlur={() => setFocusedColorButton((current) => (current === "text" ? null : current))}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "fit-content",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: focusedColorButton === "text" ? buttonBorderHighlight : buttonBorder,
                    background: focusedColorButton === "text" ? buttonColorHighlight : buttonColor,
                    cursor: "pointer",
                    marginTop: 5,
                  }}
                >
                  
                  <input
                    ref={textColorInputRef}
                    type="color"
                    value={toColorInputValue(selectedWidgetTextColor)}
                    onChange={(event) => setWidgetTextColor(event.target.value)}
                    aria-label={t('editPanel.widgetTextColor')}
                    style={{
                      position: "absolute",
                      width: 1,
                      height: 1,
                      overflow: "hidden",
                      clipPath: "inset(50%)",
                      opacity: 0,
                      pointerEvents: "none",
                    }}
                  />
                  <span
                  //liten sirkel
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      border: "1px solid rgba(0,0,0,0.3)",
                      background: selectedWidgetTextColor,
                    }}
                  />
                  <span style={{ fontSize, fontWeight: 500 }}>
                    {t('editPanel.widgetColorButton')}
                  </span>
                </button>
                </div>
            </div> 
            
            <div style={{
              //tilbakestill stil
              background: backgroundColor,
              borderRadius:borderRadiusThemeElements,
              padding: themeElementsPadding,
              alignItems:"center",

              }}>     
              <button
                ref={resetAllButtonRef}
                onClick={() => setResetConfirmOpen(true)}
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#f3f3f3",
                  cursor: "pointer",
                  fontWeight: 600,
                  textAlign: "left",
                  fontSize,
                  color:widgetTextColor,
                }}
              >
                {t('editPanel.resetWidgetStyle')}
              </button>
            </div>
            <div style={{
              //custom bakgrunn
              background: backgroundColor,
              borderRadius:borderRadiusThemeElements,
              padding: themeElementsPadding,
              }}>    
              <input
                ref={customBackgroundInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                onChange={handleCustomBackgroundUpload}
                style={{ display: "none" }}
              />

              <button
                ref={uploadBgButtonRef}
                onClick={() => !uploadingBackground && customBackgroundInputRef.current?.click()}
                disabled={uploadingBackground}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: uploadBackgroundError ? "1px solid #d97706" : "1px solid #ddd",
                  background: uploadBackgroundError ? "#fef3c7" : "#f3f3f3",
                  cursor: uploadingBackground ? "not-allowed" : "pointer",
                  textAlign: "left",
                  fontWeight: 600,
                  opacity: uploadingBackground ? 0.6 : 1,
                  fontSize,
                  color:widgetTextColor,
                }}
              >
                {uploadingBackground ? t('editPanel.uploading') : t('editPanel.uploadCustomBackground')}
              </button>

              {uploadBackgroundError && (
                <div
                  style={{
                    fontSize,
                    color: "#92400e",
                    background: "#fef3c7",
                    border: "1px solid #d97706",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  {uploadBackgroundError}
                </div>
              )}

              <div
                style={{
                  fontSize,
                  color:widgetTextColor,
                  background: "#f7f7f7",
                  border: "1px dashed #d1d5db",
                  borderRadius: 8,
                  padding: "8px 10px",
                  marginTop:8
                }}
              >
                {t('editPanel.customBackgroundSyncNote')}

              </div>
          </div>
            
        <div 
        // egendefinerte presets
          style={{ 
            marginTop: 1,
            background: backgroundColor,
            padding: "8px 10px",
            borderRadius: 8,
            color:widgetTextColor,
            
            }}>
          <h3 style={{fontSize:titleTextSize, }}>{t('editPanel.customPresets')}</h3>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <input
              ref={presetNameInputRef}
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder={t('editPanel.presetNamePlaceholder')}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#fff",
                fontSize,
              }}
            />

            <button
              ref={savePresetButtonRef}
              onClick={handleSavePreset}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#f3f3f3",
                cursor: "pointer",
                fontWeight: 600,
                whiteSpace: "nowrap",
                fontSize,
                color:widgetTextColor,
              }}
            >
              {t('editPanel.savePreset')}
            </button>
          </div>

          {dashboardPresets.length === 0 && (
            <div
              style={{
                fontSize,
                color: "#4b5563",
                background: "#f7f7f7",
                border: "1px dashed #d1d5db",
                borderRadius: 8,
                padding: "8px 10px",
                marginBottom: 12,
              }}
            >
              {t('editPanel.noPresets')}
            </div>
          )}

          {dashboardPresets.map((preset) => (
            <div
              key={preset.id}
              style={{
                
                borderRadius: 10,
                background: backgroundColor,
                padding: 10,
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {preset.name}
              </div>
              <div style={{ fontSize, color: "#4b5563", marginBottom: 8 }}>
                {new Date(preset.createdAt).toLocaleString()}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleApplyPreset(preset.id)}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #bcd5f7",
                    background: "#eaf4ff",
                    cursor: "pointer",
                    fontWeight: 600,
                    color:widgetTextColor,
                  }}
                >
                  {t('editPanel.applyPreset')}
                </button>

                <button
                  onClick={() => deleteDashboardPreset(preset.id)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #e5b4b4",
                    background: "#fff1f1",
                    cursor: "pointer",
                    fontWeight: 600,
                    color:widgetTextColor,
                  }}
                >
                  {t('editPanel.deletePreset')}
                </button>
              </div>
            </div>
          ))}
        </div>

            {BACKGROUND_OPTIONS.map((option, index) => {
              const selected = dashboardBackgroundId === option.id;

              if (option.preview) {
                return (
                  <button
                    key={option.id}
                    ref={(el) => { backgroundOptionRefs.current[index] = el; }}
                    onClick={() => setDashboardBackgroundId(option.id)}
                    aria-label={t(option.labelKey)}
                    style={{
                      width: "95%",
                      padding: 0,
                      borderRadius: 10,
                      background: selected ? "#eaf4ff" : backgroundColor,
                      cursor: "pointer",
                      overflow: "hidden",
                      fontSize,
                    }}
                  >
                    <img
                      src={option.preview}
                      alt=""
                      style={{
                        width: "100%",
                        height: 72,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </button>
                );
              }

              return (
                <button
                  key={option.id}
                  onClick={() => setDashboardBackgroundId(option.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,
                    border: selected ? "2px solid #4da3ff" : "1px solid #ddd",
                    background: selected ? "#eaf4ff" : "#f7f7f7",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {option.id === "customMedia" ? (
                    <div
                      style={{
                        width: 64,
                        height: 38,
                        borderRadius: 6,
                        border: "1px solid rgba(0,0,0,0.2)",
                        background: "linear-gradient(135deg, #294b82, #5f8cc7, #b2d9ff)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize,
                        fontWeight: 700,
                        color: "#eaf4ff",
                        flexShrink: 0,
                      }}
                    >
                      Media
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 38,
                        borderRadius: 6,
                        border: "1px solid rgba(0,0,0,0.2)",
                        background:
                          "linear-gradient(120deg, rgba(255,255,255,0.85), rgba(200,220,255,0.95))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize,
                        fontWeight: 600,
                        color: "#1e2d4d",
                        flexShrink: 0,
                      }}
                    >
                      Auto
                    </div>
                  )}

                  <span style={{ fontWeight: 500 }}>
                    {t(option.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

      </div>

      <AddCustomButtonModal open={modalOpen} onClose={() => setModalOpen(false)} customButtonConfigs={customButtonConfigs} removeCustomButton={removeCustomButton} />

      {resetConfirmOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
          }}
          onClick={() => setResetConfirmOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "28px 32px",
              minWidth: 320,
              maxWidth: 420,
              boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              {t('editPanel.resetWidgetStyle')}
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
              {t('editPanel.resetConfirmDescription')}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <button
                onClick={() => {
                  handleResetWidgetStyle();
                  clearUnlockedWidgetStyles();
                  setResetConfirmOpen(false);
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#0f172a",
                  textAlign: "left",
                }}
              >
                {t('editPanel.resetUnlockedWidgets')}
              </button>
              <button
                onClick={() => {
                  handleResetWidgetStyle();
                  clearAllWidgetStyles();
                  setResetConfirmOpen(false);
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #fca5a5",
                  background: "#fff1f1",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#b91c1c",
                  textAlign: "left",
                }}
              >
                {t('editPanel.resetAllWidgets')}
              </button>
              <button
                onClick={() => setResetConfirmOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#64748b",
                  textAlign: "center",
                }}
              >
                {t('editPanel.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
});
