import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import AddCustomButtonModal from "./AddCustomButtonModal";
import { ColorPicker } from "./ColorPicker";
import type {
  CustomBackgroundMediaType,
  CustomButtonConfig,
  DashboardPreset,
  DashboardBackgroundId,
} from "../features/dashboard/hooks/useWidgetsState";
import { useFontSize } from '../providers/themeProviders';
import { useLanguage } from '../providers/languageProvider';
import {
  detectBackgroundMediaType,
  uploadBackgroundMedia,
  validateFileSize,
  deleteBackgroundFile,
  listAllBackgroundFiles,
} from "../../lib/firebase/storage";
import {
  saveBackgroundMetadata,
  listSavedBackgrounds,
  deleteSavedBackgroundDoc,
  type SavedBackground,
} from "../../lib/firebase/firestore";
import { useAuth } from "../features/auth/useAuth";
import paneliabgmashup from "../../assets/panelia-bg/paneliabgmashup.png";
import { getColorAlpha, toColorInputValue, withAlpha } from "../../lib/utils/colors";


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
  widgetBlur: number;
  setWidgetBlur: (blur: number) => void;
  widgetBorderWidth: number;
  setWidgetBorderWidth: (width: number) => void;
  dashboardBackgroundId: DashboardBackgroundId;
  setDashboardBackgroundId: (backgroundId: DashboardBackgroundId) => void;
  customBackgroundUrl: string;
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
  { id: "customMedia", labelKey: "editPanel.backgroundCustomMedia" },
];

const DEFAULT_WIDGET_SURFACE_COLOR = "rgba(255,255,255,0.15)";
const DEFAULT_WIDGET_BORDER_COLOR = "rgba(255,255,255,0.35)";
const DEFAULT_WIDGET_TEXT_COLOR = "#000000";
const DEFAULT_WIDGET_OPACITY = 1;
const DEFAULT_WIDGET_BLUR = 10;
const DEFAULT_WIDGET_BORDER_WIDTH = 1;
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 22;

function isLightColor(value: string) {
  const hex = toColorInputValue(value).slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;

  const toLinear = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  const luminance =
    0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);

  return luminance > 0.72;
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
  widgetBlur,
  setWidgetOpacity,
  setWidgetBlur,
  widgetBorderWidth,
  setWidgetBorderWidth,
  dashboardBackgroundId,
  setDashboardBackgroundId,
  customBackgroundUrl,
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
  const [activeColorPicker, setActiveColorPicker] = useState<"widget" | "border" | "text" | null>(null);
  const [activeSlider, setActiveSlider] = useState<"fontSize" | "blur" | "opacity" | "borderWidth" | null>(null);
  // Referanser brukt for fokus og tastaturnavigasjon.
  const widgetItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const customButtonOpenerRef = useRef<HTMLButtonElement | null>(null);
  const norwegianButtonRef = useRef<HTMLButtonElement | null>(null);
  const englishButtonRef = useRef<HTMLButtonElement | null>(null);
  const spanishButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const widgetsTabButtonRef = useRef<HTMLButtonElement | null>(null);
  const backgroundTabButtonRef = useRef<HTMLButtonElement | null>(null);
  const customBackgroundInputRef = useRef<HTMLInputElement | null>(null);
  const fontSizeSliderRef = useRef<HTMLInputElement | null>(null);
  const widgetColorResetRef = useRef<HTMLButtonElement | null>(null);
  const widgetColorButtonRef = useRef<HTMLButtonElement | null>(null);
  const widgetBlurSliderRef = useRef<HTMLInputElement | null>(null);
  const widgetOpacitySliderRef = useRef<HTMLInputElement | null>(null);
  const borderColorResetRef = useRef<HTMLButtonElement | null>(null);
  const borderColorButtonRef = useRef<HTMLButtonElement | null>(null);
  const borderWidthSliderRef = useRef<HTMLInputElement | null>(null);
  const textColorResetRef = useRef<HTMLButtonElement | null>(null);
  const textColorButtonRef = useRef<HTMLButtonElement | null>(null);
  const resetAllButtonRef = useRef<HTMLButtonElement | null>(null);
  const uploadBgButtonRef = useRef<HTMLButtonElement | null>(null);
  const presetNameInputRef = useRef<HTMLInputElement | null>(null);
  const savePresetButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const backgroundOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const presetApplyButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const presetDeleteButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const resetConfirmUnlockedRef = useRef<HTMLButtonElement | null>(null);
  const resetConfirmAllRef = useRef<HTMLButtonElement | null>(null);
  const resetConfirmCancelRef = useRef<HTMLButtonElement | null>(null);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadBackgroundError, setUploadBackgroundError] = useState("");
  const [pendingPresetFocusId, setPendingPresetFocusId] = useState<string | null>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [savedBackgrounds, setSavedBackgrounds] = useState<SavedBackground[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [deletingBgId, setDeletingBgId] = useState<string | null>(null);
  const { fontSize: widgetFontSize, setFontSize } = useFontSize();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const widgetSurfaceAlpha = getColorAlpha(widgetSurfaceColor);
  const panelBorderColor = "rgba(20, 26, 41, 0.16)";
  const panelTextColor = "#0f172a";
  const panelBaseLayerColor = withAlpha(widgetSurfaceColor, Math.max(widgetSurfaceAlpha, 0.38));
  const panelReadabilityLayerColor = "rgba(255,255,255,0.78)";
  const softTint = withAlpha(widgetSurfaceColor, 0.14);
  const strongTint = withAlpha(widgetSurfaceColor, 0.24);
  const activeBorderColor = withAlpha(widgetSurfaceColor, 0.78);
  const mutedSurfaceColor = "rgba(255,255,255,0.46)";
  const controlSurfaceColor = "rgba(255,255,255,0.54)";
  const subtleShadow = "0 8px 24px rgba(15, 23, 42, 0.08)";
  const innerShadow = "inset 0 1px 0 rgba(255,255,255,0.42)";

  // Fast tekstfarge i panel for god lesbarhet.
  const widgetTextColor = panelTextColor;
  const fontSize = Math.min(Math.max(widgetFontSize, MIN_FONT_SIZE), MAX_FONT_SIZE);
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

    // Returner fokus til sidefeltet når panelet lukkes.
    requestAnimationFrame(() => {
      onFocusSidebar?.();
    });
  }, [open, onFocusSidebar]);

  useEffect(() => {
    if (!pendingPresetFocusId) return;

    const presetIndex = dashboardPresets.findIndex((preset) => preset.id === pendingPresetFocusId);
    if (presetIndex === -1) return;

    requestAnimationFrame(() => {
      presetApplyButtonRefs.current[presetIndex]?.focus();
      setPendingPresetFocusId(null);
    });
  }, [dashboardPresets, pendingPresetFocusId]);

  useImperativeHandle(ref, () => ({
    focusFirstWidget: () => {
      setViewMode("widgets");
      requestAnimationFrame(() => {
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

    const focusTarget = (target: "norsk" | "english" | "spanish" | "close" | "widgets" | "background") => {
      if (target === "norsk") {
        norwegianButtonRef.current?.focus();
        return;
      }
      if (target === "english") {
        englishButtonRef.current?.focus();
        return;
      }
      if (target === "spanish") {
        spanishButtonRef.current?.focus();
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
            : activeElement === spanishButtonRef.current
              ? "spanish"
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

      if ((currentKey === "widgets" || currentKey === "norsk") && e.key === "ArrowLeft") {
        e.preventDefault();
        onFocusSidebar?.();
        return;
      }

      const nextMap: Record<"norsk" | "english" | "spanish" | "close" | "widgets" | "background", {
        ArrowUp: "norsk" | "english" | "spanish" | "close" | "widgets" | "background";
        ArrowDown: "norsk" | "english" | "spanish" | "close" | "widgets" | "background";
        ArrowLeft: "norsk" | "english" | "spanish" | "close" | "widgets" | "background";
        ArrowRight: "norsk" | "english" | "spanish" | "close" | "widgets" | "background";
      }> = {
        norsk: {
          ArrowUp: "widgets",
          ArrowDown: "widgets",
          ArrowLeft: "close",
          ArrowRight: "english",
        },
        english: {
          ArrowUp: "background",
          ArrowDown: "widgets",
          ArrowLeft: "norsk",
          ArrowRight: "spanish",
        },
        spanish: {
          ArrowUp: "background",
          ArrowDown: "widgets",
          ArrowLeft: "english",
          ArrowRight: "close",
        },
        close: {
          ArrowUp: "background",
          ArrowDown: "widgets",
          ArrowLeft: "spanish",
          ArrowRight: "spanish",
        },
        widgets: {
          ArrowUp: "norsk",
          ArrowDown: "norsk",
          ArrowLeft: "background",
          ArrowRight: "background",
        },
        background: {
          ArrowUp: "norsk",
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
  }, [open, availableWidgets, viewMode, onFocusSidebar]);

  useEffect(() => {
    if (!open || viewMode !== "background") return;

    const bgSettingRefs = [
      fontSizeSliderRef,
      widgetColorResetRef,
      widgetColorButtonRef,
      widgetBlurSliderRef,
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
    const primaryVerticalRefs = [
      fontSizeSliderRef,
      widgetColorResetRef,
      widgetBlurSliderRef,
      widgetOpacitySliderRef,
      borderColorResetRef,
      borderWidthSliderRef,
      textColorResetRef,
      resetAllButtonRef,
      uploadBgButtonRef,
    ];

    const sliderRefList = [fontSizeSliderRef, widgetBlurSliderRef, widgetOpacitySliderRef, borderWidthSliderRef] as const;
    const sliderKeyList = ["fontSize", "blur", "opacity", "borderWidth"] as const;

    const handleBgSettingsArrows = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const activeElement = document.activeElement as HTMLElement | null;
      const inEditPanel = activeElement?.closest('[data-arrow-scope="edit-panel"]');
      if (!inEditPanel) return;

      // Logikk for aktivering av slider.
      const focusedSliderIdx = sliderRefList.findIndex((r) => r.current === activeElement);
      if (focusedSliderIdx !== -1) {
        const sliderKey = sliderKeyList[focusedSliderIdx];

        if (activeSlider === sliderKey) {
          // Aktiv: blokker ArrowUp/ArrowDown.
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            return;
          }
          // Aktiv: Enter/Escape deaktiverer, ArrowLeft/ArrowRight justerer.
          if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            setActiveSlider(null);
            if (e.key === "Escape") {
              // Flytt fokus bort: forrige element eller bakgrunn-fane.
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

        // Ikke aktiv: Enter aktiverer, ArrowLeft/ArrowRight blokkeres, Escape flytter fokus bort.
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
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          return;
        }
        // ArrowUp/ArrowDown går videre til vanlig navigasjon under.
      }


      const primaryVerticalElements = primaryVerticalRefs
        .map((r) => r.current as HTMLElement | null)
        .filter((el): el is HTMLElement => Boolean(el));
      const primaryVerticalIndex = primaryVerticalElements.findIndex((el) => el === document.activeElement);

      if (primaryVerticalIndex !== -1) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const nextPrimary = primaryVerticalElements[primaryVerticalIndex + 1];
          if (nextPrimary) {
            nextPrimary.focus();
          } else {
            presetNameInputRef.current?.focus();
          }
          return;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (primaryVerticalIndex === 0) {
            backgroundTabButtonRef.current?.focus();
          } else {
            primaryVerticalElements[primaryVerticalIndex - 1]?.focus();
          }
          return;
        }
      }

      const elements = bgSettingRefs
        .map((r) => r.current as HTMLElement | null)
        .filter((el): el is HTMLElement => Boolean(el));
      const focusedIndex = elements.findIndex((el) => el === document.activeElement);

      // ArrowRight: reset -> fargeknapp. ArrowLeft: fargeknapp -> reset.
      // Må sjekkes før focusedIndex, siden fargeknappene ikke ligger i bgSettingRefs.
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
          document.activeElement === textColorButtonRef.current ||
          document.activeElement === resetAllButtonRef.current ||
          document.activeElement === uploadBgButtonRef.current
        ) {
          e.preventDefault();
          return;
        }
        if (document.activeElement === presetNameInputRef.current) {
          e.preventDefault();
          savePresetButtonRef.current?.focus();
          return;
        }
        if (document.activeElement === savePresetButtonRef.current) {
          e.preventDefault();
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

      // ArrowUp fra savePresetButtonRef: gå til uploadBgButtonRef (elementet over i listen).
      if (e.key === "ArrowUp" && document.activeElement === savePresetButtonRef.current) {
        e.preventDefault();
        uploadBgButtonRef.current?.focus();
        return;
      }

      // ArrowUp fra fargeknapper: hopp over reset-knappen, gå til elementet over raden.
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

      // Navigasjon for bakgrunnsvalg-knapper.
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
          } else if (dashboardPresets.length > 0) {
            presetApplyButtonRefs.current[dashboardPresets.length - 1]?.focus();
          } else {
            presetNameInputRef.current?.focus();
          }
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          presetNameInputRef.current?.focus();
          return;
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          return;
        }
      }

      const presetApplyIndex = presetApplyButtonRefs.current.findIndex((r) => r === document.activeElement);
      if (presetApplyIndex !== -1) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          presetDeleteButtonRefs.current[presetApplyIndex]?.focus();
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (presetApplyIndex < dashboardPresets.length - 1) {
            presetApplyButtonRefs.current[presetApplyIndex + 1]?.focus();
          } else {
            backgroundOptionRefs.current[0]?.focus();
          }
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (presetApplyIndex > 0) {
            presetApplyButtonRefs.current[presetApplyIndex - 1]?.focus();
          } else {
            savePresetButtonRef.current?.focus();
          }
          return;
        }
      }

      const presetDeleteIndex = presetDeleteButtonRefs.current.findIndex((r) => r === document.activeElement);
      if (presetDeleteIndex !== -1) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          presetApplyButtonRefs.current[presetDeleteIndex]?.focus();
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (presetDeleteIndex < dashboardPresets.length - 1) {
            presetDeleteButtonRefs.current[presetDeleteIndex + 1]?.focus();
          } else {
            backgroundOptionRefs.current[0]?.focus();
          }
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (presetDeleteIndex > 0) {
            presetDeleteButtonRefs.current[presetDeleteIndex - 1]?.focus();
          } else {
            savePresetButtonRef.current?.focus();
          }
          return;
        }
      }

      if (focusedIndex === -1) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (focusedIndex < elements.length - 1) {
          elements[focusedIndex + 1]?.focus();
        } else {
          // Siste bgSettingRef-element (presetNameInputRef): gå til første bakgrunnsvalg.
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

    // ArrowDown fra savePresetButtonRef -> første bakgrunnsvalg.
    const handleSavePresetArrowDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown") return;
      if (document.activeElement !== savePresetButtonRef.current) return;
      const inEditPanel = (document.activeElement as HTMLElement)?.closest('[data-arrow-scope="edit-panel"]');
      if (!inEditPanel) return;
      e.preventDefault();
      if (dashboardPresets.length > 0) {
        presetApplyButtonRefs.current[0]?.focus();
        return;
      }
      backgroundOptionRefs.current[0]?.focus();
    };
    window.addEventListener("keydown", handleSavePresetArrowDown);

    window.addEventListener("keydown", handleBgSettingsArrows);
    return () => {
      window.removeEventListener("keydown", handleBgSettingsArrows);
      window.removeEventListener("keydown", handleSavePresetArrowDown);
    };
  }, [open, viewMode, activeSlider, dashboardPresets]);
  
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
      const { url: downloadUrl, storagePath } = await uploadBackgroundMedia(file, mediaType);
      setCustomBackgroundUrl(downloadUrl);
      setCustomBackgroundType(mediaType);
      setDashboardBackgroundId("customMedia");
      if (user) {
        const bgId = `bg:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const newBg: SavedBackground = { id: bgId, url: downloadUrl, storagePath, type: mediaType, createdAt: Date.now() };
        await saveBackgroundMetadata(user.uid, newBg).catch(() => {});
        setSavedBackgrounds((prev) => [newBg, ...prev]);
      }
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
    setWidgetBlur(DEFAULT_WIDGET_BLUR);
    setWidgetBorderWidth(DEFAULT_WIDGET_BORDER_WIDTH);
    setFontSize(DEFAULT_FONT_SIZE);
  };

  const handleOpenMediaLibrary = async () => {
    if (showMediaLibrary) {
      setShowMediaLibrary(false);
      return;
    }
    setShowMediaLibrary(true);
    if (!user) return;
    setLoadingLibrary(true);
    try {
      // Henter filer fra Storage.
      const storageItems = await listAllBackgroundFiles(user.uid);
      // Henter metadata fra Firestore.
      const firestoreBgs = await listSavedBackgrounds(user.uid);
      const metaByPath = new Map(firestoreBgs.map((b) => [b.storagePath, b]));

      const merged: SavedBackground[] = storageItems.map((item) => {
        const meta = metaByPath.get(item.storagePath);
        return meta ?? {
          id: item.storagePath,
          url: item.url,
          storagePath: item.storagePath,
          type: item.type,
          createdAt: 0,
        };
      });

      // Sorter på createdAt synkende (ukjent verdi legges sist).
      merged.sort((a, b) => b.createdAt - a.createdAt);
      setSavedBackgrounds(merged);
    } catch {
      // Silently fail
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleDeleteBackground = async (bg: SavedBackground) => {
    if (!user) return;
    setDeletingBgId(bg.id);
    try {
      await deleteBackgroundFile(bg.storagePath);
      await deleteSavedBackgroundDoc(user.uid, bg.id);
      setSavedBackgrounds((prev) => prev.filter((b) => b.id !== bg.id));
      if (customBackgroundUrl === bg.url) {
        setDashboardBackgroundId("defaultbg");
        setCustomBackgroundUrl("");
      }
    } catch {
      // Ignorer feil stille.
    } finally {
      setDeletingBgId(null);
    }
  };

  const handleSavePreset = () => {
    const presetId = saveCurrentAsPreset(presetName);
    setPendingPresetFocusId(presetId);
    setPresetName("");
  };

  const handleApplyPreset = (presetId: string) => {
    applyDashboardPreset(presetId);
  };
  const buttonColor = controlSurfaceColor;
  const panelSurfaceColor = mutedSurfaceColor;
  const backgroundColor = panelSurfaceColor;
  const borderRadiusThemeElements = 16;
  const themeElementsPadding = "12px 14px";
  const widgetIconSize = Math.max(fontSize + 8, 22);
  const titleTextSize = Math.max(fontSize + 3);
  const bigTitleFontSize = Math.max(fontSize + 9);
  const dialogTitleFontSize = Math.max(fontSize + 4, 18);
  const buttonBorder = `1px solid ${panelBorderColor}`;
  const buttonBorderHighlight = `1px solid ${activeBorderColor}`;
  const buttonColorHighlight = activeBorderColor;
  const useHighContrastActiveState = isLightColor(widgetSurfaceColor);
  const sectionCardStyle = {
    background: backgroundColor,
    borderRadius: borderRadiusThemeElements,
    padding: themeElementsPadding,
    border: buttonBorder,
    boxShadow: innerShadow,
  } as const;
  const topButtonStyle = {
    padding: "8px 12px",
    borderRadius: 12,
    border: buttonBorder,
    background: buttonColor,
    cursor: "pointer",
    fontSize,
    color: widgetTextColor,
    boxShadow: innerShadow,
  } as const;
  const selectedTopButtonStyle = {
    ...topButtonStyle,
    border: buttonBorderHighlight,
    background: strongTint,
  } as const;
  const rowButtonStyle = {
    borderRadius: 16,
    border: buttonBorder,
    boxShadow: innerShadow,
  } as const;
  const selectedWidgetBorderColor = useHighContrastActiveState
    ? "rgba(15, 23, 42, 0.56)"
    : activeBorderColor;
  const selectedWidgetBackground = useHighContrastActiveState
    ? "rgba(15, 23, 42, 0.1)"
    : panelBaseLayerColor;
  const selectedWidgetBorder = `1px solid ${selectedWidgetBorderColor}`;
  const selectedWidgetIconBackground = useHighContrastActiveState
    ? "rgba(15, 23, 42, 0.14)"
    : strongTint;
  const selectedWidgetIconBorder = `1px solid ${selectedWidgetBorderColor}`;
  const selectedWidgetActiveRing = useHighContrastActiveState
    ? "0 0 0 2px rgba(15, 23, 42, 0.22), inset 0 1px 0 rgba(255,255,255,0.42)"
    : `0 0 0 1px ${withAlpha(widgetSurfaceColor, 0.34)}, ${innerShadow}`;

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
        boxShadow: "16px 0 42px rgba(15, 23, 42, 0.18)",
        display: "flex",
        flexDirection: "column",
        visibility: open ? "visible" : "hidden",
        pointerEvents: open ? "auto" : "none",
        background: panelBaseLayerColor,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          margin: -8,
          padding: 14,
          borderRadius: 28,
          background: panelReadabilityLayerColor,
          border: `1px solid ${withAlpha("#ffffff", 0.45)}`,
          boxShadow: `${subtleShadow}, inset 0 1px 0 rgba(255,255,255,0.35)`,
        }}
      >

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            ref={norwegianButtonRef}
            onClick={() => setLanguage('no')}
            style={language === 'no' ? selectedTopButtonStyle : topButtonStyle}
            title="Norsk"
          >
            <img src="https://flagcdn.com/w40/no.png" alt="Norsk" style={{ width: 20, height: 15, borderRadius: 2, objectFit: 'cover', display: 'block' }} />
          </button>
          <button
            ref={englishButtonRef}
            onClick={() => setLanguage('en')}
            style={language === 'en' ? selectedTopButtonStyle : topButtonStyle}
            title="English"
          >
            <img src="https://flagcdn.com/w40/gb.png" alt="English" style={{ width: 20, height: 15, borderRadius: 2, objectFit: 'cover', display: 'block' }} />
          </button>
          <button
            ref={spanishButtonRef}
            onClick={() => setLanguage('es')}
            style={language === 'es' ? selectedTopButtonStyle : topButtonStyle}
            title="Español"
          >
            <img src="https://flagcdn.com/w40/es.png" alt="Español" style={{ width: 20, height: 15, borderRadius: 2, objectFit: 'cover', display: 'block' }} />
          </button>
        </div>
        <button ref={closeButtonRef} style={topButtonStyle} onClick={onClose}>{t('editPanel.close')}</button>
      </div>

      <h2 style={{ fontSize: bigTitleFontSize, color: widgetTextColor, margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
        {viewMode === "widgets"
          ? t('editPanel.selectWidgets')
          : t('editPanel.modeBackground')}
      </h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 8,
          marginBottom: 10,
          padding: 4,
          borderRadius: 16,
          background: softTint,
        }}
      >
        <button
          ref={widgetsTabButtonRef}
          onClick={() => setViewMode("widgets")}
          style={viewMode === "widgets" ? selectedTopButtonStyle : topButtonStyle}
        >
          {t('editPanel.modeWidgets')}
        </button>
        <button
          ref={backgroundTabButtonRef}
          onClick={() => setViewMode("background")}
          style={viewMode === "background" ? selectedTopButtonStyle : topButtonStyle}
        >
          {t('editPanel.modeBackground')}
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="edit-panel-scroll"
        style={{
          marginTop: 22,
          overflowY: "auto",
          flex: 1,
          paddingRight: 6,
          outline: "none",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >

        {viewMode === "widgets" && (
          <div style={{ marginTop: 12 }}>
          {availableWidgets.map((widget, index) => {
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
                  padding: "14px 16px",
                  width: "100%",
                  marginBottom: 12,
                  borderRadius: 16,
                  cursor: "pointer",
                  background: isActive ? selectedWidgetBackground : backgroundColor,
                  border: isActive ? selectedWidgetBorder : buttonBorder,
                  color: widgetTextColor,
                  boxShadow: isActive ? selectedWidgetActiveRing : innerShadow,
                  transform: isActive ? "translateY(-1px)" : "none",
                  transition: "background 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
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
                    aria-hidden="true"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      background: isActive ? selectedWidgetIconBackground : "rgba(255,255,255,0.34)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: isActive ? selectedWidgetIconBorder : "1px solid rgba(255,255,255,0.4)",
                      flexShrink: 0,
                    }}
                  >
                  <span
                    className="material-symbols-rounded"
                    style={{
                      fontSize: widgetIconSize - 2,
                      lineHeight: 1,
                      opacity: 0.9,
                    }}
                  >
                    {widget.icon ?? "widgets"}
                  </span>
                  </span>
                </div>
                {isActive && ""}
                </button>
            );
          })}
        
        {viewMode === "widgets" && (
            <button
              type="button"
              ref={(element) => { widgetItemRefs.current[availableWidgets.length] = element; customButtonOpenerRef.current = element; }}
            onClick={() => setModalOpen(true)}
            style={{
              padding: "14px 16px",
              width: "100%",
              marginBottom: 12,
              borderRadius: 16,
              cursor: "pointer",
              background: backgroundColor,
              color: widgetTextColor,
              border: `1px dashed ${withAlpha(widgetSurfaceColor, 0.5)}`,
              boxShadow: innerShadow,
              fontWeight: 500,
            }}
          >
            {t('editPanel.addCustomButton')}
          </button>
        )}
        </div>
        )}

        {viewMode === "background" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              width: "100%",
            }}
          >  
        <div style={sectionCardStyle}>
          <h3 style={{
            fontSize:titleTextSize,
            margin:"0 0 8px 0",
            color:widgetTextColor,
            letterSpacing: "-0.02em",
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
          <div style={sectionCardStyle} >
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
                      style={{ ...topButtonStyle, position: "relative", width: "fit-content", marginTop: 5 }}>
                          {t('editPanel.reset')}
                      

                    </button>
            <button
              ref={widgetColorButtonRef}
              type="button"
              onClick={() => setActiveColorPicker((prev) => (prev === "widget" ? null : "widget"))}
              onFocus={() => setFocusedColorButton("widget")}
              onBlur={() => setFocusedColorButton((current) => (current === "widget" ? null : current))}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "fit-content",
                padding: "8px 12px",
                borderRadius: 12,
                border:
                  focusedColorButton === "widget" || activeColorPicker === "widget"
                    ? buttonBorderHighlight
                    : buttonBorder,
                background: buttonColor,
                cursor: "pointer",
                marginTop:5,
                color:widgetTextColor,
                boxShadow: innerShadow,
              }}
            >
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
            {activeColorPicker === "widget" && (
              <ColorPicker
                value={toColorInputValue(widgetSurfaceColor)}
                onChange={(hex) => setWidgetSurfaceColor(withAlpha(hex, widgetSurfaceAlpha))}
                onClose={() => { setActiveColorPicker(null); requestAnimationFrame(() => widgetColorButtonRef.current?.focus()); }}
                autoFocus
              />
            )}
            <label
              style={{
                display: "block",
                fontSize,
                fontWeight: 500,
                marginTop: 10,
                color:widgetTextColor,
              }}
            >
              {t('editPanel.widgetBlur')}: {widgetBlur}px
            </label>
            <input
              ref={widgetBlurSliderRef}
              type="range"
              min={0}
              max={20}
              step={1}
              value={widgetBlur}
              onChange={(event) => setWidgetBlur(Number(event.target.value))}
              onBlur={() => setActiveSlider(null)}
              aria-label={t('editPanel.widgetBlur')}
              style={{
                width: "100%",
                marginTop: 5,
                outline: activeSlider === "blur" ? `2px solid ${buttonColorHighlight}` : undefined,
                borderRadius: 4,
              }}
            />
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
            <div style={{ ...sectionCardStyle, color:widgetTextColor }}>  
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
                      style={{ ...topButtonStyle, position: "relative", width: "fit-content", marginTop: 5 }}>
                          {t('editPanel.reset')}
                      

                    </button>
                <button
                  ref={borderColorButtonRef}
                  type="button"
                  onClick={() => setActiveColorPicker((prev) => (prev === "border" ? null : "border"))}
                  onFocus={() => setFocusedColorButton("border")}
                  onBlur={() => setFocusedColorButton((current) => (current === "border" ? null : current))}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "fit-content",
                    padding: "8px 12px",
                    borderRadius: 12,
                    border:
                      focusedColorButton === "border" || activeColorPicker === "border"
                        ? buttonBorderHighlight
                        : buttonBorder,
                    background: buttonColor,
                    cursor: "pointer",
                    marginTop: 5,
                    color: widgetTextColor,
                    boxShadow: innerShadow,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      border: "1px solid rgba(0,0,0,0.3)",
                      background: widgetBorderColor,
                    }}
                  />
                  <span style={{ fontSize, fontWeight: 500 }}>
                    {t('editPanel.widgetBorderColor')}
                  </span>
                </button>
                </div>
                {activeColorPicker === "border" && (
                  <ColorPicker
                    value={toColorInputValue(widgetBorderColor)}
                    onChange={(hex) => setWidgetBorderColor(hex)}
                    onClose={() => { setActiveColorPicker(null); requestAnimationFrame(() => borderColorButtonRef.current?.focus()); }}
                    autoFocus
                  />
                )}
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
            <div style={{ ...sectionCardStyle, color:widgetTextColor }}>
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
                    style={{ ...topButtonStyle, position: "relative", width: "fit-content", marginTop: 5 }}>
                        {t('editPanel.reset')}
                    

                  </button>  
                <button
                  ref={textColorButtonRef}
                  type="button"
                  onClick={() => setActiveColorPicker((prev) => (prev === "text" ? null : "text"))}
                  onFocus={() => setFocusedColorButton("text")}
                  onBlur={() => setFocusedColorButton((current) => (current === "text" ? null : current))}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "fit-content",
                    padding: "8px 12px",
                    borderRadius: 12,
                    border:
                      focusedColorButton === "text" || activeColorPicker === "text"
                        ? buttonBorderHighlight
                        : buttonBorder,
                    background: buttonColor,
                    cursor: "pointer",
                    marginTop: 5,
                    color: widgetTextColor,
                    boxShadow: innerShadow,
                  }}
                >
                  <span
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
                {activeColorPicker === "text" && (
                  <ColorPicker
                    value={toColorInputValue(selectedWidgetTextColor)}
                    onChange={(hex) => setWidgetTextColor(hex)}
                    onClose={() => { setActiveColorPicker(null); requestAnimationFrame(() => textColorButtonRef.current?.focus()); }}
                    autoFocus
                  />
                )}
            </div> 
            
            <div style={{ ...sectionCardStyle, alignItems:"center" }}>     
              <button
                ref={resetAllButtonRef}
                onClick={() => setResetConfirmOpen(true)}
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: buttonBorder,
                  background: controlSurfaceColor,
                  cursor: "pointer",
                  fontWeight: 600,
                  textAlign: "left",
                  fontSize,
                  color:widgetTextColor,
                  boxShadow: innerShadow,
                }}
              >
                {t('editPanel.resetWidgetStyle')}
              </button>
            </div>
            <div style={sectionCardStyle}>    
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
                  borderRadius: 12,
                  border: uploadBackgroundError ? "1px solid #d97706" : buttonBorder,
                  background: uploadBackgroundError ? "#fef3c7" : controlSurfaceColor,
                  cursor: uploadingBackground ? "not-allowed" : "pointer",
                  textAlign: "left",
                  fontWeight: 600,
                  opacity: uploadingBackground ? 0.6 : 1,
                  fontSize,
                  color:widgetTextColor,
                  boxShadow: innerShadow,
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
                  background: "rgba(255,255,255,0.42)",
                  border: "1px dashed #d1d5db",
                  borderRadius: 12,
                  padding: "8px 10px",
                  marginTop:8
                }}
              >
                {t('editPanel.customBackgroundSyncNote')}

              </div>
          </div>
            
        <div 
          style={{ 
            ...sectionCardStyle,
            marginTop: 1,
            color:widgetTextColor,
          }}>
          <h3 style={{fontSize:titleTextSize, margin: "0 0 10px 0" }}>{t('editPanel.customPresets')}</h3>

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
                borderRadius: 12,
                border: buttonBorder,
                background: "rgba(255,255,255,0.76)",
                fontSize,
              }}
            />

            <button
              ref={savePresetButtonRef}
              onClick={handleSavePreset}
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                border: buttonBorder,
                background: controlSurfaceColor,
                cursor: "pointer",
                fontWeight: 600,
                whiteSpace: "nowrap",
                fontSize,
                color:widgetTextColor,
                boxShadow: innerShadow,
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
                background: "rgba(255,255,255,0.42)",
                border: "1px dashed #d1d5db",
                borderRadius: 12,
                padding: "8px 10px",
                marginBottom: 12,
              }}
            >
              {t('editPanel.noPresets')}
            </div>
          )}

          {dashboardPresets.map((preset, index) => (
            <div
              key={preset.id}
              style={{
                ...rowButtonStyle,
                background: mutedSurfaceColor,
                padding: 12,
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
                  ref={(element) => { presetApplyButtonRefs.current[index] = element; }}
                  onClick={() => handleApplyPreset(preset.id)}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: `1px solid ${withAlpha(widgetSurfaceColor, 0.32)}`,
                    background: softTint,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize,
                    color:widgetTextColor,
                  }}
                >
                  {t('editPanel.applyPreset')}
                </button>

                <button
                  ref={(element) => { presetDeleteButtonRefs.current[index] = element; }}
                  onClick={() => deleteDashboardPreset(preset.id)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid #e5b4b4",
                    background: "#fff1f1",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize,
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
                      width: "100%",
                      padding: 0,
                      borderRadius: 16,
                      border: selected ? buttonBorderHighlight : buttonBorder,
                      background: selected ? softTint : backgroundColor,
                      cursor: "pointer",
                      overflow: "hidden",
                      fontSize,
                      boxShadow: selected ? subtleShadow : innerShadow,
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

              if (option.id === "customMedia") {
                return (
                  <div key={option.id}>
                    <button
                      onClick={handleOpenMediaLibrary}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: 12,
                        borderRadius: 16,
                        border: selected ? buttonBorderHighlight : buttonBorder,
                        background: selected ? softTint : "rgba(255,255,255,0.42)",
                        cursor: "pointer",
                        textAlign: "left",
                        boxShadow: selected ? subtleShadow : innerShadow,
                        color: widgetTextColor,
                      }}
                    >
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
                      <span style={{ fontSize, fontWeight: 500, flex: 1 }}>
                        {t(option.labelKey)}
                      </span>
                      <span style={{ fontSize: fontSize - 2, opacity: 0.6 }}>
                        {showMediaLibrary ? "▲" : "▼"}
                      </span>
                    </button>

                    {showMediaLibrary && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.72)",
                          borderRadius: 12,
                          border: buttonBorder,
                          padding: "8px 10px",
                          marginTop: 4,
                          display: "flex",
                          flexDirection: "column",
                          gap: 0,
                        }}
                      >
                        {loadingLibrary ? (
                          <div style={{ fontSize, color: widgetTextColor, padding: "8px 0" }}>
                            {t("editPanel.mediaLibraryLoading")}
                          </div>
                        ) : savedBackgrounds.length === 0 ? (
                          <div style={{ fontSize, color: widgetTextColor, padding: "8px 0", opacity: 0.7 }}>
                            {t("editPanel.mediaLibraryEmpty")}
                          </div>
                        ) : (
                          savedBackgrounds.map((bg) => (
                            <div
                              key={bg.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "6px 0",
                                borderBottom: "1px solid rgba(0,0,0,0.07)",
                              }}
                            >
                              {bg.type === "video" ? (
                                <video
                                  src={bg.url}
                                  style={{ width: 64, height: 36, objectFit: "cover", borderRadius: 4, flexShrink: 0, marginRight: 6 }}
                                  muted
                                  preload="metadata"
                                />
                              ) : (
                                <img
                                  src={bg.url}
                                  alt=""
                                  style={{ width: 64, height: 36, objectFit: "cover", borderRadius: 4, flexShrink: 0, marginRight: 6 }}
                                />
                              )}
                              <button
                                onClick={() => {
                                  setCustomBackgroundUrl(bg.url);
                                  setCustomBackgroundType(bg.type);
                                  setDashboardBackgroundId("customMedia");
                                }}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  border: buttonBorder,
                                  background: controlSurfaceColor,
                                  cursor: "pointer",
                                  fontSize: fontSize - 1,
                                  fontWeight: 600,
                                  color: widgetTextColor,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {t("editPanel.mediaLibraryUse")}
                              </button>
                              <button
                                onClick={() => handleDeleteBackground(bg)}
                                disabled={deletingBgId === bg.id}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  border: "1px solid #e5b4b4",
                                  background: "#fff1f1",
                                  cursor: deletingBgId === bg.id ? "not-allowed" : "pointer",
                                  fontSize: fontSize - 1,
                                  fontWeight: 600,
                                  color: "#b91c1c",
                                  opacity: deletingBgId === bg.id ? 0.6 : 1,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {deletingBgId === bg.id ? "..." : t("editPanel.mediaLibraryDelete")}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
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
                    padding: 12,
                    borderRadius: 16,
                    border: selected ? buttonBorderHighlight : buttonBorder,
                    background: selected ? softTint : "rgba(255,255,255,0.42)",
                    cursor: "pointer",
                    textAlign: "left",
                    boxShadow: selected ? subtleShadow : innerShadow,
                    color: widgetTextColor,
                  }}
                >
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

                  <span style={{ fontSize, fontWeight: 500 }}>
                    {t(option.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

      </div>

      <AddCustomButtonModal open={modalOpen} onClose={() => setModalOpen(false)} customButtonConfigs={customButtonConfigs} removeCustomButton={removeCustomButton} openerRef={customButtonOpenerRef} />

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
          ref={(el) => { if (el) requestAnimationFrame(() => resetConfirmUnlockedRef.current?.focus()); }}
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
            <h2 style={{ margin: 0, fontSize: dialogTitleFontSize, fontWeight: 700, color: "#0f172a" }}>
              {t('editPanel.resetWidgetStyle')}
            </h2>
            <p style={{ margin: 0, fontSize, color: "#475569" }}>
              {t('editPanel.resetConfirmDescription')}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <button
                ref={resetConfirmUnlockedRef}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); resetConfirmAllRef.current?.focus(); }
                  if (e.key === "ArrowUp") { e.preventDefault(); resetConfirmCancelRef.current?.focus(); }
                  if (e.key === "Escape") { e.preventDefault(); setResetConfirmOpen(false); }
                }}
                onClick={() => {
                  handleResetWidgetStyle();
                  clearUnlockedWidgetStyles();
                  setResetConfirmOpen(false);
                  requestAnimationFrame(() => resetAllButtonRef.current?.focus());
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize,
                  color: "#0f172a",
                  textAlign: "left",
                }}
              >
                {t('editPanel.resetUnlockedWidgets')}
              </button>
              <button
                ref={resetConfirmAllRef}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); resetConfirmCancelRef.current?.focus(); }
                  if (e.key === "ArrowUp") { e.preventDefault(); resetConfirmUnlockedRef.current?.focus(); }
                  if (e.key === "Escape") { e.preventDefault(); setResetConfirmOpen(false); }
                }}
                onClick={() => {
                  handleResetWidgetStyle();
                  clearAllWidgetStyles();
                  setResetConfirmOpen(false);
                  requestAnimationFrame(() => resetAllButtonRef.current?.focus());
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #fca5a5",
                  background: "#fff1f1",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize,
                  color: "#b91c1c",
                  textAlign: "left",
                }}
              >
                {t('editPanel.resetAllWidgets')}
              </button>
              <button
                ref={resetConfirmCancelRef}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); resetConfirmUnlockedRef.current?.focus(); }
                  if (e.key === "ArrowUp") { e.preventDefault(); resetConfirmAllRef.current?.focus(); }
                  if (e.key === "Escape") { e.preventDefault(); setResetConfirmOpen(false); }
                }}
                onClick={() => {
                  setResetConfirmOpen(false);
                  requestAnimationFrame(() => resetAllButtonRef.current?.focus());
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize,
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
    </div>
  );
});
