import { useEffect, useRef, useState } from "react";
import GridLayout from "react-grid-layout/legacy";
import type { Layout } from "react-grid-layout";
import { ColorPicker } from "./ColorPicker";
import { WIDGETS } from "../features/Widgets/registry/WidgetRegistry";
import { WidgetInstanceProvider } from "../features/Widgets/components/WidgetInstanceContext";
import type { WidgetStyleOverrides } from "../features/dashboard/hooks/useWidgetsState";
import { useLanguage } from "../providers/languageProvider";
import { useFontSize } from "../providers/themeProviders";
import { getColorAlpha, toColorInputValue, withAlpha } from "../../lib/utils/colors";

type Props = {
  activeWidgets: string[];
  layouts: Record<string, { x: number; y: number; w: number; h: number }>;
  widgetLocks: Record<string, boolean>;
  clockModes: Record<string, "digital" | "analog">;
  clockBackgrounds: Record<string, boolean>;
  widgetStyles: Record<string, WidgetStyleOverrides>;
  widgetSurfaceColor: string;
  widgetBorderColor: string;
  widgetTextColor: string;
  widgetBlur: number;
  widgetBorderWidth: number;
  onLayoutChange: (layouts: Record<string, { x: number; y: number; w: number; h: number }>) => void;
  onCloseWidget: (widgetId: string) => void;
  onToggleWidgetLock: (widgetId: string) => void;
  onToggleClockMode: (widgetId: string) => void;
  onToggleClockBackground: (widgetId: string) => void;
  onSetWidgetStyle: (widgetId: string, patch: WidgetStyleOverrides) => void;
  onResetWidgetStyle: (widgetId: string) => void;
  onRequestSidebarFocus?: () => void;
  containerWidth?: number;
  isInteractive?: boolean;
  isMovable?: boolean;
  calendarWidgetConfig?: Record<string, unknown>;
};

const BASE_GRID_COLUMNS = 40;
const BASE_GRID_ROWS = 40;
const GRID_MAX_ROW_HEIGHT = 30;
const GRID_MIN_ROW_HEIGHT = 12;
const GRID_MIN_WIDTH = 320;
const GRID_MIN_HEIGHT = 360;

// Bruker et fast kolonnesystem for stabil skalering.
function resolveGridColumns(width: number) {
  void width;
  return BASE_GRID_COLUMNS;
}

function resolveGridRowHeight(height: number) {
  const available = Math.max(GRID_MIN_HEIGHT, height);
  return clampGridValue(
    Math.floor(available / BASE_GRID_ROWS),
    GRID_MIN_ROW_HEIGHT,
    GRID_MAX_ROW_HEIGHT
  );
}

function clampGridValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scaleSpanToCurrent(span: number, currentCols: number) {
  return clampGridValue(Math.round((span / BASE_GRID_COLUMNS) * currentCols), 1, currentCols);
}

function scaleXToCurrent(x: number, w: number, currentCols: number) {
  const scaledW = scaleSpanToCurrent(w, currentCols);
  const scaledX = Math.round((x / BASE_GRID_COLUMNS) * currentCols);
  return clampGridValue(scaledX, 0, Math.max(0, currentCols - scaledW));
}

function scaleSpanToBase(span: number, currentCols: number) {
  return clampGridValue(Math.round((span / currentCols) * BASE_GRID_COLUMNS), 1, BASE_GRID_COLUMNS);
}

function scaleXToBase(x: number, w: number, currentCols: number) {
  const scaledW = scaleSpanToBase(w, currentCols);
  const scaledX = Math.round((x / currentCols) * BASE_GRID_COLUMNS);
  return clampGridValue(scaledX, 0, Math.max(0, BASE_GRID_COLUMNS - scaledW));
}

// Henter widget-type fra instans-ID, for eksempel "notes:uuid" -> "notes".
function getWidgetType(widgetId: string) {
  const separatorIndex = widgetId.indexOf(":");
  if (separatorIndex === -1) return widgetId;
  return widgetId.slice(0, separatorIndex);
}

const NEWS_COUNTRY_OPTIONS = [
  { code: "no", label: "Norway" },
  { code: "se", label: "Sweden" },
  { code: "dk", label: "Denmark" },
  { code: "gb", label: "United Kingdom" },
  { code: "us", label: "United States" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
  { code: "es", label: "Spain" },
] as const;

function getNewsCountryStorageKey(widgetId: string) {
  return `panelia:news:selected-country:${widgetId}`;
}

const SPOTIFY_DARK_MODE_STORAGE_KEY = "spotify_widget_dark_mode";
const SPOTIFY_DARK_MODE_EVENT = "panelia:spotify:dark-mode-change";

function readSpotifyDarkModeSetting() {
  if (typeof window === "undefined") return true;

  try {
    const raw = localStorage.getItem(SPOTIFY_DARK_MODE_STORAGE_KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export default function DashboardGrid({
  activeWidgets,
  layouts,
  widgetLocks,
  clockModes,
  clockBackgrounds,
  widgetStyles,
  widgetSurfaceColor,
  widgetBorderColor,
  widgetTextColor,
  widgetBlur,
  widgetBorderWidth,
  onLayoutChange,
  onCloseWidget,
  onToggleWidgetLock,
  onToggleClockMode,
  onToggleClockBackground,
  onSetWidgetStyle,
  onResetWidgetStyle,
  onRequestSidebarFocus,
  containerWidth,
  isInteractive = true,
  isMovable = isInteractive,
  calendarWidgetConfig
}: Props) {
  const [hoveredWidgetId, setHoveredWidgetId] = useState<string | null>(null);
  const [styleEditorWidgetId, setStyleEditorWidgetId] = useState<string | null>(null);
  const [activeStyleSliderId, setActiveStyleSliderId] = useState<string | null>(null);
  const [activeStyleColorPicker, setActiveStyleColorPicker] = useState<
    { widgetId: string; target: "surface" | "border" | "text" } | null
  >(null);
  const [newsCountryMenuWidgetId, setNewsCountryMenuWidgetId] = useState<string | null>(null);
  const [spotifyDarkMode, setSpotifyDarkMode] = useState<boolean>(() =>
    readSpotifyDarkModeSetting()
  );
  const [newsCountries, setNewsCountries] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("panelia:news:selected-country:")) {
          const widgetId = key.slice("panelia:news:selected-country:".length);
          const value = localStorage.getItem(key);
          if (value) initial[widgetId] = value;
        }
      }
    } catch {
      // Ignorer feil.
    }
    return initial;
  });
  const [focusedWidgetId, setFocusedWidgetId] = useState<string | null>(null);
  const [focusVisibleWidgetId, setFocusVisibleWidgetId] = useState<string | null>(null);
  const [keyboardStatusMessage, setKeyboardStatusMessage] = useState("");
  const widgetElementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastInteractionWasKeyboardRef = useRef(false);
  const { t } = useLanguage();
  const { fontSize: globalFontSize } = useFontSize();

  useEffect(() => {
    setActiveStyleSliderId(null);
    setActiveStyleColorPicker(null);
  }, [styleEditorWidgetId]);

  useEffect(() => {
    const handleSpotifyDarkModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled?: boolean }>;
      if (typeof customEvent.detail?.enabled === "boolean") {
        setSpotifyDarkMode(customEvent.detail.enabled);
        return;
      }

      setSpotifyDarkMode(readSpotifyDarkModeSetting());
    };

    window.addEventListener(SPOTIFY_DARK_MODE_EVENT, handleSpotifyDarkModeChange as EventListener);
    return () => {
      window.removeEventListener(SPOTIFY_DARK_MODE_EVENT, handleSpotifyDarkModeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = () => {
      lastInteractionWasKeyboardRef.current = true;
    };

    const handleGlobalPointerDown = () => {
      lastInteractionWasKeyboardRef.current = false;
    };

    window.addEventListener("keydown", handleGlobalKeyDown, true);
    window.addEventListener("pointerdown", handleGlobalPointerDown, true);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
      window.removeEventListener("pointerdown", handleGlobalPointerDown, true);
    };
  }, []);

  const fallbackWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const resolvedContainerWidth =
    typeof containerWidth === "number" && Number.isFinite(containerWidth)
      ? containerWidth
      : fallbackWidth;
  const gridWidth = Math.max(GRID_MIN_WIDTH, resolvedContainerWidth);
  const fallbackHeight = typeof window === "undefined" ? 900 : window.innerHeight;
  const gridHeight = Math.max(GRID_MIN_HEIGHT, fallbackHeight);
  const gridRowHeight = resolveGridRowHeight(gridHeight);

  const activeGridColumns = resolveGridColumns(gridWidth);

  // Kombinerer lagret layout med standardverdier.
  const computedLayout = activeWidgets
    .map((widgetId, index) => {
      const widgetType = getWidgetType(widgetId);
      const widget = WIDGETS[widgetType as keyof typeof WIDGETS];

      if (!widget) return null;

      const baseGrid = widget.defaultGrid;
      const storedLayout = layouts[widgetId];

      const currentLayout: { x?: number; y?: number; w: number; h: number } = storedLayout
        ? {
            ...storedLayout,
            w: Math.max(storedLayout.w, baseGrid.w),
            h: Math.max(storedLayout.h, baseGrid.h),
          }
        : baseGrid;

      const scaledW = scaleSpanToCurrent(currentLayout.w, activeGridColumns);
      const scaledH = currentLayout.h;
      const scaledX = scaleXToCurrent(currentLayout.x ?? (index * 4) % 20, currentLayout.w, activeGridColumns);
      const scaledMinW = scaleSpanToCurrent(baseGrid.w, activeGridColumns);

      return {
        i: widgetId,
        x: scaledX,
        y: currentLayout.y ?? Math.floor(index / 5) * widget.defaultGrid.h,
        w: scaledW,
        h: scaledH,
        minW: scaledMinW,
        minH: baseGrid.h,
        static: Boolean(widgetLocks[widgetId]),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const overlaps = (
    first: { x: number; y: number; w: number; h: number },
    second: { x: number; y: number; w: number; h: number }
  ) => {
    return (
      first.x < second.x + second.w &&
      first.x + first.w > second.x &&
      first.y < second.y + second.h &&
      first.y + first.h > second.y
    );
  };

  const moveWidgetByKeyboard = (widgetId: string, deltaX: number, deltaY: number) => {
    const widgetLayout = computedLayout.find((item) => item.i === widgetId);
    if (!widgetLayout) return;

    const maxX = Math.max(0, activeGridColumns - widgetLayout.w);
    const maxY = Math.max(0, BASE_GRID_ROWS - widgetLayout.h);

    const nextX = clampGridValue(widgetLayout.x + deltaX, 0, maxX);
    const nextY = clampGridValue(widgetLayout.y + deltaY, 0, maxY);

    if (nextX === widgetLayout.x && nextY === widgetLayout.y) return;

    const collides = computedLayout.some((item) => {
      if (item.i === widgetId) return false;
      return overlaps(
        { x: nextX, y: nextY, w: widgetLayout.w, h: widgetLayout.h },
        { x: item.x, y: item.y, w: item.w, h: item.h }
      );
    });

    if (collides) {
      setKeyboardStatusMessage(t("widgets.widgetKeyboard.moveBlocked"));
      return;
    }

    const nextLayout = computedLayout.map((item) =>
      item.i === widgetId ? { ...item, x: nextX, y: nextY } : item
    );

    persistLayout(nextLayout);
    setKeyboardStatusMessage(
      `${t("widgets.widgetKeyboard.position")}: ${nextX + 1}, ${nextY + 1}`
    );
  };

  const resizeWidgetByKeyboard = (
    widgetId: string,
    direction: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown",
    growth = 1
  ) => {
    const widgetLayout = computedLayout.find((item) => item.i === widgetId);
    if (!widgetLayout) return;

    let nextX = widgetLayout.x;
    let nextY = widgetLayout.y;
    let nextW = widgetLayout.w;
    let nextH = widgetLayout.h;

    if (direction === "ArrowRight") {
      const grow = Math.min(growth, Math.max(0, activeGridColumns - (widgetLayout.x + widgetLayout.w)));
      nextW += grow;
    } else if (direction === "ArrowLeft") {
      const shrink = Math.min(growth, widgetLayout.w - widgetLayout.minW);
      nextW -= shrink;
    } else if (direction === "ArrowDown") {
      const grow = Math.min(growth, Math.max(0, BASE_GRID_ROWS - (widgetLayout.y + widgetLayout.h)));
      nextH += grow;
    } else {
      const shrink = Math.min(growth, widgetLayout.h - widgetLayout.minH);
      nextH -= shrink;
    }

    if (
      nextX === widgetLayout.x &&
      nextY === widgetLayout.y &&
      nextW === widgetLayout.w &&
      nextH === widgetLayout.h
    ) {
      return;
    }

    const collides = computedLayout.some((item) => {
      if (item.i === widgetId) return false;
      return overlaps(
        { x: nextX, y: nextY, w: nextW, h: nextH },
        { x: item.x, y: item.y, w: item.w, h: item.h }
      );
    });

    if (collides) {
      setKeyboardStatusMessage(t("widgets.widgetKeyboard.moveBlocked"));
      return;
    }

    const nextLayout = computedLayout.map((item) =>
      item.i === widgetId
        ? { ...item, x: nextX, y: nextY, w: nextW, h: nextH }
        : item
    );

    persistLayout(nextLayout);
    setKeyboardStatusMessage(`Size: ${nextW} x ${nextH}`);
  };

  const focusAdjacentWidget = (
    widgetId: string,
    direction: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown"
  ): boolean => {
    const current = computedLayout.find((item) => item.i === widgetId);
    if (!current) return false;

    const cx = current.x + current.w / 2;
    const cy = current.y + current.h / 2;
    const isHorizontal = direction === "ArrowLeft" || direction === "ArrowRight";

    // Trinn 1: Finn widgets i valgt retning.
    const inDirection = computedLayout.filter((item) => {
      if (item.i === widgetId) return false;
      const nx = item.x + item.w / 2;
      const ny = item.y + item.h / 2;
      if (direction === "ArrowLeft")  return nx < cx;
      if (direction === "ArrowRight") return nx > cx;
      if (direction === "ArrowUp")    return ny < cy;
      return ny > cy; // ArrowDown
    });

    if (inDirection.length === 0) return false;

    // Trinn 2: Prioriter widgets på samme rad/kolonne.
    const overlapping = inDirection.filter((item) =>
      isHorizontal
        ? current.y < item.y + item.h && current.y + current.h > item.y
        : current.x < item.x + item.w && current.x + current.w > item.x
    );

    const pool = overlapping.length > 0 ? overlapping : inDirection;

    // Trinn 3: Velg nærmeste widget.
    const best = pool.reduce((a, b) => {
      const distA = isHorizontal
        ? Math.abs((a.x + a.w / 2) - cx)
        : Math.abs((a.y + a.h / 2) - cy);
      const distB = isHorizontal
        ? Math.abs((b.x + b.w / 2) - cx)
        : Math.abs((b.y + b.h / 2) - cy);
      return distA <= distB ? a : b;
    });

    const nextElement = document.querySelector(
      `[data-widget-id="${best.i}"]`
    ) as HTMLElement | null;
    if (!nextElement) return false;

    setFocusedWidgetId(best.i);
    nextElement.focus();
    return true;
  };

  const focusSidebarFallback = () => {
    const editButton = document.querySelector(
      'aside button[aria-label="Rediger"]:not([disabled])'
    ) as HTMLButtonElement | null;

    if (editButton) {
      editButton.focus();
      return;
    }

    const firstSidebarButton = document.querySelector(
      "aside button:not([disabled])"
    ) as HTMLButtonElement | null;
    firstSidebarButton?.focus();
  };

  const focusStyleButton = (widgetId: string) => {
    const widgetRoot = document.querySelector(`[data-widget-id="${widgetId}"]`);
    if (!(widgetRoot instanceof HTMLElement)) return;
    const styleButton = widgetRoot.querySelector("button.widget-style-btn") as HTMLButtonElement | null;
    styleButton?.focus();
  };

  const focusStyleColorButton = (
    widgetId: string,
    target: "surface" | "border" | "text"
  ) => {
    const widgetRoot = document.querySelector(`[data-widget-id="${widgetId}"]`);
    if (!(widgetRoot instanceof HTMLElement)) return;
    const colorButton = widgetRoot.querySelector(
      `button[data-style-color-target="${target}"]`
    ) as HTMLButtonElement | null;
    colorButton?.focus();
  };

  const closeStyleEditorAndFocusButton = (widgetId: string) => {
    setStyleEditorWidgetId(null);
    setActiveStyleSliderId(null);
    setActiveStyleColorPicker(null);
    setFocusedWidgetId(widgetId);

    requestAnimationFrame(() => {
      focusStyleButton(widgetId);
    });
  };

  const handleWidgetTopControlKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    const currentButton = event.currentTarget;
    const controlsContainer = currentButton.parentElement;
    if (!controlsContainer) return;

    const widgetRoot = currentButton.closest("[data-widget-id]");
    const widgetId = widgetRoot?.getAttribute("data-widget-id") ?? "";
    const isSearchWidget = widgetId === "google_search" || widgetId.startsWith("google_search:");
    const focusSearchInput = () => {
      if (!(widgetRoot instanceof HTMLElement)) return false;
      const searchInput = widgetRoot.querySelector(
        'input[type="text"]:not([disabled])'
      ) as HTMLInputElement | null;
      if (!searchInput) return false;
      searchInput.focus();
      return true;
    };

    const isStyleButton = currentButton.classList.contains("widget-style-btn");
    const isLockButton = currentButton.classList.contains("widget-lock-btn");
    const isNewsWidget = widgetId === "news" || widgetId.startsWith("news:");
    const isEmailWidget = widgetId === "email" || widgetId.startsWith("email:");

    const isAiChatWidget = widgetId === "ai_chat" || widgetId.startsWith("ai_chat:");
    const focusAiChatInput = () => {
      if (!(widgetRoot instanceof HTMLElement)) return false;
      const chatInput = widgetRoot.querySelector(
        'textarea:not([disabled])'
      ) as HTMLTextAreaElement | null;
      if (!chatInput) return false;
      chatInput.focus();
      return true;
    };

    if (isSearchWidget) {
      if (isStyleButton && (event.key === "ArrowDown" || event.key === "ArrowLeft")) {
        event.preventDefault();
        event.stopPropagation();
        focusSearchInput();
        return;
      }

      if (isLockButton && event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        focusSearchInput();
        return;
      }
    }

    if (isEmailWidget) {
      if ((isStyleButton || isLockButton) && event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        if (widgetRoot instanceof HTMLElement) {
          const providerSelect = widgetRoot.querySelector(
            "select:not([disabled])"
          ) as HTMLElement | null;
          providerSelect?.focus();
        }
        return;
      }
    }

    const isWeatherWidget = widgetId === "weather" || widgetId.startsWith("weather:");
    if (isWeatherWidget) {
      const isLocked = Boolean(widgetLocks[widgetId]);
      const getWeatherButtons = () =>
        widgetRoot instanceof HTMLElement
          ? Array.from(
              widgetRoot.querySelectorAll<HTMLButtonElement>(
                "button[aria-pressed]:not([disabled])"
              )
            )
          : [];

      if (isStyleButton && event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        const weatherButtons = getWeatherButtons();
        weatherButtons[weatherButtons.length - 1]?.focus();
        return;
      }

      if (isLockButton && event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        const weatherButtons = getWeatherButtons();
        weatherButtons[0]?.focus();
        return;
      }

      if (isLocked && isLockButton && event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        const weatherButtons = getWeatherButtons();
        weatherButtons[weatherButtons.length - 1]?.focus();
        return;
      }
    }

    const isBookmarkWidget = widgetId === "bookmark" || widgetId.startsWith("bookmark:");
    if (isBookmarkWidget) {
      const focusBookmarkFirstControl = () => {
        if (!(widgetRoot instanceof HTMLElement)) return false;

        const firstBookmarkControl = widgetRoot.querySelector(
          'button:not([disabled]):not(.widget-lock-btn):not(.widget-style-btn):not(.widget-clock-mode-btn):not(.widget-clock-background-btn), a[href]'
        ) as HTMLElement | null;

        if (!firstBookmarkControl) return false;
        firstBookmarkControl.focus();
        return true;
      };

      if ((isStyleButton || isLockButton) && event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        focusBookmarkFirstControl();
        return;
      }
    }

    if (isAiChatWidget) {
      if ((isStyleButton || isLockButton) && event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        focusAiChatInput();
        return;
      }
    }

    const isNotesWidget = widgetId === "notes" || widgetId.startsWith("notes:");
    if (isNotesWidget) {
      if ((isStyleButton || isLockButton) && event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        if (widgetRoot instanceof HTMLElement) {
          const notesTextarea = widgetRoot.querySelector(
            'textarea.notes-widget-textarea:not([disabled])'
          ) as HTMLElement | null;
          notesTextarea?.focus();
        }
        return;
      }
    }

    const isMinesweeperWidget = widgetId === "minesweeper" || widgetId.startsWith("minesweeper:");
    if (isMinesweeperWidget) {
      if ((isStyleButton || isLockButton) && event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        if (widgetRoot instanceof HTMLElement) {
          const newGameButton = widgetRoot.querySelector(
            'button[data-minesweeper-new-game-btn="true"]:not([disabled])'
          ) as HTMLElement | null;
          newGameButton?.focus();
        }
        return;
      }
    }

    const isInfoWidget = widgetId === "info" || widgetId.startsWith("info:");
    if (isInfoWidget) {
      if ((isStyleButton || isLockButton) && event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        if (widgetRoot instanceof HTMLElement) {
          const nextBtn = widgetRoot.querySelector(
            'button[data-info-next-btn="true"]:not([disabled])'
          ) as HTMLElement | null;
          nextBtn?.focus();
        }
        return;
      }
    }

    const isCustomButtonWidget = widgetId.startsWith("customButton:");
    if (isCustomButtonWidget) {
      if (isStyleButton && event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        if (widgetRoot instanceof HTMLElement) {
          const draggableBtn = widgetRoot.querySelector(
            "button.widget-draggable-button"
          ) as HTMLElement | null;
          draggableBtn?.focus();
        }
        return;
      }
    }

    // Hindre ArrowUp på style-knappen i newswidget
    if (isStyleButton && isNewsWidget && event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Når Enter trykkes på flagg-knappen i newswidget, fokuseres første flagg i menyen
    if (isNewsWidget && currentButton.classList.contains("widget-news-country-btn") && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      
      // Åpne menyen hvis den ikke er åpen
      if (newsCountryMenuWidgetId !== widgetId) {
        setNewsCountryMenuWidgetId(widgetId);
      }
      
      // Fokuseres første flagg i menyen
      if (!(widgetRoot instanceof HTMLElement)) return;
      requestAnimationFrame(() => {
        const firstFlagButton = widgetRoot.querySelector(
          '.widget-news-country-menu button:not([disabled])'
        ) as HTMLButtonElement | null;
        if (firstFlagButton) {
          firstFlagButton.focus();
        }
      });
      return;
    }

    const controls = Array.from(
      controlsContainer.querySelectorAll<HTMLButtonElement>(
        "button.widget-clock-mode-btn, button.widget-clock-background-btn, button.widget-news-country-btn, button.widget-spotify-darkmode-btn, button.widget-style-btn, button.widget-lock-btn"
      )
    ).filter((button) => !button.disabled);

    const index = controls.indexOf(currentButton);
    if (index === -1) return;

    // Hvis flagg-knappen er fokusert, skal ArrowLeft og ArrowUp ikke gjøre noe
    if (currentButton.classList.contains("widget-news-country-btn")) {
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    // Hvis låseknappen er fokusert, skal ArrowUp og ArrowRight ikke gjøre noe
    if (currentButton.classList.contains("widget-lock-btn")) {
      if (event.key === "ArrowUp" || event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();

      const delta = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + delta + controls.length) % controls.length;
      controls[nextIndex]?.focus();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();

      const prevIndex = (index - 1 + controls.length) % controls.length;
      controls[prevIndex]?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();

      // Hvis dette er flagg-knappen, gå alltid direkte til første nyhetslenke
      if (currentButton.classList.contains("widget-news-country-btn")) {
        if (!(widgetRoot instanceof HTMLElement)) return;
        const firstArticleLink = widgetRoot.querySelector(
          '.news-widget-list a[href]'
        ) as HTMLElement | null;
        if (firstArticleLink) {
          firstArticleLink.focus();
          return;
        }
        // Hvis ingen nyhetslenke, prøv første innerkontroll
        const firstInnerControl = widgetRoot.querySelector(
          'textarea,input,select,button:not(.widget-lock-btn):not(.widget-style-btn):not(.widget-clock-mode-btn):not(.widget-clock-background-btn):not(.widget-news-country-btn):not(.widget-spotify-darkmode-btn),[href],[tabindex]:not([tabindex="-1"])'
        ) as HTMLElement | null;
        firstInnerControl?.focus();
        return;
      }

      // Ellers: vanlig logikk
      const nextControl = controls[index + 1];
      if (nextControl) {
        nextControl.focus();
        return;
      }

      if (!(widgetRoot instanceof HTMLElement)) return;

      const firstArticleLink = widgetRoot.querySelector(
        '.news-widget-list a[href]'
      ) as HTMLElement | null;
      if (firstArticleLink) {
        firstArticleLink.focus();
        return;
      }

      const firstInnerControl = widgetRoot.querySelector(
        'textarea,input,select,button:not(.widget-lock-btn):not(.widget-style-btn):not(.widget-clock-mode-btn):not(.widget-clock-background-btn):not(.widget-news-country-btn):not(.widget-spotify-darkmode-btn),[href],[tabindex]:not([tabindex="-1"])'
      ) as HTMLElement | null;

      firstInnerControl?.focus();
    }
  };

  const handleStyleControlKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    widgetId: string
  ) => {
    if (event.key === "Escape") {
      if (activeStyleSliderId) return;
      event.preventDefault();
      event.stopPropagation();
      closeStyleEditorAndFocusButton(widgetId);
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    event.stopPropagation();

    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'
      )
    );

    if (controls.length === 0) return;

    const target = event.target as HTMLElement;
    const currentIndex = controls.findIndex((control) => control === target || control.contains(target));

    if (currentIndex === -1) {
      controls[0]?.focus();
      return;
    }

    const delta = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (currentIndex + delta + controls.length) % controls.length;
    setActiveStyleSliderId(null);
    controls[nextIndex]?.focus();
  };

  const handleStyleSliderKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    sliderId: string
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      setActiveStyleSliderId((prev) => (prev === sliderId ? null : sliderId));
      return;
    }

    if (event.key === "Escape") {
      if (activeStyleSliderId === sliderId) {
        event.preventDefault();
        event.stopPropagation();
        setActiveStyleSliderId(null);
      }
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      if (activeStyleSliderId !== sliderId) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };

  const handleStyleActionButtonKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    action: "reset" | "close"
  ) => {
    if (event.key === "ArrowRight" && action === "reset") {
      event.preventDefault();
      event.stopPropagation();
      const stylePanel = event.currentTarget.closest(".widget-style-control");
      const closeButton = stylePanel?.querySelector(
        'button[data-style-action="close"]'
      ) as HTMLButtonElement | null;
      closeButton?.focus();
      return;
    }

    if (event.key === "ArrowLeft" && action === "close") {
      event.preventDefault();
      event.stopPropagation();
      const stylePanel = event.currentTarget.closest(".widget-style-control");
      const resetButton = stylePanel?.querySelector(
        'button[data-style-action="reset"]'
      ) as HTMLButtonElement | null;
      resetButton?.focus();
    }
  };

  const focusFirstWidgetControl = (container: HTMLDivElement, widgetId: string) => {
        // Naviger til første nyhetsartikkel hvis dette er en nyhetswidget
        if (widgetId === "news" || widgetId.startsWith("news:")) {
          const firstNewsLink = container.querySelector(
            ".news-widget-list a[href]"
          ) as HTMLAnchorElement | null;
          if (firstNewsLink) {
            firstNewsLink.focus();
            setKeyboardStatusMessage(t("widgets.widgetKeyboard.contentNavigationEnabled"));
            return;
          }
        }
    if (widgetId === "email" || widgetId.startsWith("email:")) {
      const providerSelect = container.querySelector(
        "select:not([disabled])"
      ) as HTMLElement | null;

      if (providerSelect) {
        providerSelect.focus();
        setKeyboardStatusMessage(t("widgets.widgetKeyboard.contentNavigationEnabled"));
        return;
      }
    }
    if (widgetId === "calendar" || widgetId.startsWith("calendar:")) {
      const calendarPrevButton = container.querySelector(
        'button[data-calendar-nav="previous-week"]:not([disabled])'
      ) as HTMLElement | null;

      if (calendarPrevButton) {
        calendarPrevButton.focus();
        setKeyboardStatusMessage(t("widgets.widgetKeyboard.contentNavigationEnabled"));
        return;
      }
    }

    if (widgetId === "google_search" || widgetId.startsWith("google_search:")) {
      const searchInput = container.querySelector(
        'input[type="text"]:not([disabled])'
      ) as HTMLElement | null;

      if (searchInput) {
        searchInput.focus();
        setKeyboardStatusMessage(t("widgets.widgetKeyboard.contentNavigationEnabled"));
        return;
      }
    }

    if (widgetId === "weather" || widgetId.startsWith("weather:")) {
      const windButton = container.querySelector(
        'button[aria-pressed]:not([disabled])'
      ) as HTMLElement | null;

      if (windButton) {
        windButton.focus();
        setKeyboardStatusMessage(t("widgets.widgetKeyboard.contentNavigationEnabled"));
        return;
      }
    }

    if (widgetId === "ai_chat" || widgetId.startsWith("ai_chat:")) {
      const chatInput = container.querySelector(
        'textarea:not([disabled])'
      ) as HTMLElement | null;

      if (chatInput) {
        chatInput.focus();
        setKeyboardStatusMessage(t("widgets.widgetKeyboard.contentNavigationEnabled"));
        return;
      }
    }

    if (widgetId === "bookmark" || widgetId.startsWith("bookmark:")) {
      const addCategoryButton = container.querySelector(
        'button[data-bookmark-add-category-btn="true"]:not([disabled])'
      ) as HTMLElement | null;

      if (addCategoryButton) {
        addCategoryButton.focus();
        setKeyboardStatusMessage(t("widgets.widgetKeyboard.contentNavigationEnabled"));
        return;
      }
    }

    if (widgetId === "notes" || widgetId.startsWith("notes:")) {
      const notesTextarea = container.querySelector(
        'textarea.notes-widget-textarea:not([disabled])'
      ) as HTMLElement | null;

      if (notesTextarea) {
        notesTextarea.focus();
        setKeyboardStatusMessage(t("widgets.widgetKeyboard.contentNavigationEnabled"));
        return;
      }
    }

    if (widgetId === "minesweeper" || widgetId.startsWith("minesweeper:")) {
      const firstCell = container.querySelector(
        'button[data-minesweeper-cell="0-0"]:not([disabled])'
      ) as HTMLElement | null;

      if (firstCell) {
        firstCell.focus();
        setKeyboardStatusMessage(t("widgets.widgetKeyboard.contentNavigationEnabled"));
        return;
      }
    }

    if (widgetId === "info" || widgetId.startsWith("info:")) {
      const nextBtn = container.querySelector(
        'button[data-info-next-btn="true"]:not([disabled])'
      ) as HTMLElement | null;

      if (nextBtn) {
        nextBtn.focus();
        setKeyboardStatusMessage(t("widgets.widgetKeyboard.contentNavigationEnabled"));
        return;
      }
    }

    if (widgetId.startsWith("customButton:")) {
      const draggableBtn = container.querySelector(
        "button.widget-draggable-button"
      ) as HTMLElement | null;

      if (draggableBtn) {
        draggableBtn.focus();
        setKeyboardStatusMessage(t("widgets.widgetKeyboard.contentNavigationEnabled"));
        return;
      }
    }

    const firstFocusable = container.querySelector(
      'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]'
    ) as HTMLElement | null;

    if (!firstFocusable) {
      setKeyboardStatusMessage(t("widgets.widgetKeyboard.noFocusableContent"));
      return;
    }

    firstFocusable.focus();
    setKeyboardStatusMessage(t("widgets.widgetKeyboard.contentNavigationEnabled"));
  };

  const handleWidgetKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, widgetId: string) => {
    if (event.key === "Escape" && event.target !== event.currentTarget) {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.focus();
      return;
    }

    if (event.key === "ArrowUp" && event.target !== event.currentTarget) {
      const widgetRoot = event.currentTarget;
      const contentElements = Array.from(
        widgetRoot.querySelectorAll<HTMLElement>(
          'textarea,input,select,button:not(.widget-lock-btn):not(.widget-style-btn):not(.widget-clock-mode-btn):not(.widget-clock-background-btn):not(.widget-news-country-btn):not(.widget-spotify-darkmode-btn),[href],[tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.closest(".widget-style-control"));

      const target = event.target as HTMLElement;
      const isFirst =
        contentElements[0] === target || contentElements[0]?.contains(target);

      if (isFirst) {
        // For customButton-widgets skal ArrowUp fra dra-knappen gå direkte til stil-knappen.
        if (widgetId.startsWith("customButton:")) {
          const styleBtn = widgetRoot.querySelector<HTMLButtonElement>(
            "button.widget-style-btn:not([disabled])"
          );
          if (styleBtn) {
            event.preventDefault();
            event.stopPropagation();
            styleBtn.focus();
            return;
          }
        }

        const topControls = Array.from(
          widgetRoot.querySelectorAll<HTMLElement>(
            "button.widget-clock-mode-btn, button.widget-clock-background-btn, button.widget-news-country-btn, button.widget-spotify-darkmode-btn, button.widget-style-btn, button.widget-lock-btn"
          )
        ).filter((btn) => !(btn as HTMLButtonElement).disabled);

        const lastControl = topControls[topControls.length - 1];
        if (lastControl) {
          event.preventDefault();
          event.stopPropagation();
          lastControl.focus();
          return;
        }
      }
    }

    if (event.target !== event.currentTarget) return;
    const isLocked = Boolean(widgetLocks[widgetId]);

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      focusFirstWidgetControl(event.currentTarget, widgetId);
      return;
    }

    if (
      !isLocked &&
      event.ctrlKey &&
      (event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown")
    ) {
      event.preventDefault();
      event.stopPropagation();

      const step = event.shiftKey ? 4 : 1;

      if (event.key === "ArrowLeft") {
        moveWidgetByKeyboard(widgetId, -step, 0);
        return;
      }

      if (event.key === "ArrowRight") {
        moveWidgetByKeyboard(widgetId, step, 0);
        return;
      }

      if (event.key === "ArrowUp") {
        moveWidgetByKeyboard(widgetId, 0, -step);
        return;
      }

      moveWidgetByKeyboard(widgetId, 0, step);
      return;
    }

    if (
      !isLocked &&
      event.shiftKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      (event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown")
    ) {
      event.preventDefault();
      event.stopPropagation();
      resizeWidgetByKeyboard(widgetId, event.key, 1);
      return;
    }

    if (
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "ArrowUp" ||
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      event.stopPropagation();

      const succeeded = focusAdjacentWidget(widgetId, event.key);

      if (!succeeded && event.key === "ArrowLeft") {
        setFocusedWidgetId(null);
        if (onRequestSidebarFocus) {
          onRequestSidebarFocus();
        } else {
          focusSidebarFallback();
        }
      }
    }
  };

  const persistLayout = (newLayout: Layout) => {
    const newLayouts: Record<string, { x: number; y: number; w: number; h: number }> = {};

    // Lagre i basis-koordinater for stabil layout.
    newLayout.forEach(item => {
      const widgetType = getWidgetType(item.i);
      const widget = WIDGETS[widgetType as keyof typeof WIDGETS];
      const baseGrid = widget?.defaultGrid;

      const baseW = scaleSpanToBase(item.w, activeGridColumns);

      newLayouts[item.i] = {
        x: scaleXToBase(item.x, item.w, activeGridColumns),
        y: item.y,
        
        // Ikke tillat mindre størrelse enn widgetens standard.
        w: baseGrid ? Math.max(baseW, baseGrid.w) : baseW,
        h: baseGrid ? Math.max(item.h, baseGrid.h) : item.h,
      };
    });

    onLayoutChange(newLayouts);
  };

  return (
    <div
      data-arrow-scope="dashboard-grid"
      style={{ width: "100%", height: "100%", display: "flex", justifyContent: "flex-start" }}
    >
      <div
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
      >
        {/* Status for skjermleser ved tastaturnavigasjon. */}
        {keyboardStatusMessage}
      </div>
      <GridLayout
        className="layout"
        layout={computedLayout}
        cols={activeGridColumns}
        rowHeight={gridRowHeight}
        width={gridWidth}
        isDraggable={isMovable}
        isResizable={isMovable}
        isBounded={true}
        draggableCancel="a,input,button:not(.widget-draggable-button),select,option,textarea,label,[role='button']:not(.widget-draggable-button),[contenteditable='true'],.widget-lock-btn,.widget-clock-mode-btn,.widget-style-btn,.widget-style-control,.widget-news-country-btn,.widget-news-country-menu,.widget-spotify-darkmode-btn"
        compactType={null}
        preventCollision={true}
        allowOverlap={false}
        margin={[0, 0]}
        maxRows={BASE_GRID_ROWS}
        containerPadding={[0, 0]}
        autoSize={false}
        style={{ height: "100%" }}
        onDragStop={(layout) => persistLayout(layout)}
        onResizeStop={(layout) => persistLayout(layout)}
      >
        {activeWidgets.map((widgetId, index) => {

        const widgetType = getWidgetType(widgetId);
        const widget = WIDGETS[widgetType as keyof typeof WIDGETS];

        if (!widget) return null;

        const Component = widget.Component;
        const baseGrid = widget.defaultGrid;
        const storedLayout = layouts[widgetId];
        const isLocked = Boolean(widgetLocks[widgetId]);
        const widgetStyle = widgetStyles[widgetId];
        const resolvedSurfaceColor = widgetStyle?.widgetSurfaceColor ?? widgetSurfaceColor;
        const resolvedBorderColor = widgetStyle?.widgetBorderColor ?? widgetBorderColor;
        const resolvedTextColor = widgetStyle?.widgetTextColor ?? widgetTextColor;
        const resolvedBlur = widgetStyle?.widgetBlur ?? widgetBlur;
        const resolvedBorderWidth = widgetStyle?.widgetBorderWidth ?? widgetBorderWidth;
        const resolvedFontSize = widgetStyle?.widgetFontSize ?? globalFontSize;
        const surfaceAlpha = getColorAlpha(resolvedSurfaceColor);
        const widgetControlBackground = "rgba(15, 23, 42, 0.58)";
        const widgetControlActiveBackground = "rgba(15, 23, 42, 0.78)";

        type SafeLayout = { x?: number; y?: number; w: number; h: number };
        const currentLayout: SafeLayout = storedLayout
          ? {
              ...storedLayout,
              // Ikke tillat mindre størrelse enn standard.
              w: Math.max(storedLayout.w, baseGrid.w),
              h: Math.max(storedLayout.h, baseGrid.h),
            }
          : baseGrid;
        const isClockWidget = widgetType === "clock";
        const isNewsWidget = widgetType === "news";
        const isSpotifyWidget = widgetType === "spotify";
        const clockMode = clockModes[widgetId] ?? "digital";
        const showClockBackground = clockBackgrounds[widgetId] ?? (clockMode === "analog");
        const isStyleEditorOpen = styleEditorWidgetId === widgetId;
        const isFocused = focusedWidgetId === widgetId;
        const isKeyboardFocused = focusVisibleWidgetId === widgetId;
        return (
          <div
            key={widgetId}
            ref={(element) => {
              if (element) {
                widgetElementRefs.current[widgetId] = element;
              }
            }}
            data-widget-id={widgetId}
            tabIndex={isInteractive ? 0 : -1}
            role="group"
            aria-label={`${widgetType} widget`}
            aria-roledescription="dashboard widget"
            aria-keyshortcuts="Enter ArrowLeft ArrowRight ArrowUp ArrowDown Ctrl+ArrowLeft Ctrl+ArrowRight Ctrl+ArrowUp Ctrl+ArrowDown Ctrl+Shift+ArrowLeft Ctrl+Shift+ArrowRight Ctrl+Shift+ArrowUp Ctrl+Shift+ArrowDown"
            data-grid={{
              ...currentLayout,
              x:
                currentLayout.x !== undefined
                  ? scaleXToCurrent(currentLayout.x, currentLayout.w, activeGridColumns)
                  : scaleXToCurrent((index * 4) % 20, currentLayout.w, activeGridColumns),
              y: currentLayout.y !== undefined ? currentLayout.y : Math.floor(index / 5) * widget.defaultGrid.h,
              w: scaleSpanToCurrent(currentLayout.w, activeGridColumns),
              minW: scaleSpanToCurrent(baseGrid.w, activeGridColumns),
              minH: baseGrid.h,
              static: isLocked,
            }}
            style={{
              position: "relative",
              overflow: "visible",
              outline: isKeyboardFocused ? "2px solid rgba(255,255,255,0.75)" : "none",
              outlineOffset: 2,
              zIndex: isStyleEditorOpen ? 50 : isKeyboardFocused ? 30 : hoveredWidgetId === widgetId ? 10 : 1,
            }}
            onFocus={() => {
              setFocusedWidgetId(widgetId);
              setFocusVisibleWidgetId(lastInteractionWasKeyboardRef.current ? widgetId : null);
            }}
            onBlur={(event) => {
              const nextTarget = event.relatedTarget;
              // Hvis fokus flyttes til et annet barn i widgeten, ikke nullstill (f.eks. knapp i widget).
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
                return;
              }

              // Nullstill fokus når widgeten mister fokus.
              setFocusedWidgetId((prev) => (prev === widgetId ? null : prev));
              setFocusVisibleWidgetId((prev) => (prev === widgetId ? null : prev));
            }}
            onKeyDown={(event) => handleWidgetKeyDown(event, widgetId)}
            onMouseEnter={() => setHoveredWidgetId(widgetId)}
            onMouseLeave={() => setHoveredWidgetId((prev) => (prev === widgetId ? null : prev))}
          >
            {isKeyboardFocused && !isLocked && isMovable && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: 0,
                  marginBottom: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  zIndex: 100,
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    background: "rgba(15,23,42,0.82)",
                    backdropFilter: "blur(8px)",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: 11,
                    fontFamily: "inherit",
                    padding: "3px 8px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                    border: "1px solid rgba(255,255,255,0.15)",
                    lineHeight: 1.5,
                  }}
                >
                  {t("widgets.widgetKeyboard.keyboardHelpMove")}
                </span>
                <span
                  style={{
                    background: "rgba(15,23,42,0.82)",
                    backdropFilter: "blur(8px)",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: 11,
                    fontFamily: "inherit",
                    padding: "3px 8px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                    border: "1px solid rgba(255,255,255,0.15)",
                    lineHeight: 1.5,
                  }}
                >
                  {t("widgets.widgetKeyboard.keyboardHelpResize")}
                </span>
              </div>
            )}
            {isInteractive && (hoveredWidgetId === widgetId || isFocused) && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  zIndex: 2,
                }}
              >
                {/* Klokke-spesifikk: bytter mellom digital og analog visning */}
                {isClockWidget && (
                  <button
                    type="button"
                    className="widget-clock-mode-btn"
                    aria-label={clockMode === "analog" ? "Use digital clock" : "Use analog clock"}
                    title={clockMode === "analog" ? "Use digital clock" : "Use analog clock"}
                    onClick={() => onToggleClockMode(widgetId)}
                    onKeyDown={handleWidgetTopControlKeyDown}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background:
                        clockMode === "analog"
                          ? widgetControlActiveBackground
                          : widgetControlBackground,
                      backdropFilter: "blur(6px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="material-symbols-rounded"
                      aria-hidden="true"
                      style={{ fontSize: 14, color: "#fff", lineHeight: 1 }}
                    >
                      {clockMode === "analog" ? "schedule" : "av_timer"}
                    </span>
                  </button>
                )}
                {/* Klokke-spesifikk: viser/skjuler bakgrunnspanel bak klokkewidgeten */}
                {isClockWidget && (
                  <button
                    type="button"
                    className="widget-clock-background-btn"
                    aria-label={showClockBackground ? "Hide clock background" : "Show clock background"}
                    title={showClockBackground ? "Hide clock background" : "Show clock background"}
                    onClick={() => onToggleClockBackground(widgetId)}
                    onKeyDown={handleWidgetTopControlKeyDown}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background: showClockBackground
                        ? widgetControlActiveBackground
                        : widgetControlBackground,
                      backdropFilter: "blur(6px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="material-symbols-rounded"
                      aria-hidden="true"
                      style={{ fontSize: 14, color: "#fff", lineHeight: 1 }}
                    >
                      {showClockBackground ? "crop_square" : "check_box_outline_blank"}
                    </span>
                  </button>
                )}
                {/* Nyheter-spesifikk: åpner landvelger-menyen for nyhetskilden */}
                {isNewsWidget && (
                  <button
                    type="button"
                    className="widget-news-country-btn"
                    aria-label="Select news country"
                    title="Select news country"
                    aria-haspopup="menu"
                    aria-expanded={newsCountryMenuWidgetId === widgetId}
                    onClick={() =>
                      setNewsCountryMenuWidgetId((prev) => (prev === widgetId ? null : widgetId))
                    }
                    onKeyDown={handleWidgetTopControlKeyDown}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background:
                        newsCountryMenuWidgetId === widgetId
                          ? widgetControlActiveBackground
                          : widgetControlBackground,
                      backdropFilter: "blur(6px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="material-symbols-rounded"
                      aria-hidden="true"
                      style={{ fontSize: 14, color: "#fff", lineHeight: 1 }}
                    >
                      flag
                    </span>
                  </button>
                )}
                {isSpotifyWidget && (
                  <button
                    type="button"
                    className="widget-spotify-darkmode-btn"
                    aria-label={spotifyDarkMode ? t("widgets.spotifyWidget.disableDarkMode") : t("widgets.spotifyWidget.enableDarkMode")}
                    title={spotifyDarkMode ? t("widgets.spotifyWidget.darkModeOn") : t("widgets.spotifyWidget.darkModeOff")}
                    aria-pressed={spotifyDarkMode}
                    onClick={() => {
                      const next = !spotifyDarkMode;
                      setSpotifyDarkMode(next);
                      localStorage.setItem(SPOTIFY_DARK_MODE_STORAGE_KEY, String(next));
                      window.dispatchEvent(
                        new CustomEvent(SPOTIFY_DARK_MODE_EVENT, {
                          detail: { enabled: next },
                        })
                      );
                    }}
                    onKeyDown={handleWidgetTopControlKeyDown}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background: spotifyDarkMode
                        ? widgetControlActiveBackground
                        : widgetControlBackground,
                      backdropFilter: "blur(6px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="material-symbols-rounded"
                      aria-hidden="true"
                      style={{ fontSize: 14, color: "#fff", lineHeight: 1 }}
                    >
                      dark_mode
                    </span>
                  </button>
                )}
                {!isLocked && (
                  <button
                    type="button"
                    className="widget-style-btn"
                    aria-label={t("editPanel.widgetStyleOpen")}
                    title={t("editPanel.widgetStyleOpen")}
                    onClick={() => {
                      setStyleEditorWidgetId((prev) => {
                        const next = prev === widgetId ? null : widgetId;

                        // Sett fokus på første fargevalg når panelet åpnes.
                        if (next === widgetId) {
                          requestAnimationFrame(() => {
                            focusStyleColorButton(widgetId, "surface");
                          });
                        }

                        return next;
                      });
                    }}
                    onKeyDown={handleWidgetTopControlKeyDown}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background:
                        styleEditorWidgetId === widgetId
                          ? widgetControlActiveBackground
                          : widgetControlBackground,
                      backdropFilter: "blur(6px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="material-symbols-rounded"
                      aria-hidden="true"
                      style={{ fontSize: 14, color: "#fff", lineHeight: 1 }}
                    >
                      palette
                    </span>
                  </button>
                )}
                {/* Generisk: låser/låser opp widgeten slik at den ikke kan flyttes eller resizes */}
                <button
                  type="button"
                  className="widget-lock-btn"
                  aria-label={isLocked ? "Unlock widget" : "Lock widget"}
                  title={isLocked ? "Unlock widget" : "Lock widget"}
                  onClick={() => {
                    const willLock = !isLocked;
                    onToggleWidgetLock(widgetId);

                    if (willLock && styleEditorWidgetId === widgetId) {
                      setStyleEditorWidgetId(null);
                    }
                  }}
                  onKeyDown={handleWidgetTopControlKeyDown}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.35)",
                    background: isLocked
                      ? widgetControlActiveBackground
                      : widgetControlBackground,
                    backdropFilter: "blur(6px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <span
                    className="material-symbols-rounded"
                    aria-hidden="true"
                    style={{ fontSize: 14, color: "#fff", lineHeight: 1 }}
                  >
                    {isLocked ? "lock" : "lock_open"}
                  </span>
                </button>
              </div>
            )}

            {isInteractive && !isLocked && isStyleEditorOpen && (
              <div
                className="widget-style-control"
                onKeyDown={(event) => handleStyleControlKeyDown(event, widgetId)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: "calc(100% + 8px)",
                  width: 220,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.35)",
                  background: "rgba(20, 20, 20, 0.78)",
                  backdropFilter: "blur(8px)",
                  color: "#fff",
                  zIndex: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {t("editPanel.widgetStyleThis")}
                </div>

                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {t("editPanel.widgetColorMenu")}
                  {/* Åpner fargevalg for bakgrunnsfargen til denne widgeten */}
                  <button
                    type="button"
                    data-style-color-target="surface"
                    onClick={() =>
                      setActiveStyleColorPicker((prev) =>
                        prev?.widgetId === widgetId && prev.target === "surface"
                          ? null
                          : { widgetId, target: "surface" }
                      )
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "fit-content",
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.6)",
                        background: resolvedSurfaceColor,
                      }}
                    />
                    <span style={{ fontSize: 12 }}>{t("editPanel.widgetColorButton")}</span>
                  </button>
                  {activeStyleColorPicker?.widgetId === widgetId &&
                    activeStyleColorPicker.target === "surface" && (
                      <ColorPicker
                        value={toColorInputValue(resolvedSurfaceColor)}
                        onChange={(hex) =>
                          onSetWidgetStyle(widgetId, {
                            widgetSurfaceColor: withAlpha(hex, surfaceAlpha),
                          })
                        }
                        onClose={() => {
                          setActiveStyleColorPicker(null);
                          requestAnimationFrame(() => {
                            focusStyleColorButton(widgetId, "surface");
                          });
                        }}
                        autoFocus
                      />
                    )}
                </label>

                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {t("editPanel.widgetBlur")}: {resolvedBlur}px
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={resolvedBlur}
                    onKeyDown={(event) => handleStyleSliderKeyDown(event, `${widgetId}:blur`)}
                    onBlur={() => {
                      setActiveStyleSliderId((prev) =>
                        prev === `${widgetId}:blur` ? null : prev
                      );
                    }}
                    onChange={(event) =>
                      onSetWidgetStyle(widgetId, {
                        widgetBlur: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {t("editPanel.widgetOpacity")}: {Math.round(surfaceAlpha * 100)}%
                  <input
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={surfaceAlpha}
                    onKeyDown={(event) => handleStyleSliderKeyDown(event, `${widgetId}:opacity`)}
                    onBlur={() => {
                      setActiveStyleSliderId((prev) =>
                        prev === `${widgetId}:opacity` ? null : prev
                      );
                    }}
                    onChange={(event) =>
                      onSetWidgetStyle(widgetId, {
                        widgetSurfaceColor: withAlpha(resolvedSurfaceColor, Number(event.target.value)),
                      })
                    }
                  />
                </label>

                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {t("editPanel.widgetBorderColorTitle")}
                  {/* Åpner fargevalg for kantfargen til denne widgeten */}
                  <button
                    type="button"
                    data-style-color-target="border"
                    onClick={() =>
                      setActiveStyleColorPicker((prev) =>
                        prev?.widgetId === widgetId && prev.target === "border"
                          ? null
                          : { widgetId, target: "border" }
                      )
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "fit-content",
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.6)",
                        background: resolvedBorderColor,
                      }}
                    />
                    <span style={{ fontSize: 12 }}>{t("editPanel.widgetColorButton")}</span>
                  </button>
                  {activeStyleColorPicker?.widgetId === widgetId &&
                    activeStyleColorPicker.target === "border" && (
                      <ColorPicker
                        value={toColorInputValue(resolvedBorderColor)}
                        onChange={(hex) =>
                          onSetWidgetStyle(widgetId, {
                            widgetBorderColor: hex,
                          })
                        }
                        onClose={() => {
                          setActiveStyleColorPicker(null);
                          requestAnimationFrame(() => {
                            focusStyleColorButton(widgetId, "border");
                          });
                        }}
                        autoFocus
                      />
                    )}
                </label>

                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {t("editPanel.widgetTextColor")}
                  {/* Åpner fargevalg for tekstfargen til denne widgeten */}
                  <button
                    type="button"
                    data-style-color-target="text"
                    onClick={() =>
                      setActiveStyleColorPicker((prev) =>
                        prev?.widgetId === widgetId && prev.target === "text"
                          ? null
                          : { widgetId, target: "text" }
                      )
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "fit-content",
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.6)",
                        background: resolvedTextColor,
                      }}
                    />
                    <span style={{ fontSize: 12 }}>{t("editPanel.widgetColorButton")}</span>
                  </button>
                  {activeStyleColorPicker?.widgetId === widgetId &&
                    activeStyleColorPicker.target === "text" && (
                      <ColorPicker
                        value={toColorInputValue(resolvedTextColor)}
                        onChange={(hex) =>
                          onSetWidgetStyle(widgetId, {
                            widgetTextColor: hex,
                          })
                        }
                        onClose={() => {
                          setActiveStyleColorPicker(null);
                          requestAnimationFrame(() => {
                            focusStyleColorButton(widgetId, "text");
                          });
                        }}
                        autoFocus
                      />
                    )}
                </label>

                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {t("editPanel.fontSize")}: {resolvedFontSize}px
                  <input
                    type="range"
                    min={10}
                    max={22}
                    step={1}
                    value={resolvedFontSize}
                    onKeyDown={(event) => handleStyleSliderKeyDown(event, `${widgetId}:fontSize`)}
                    onBlur={() => {
                      setActiveStyleSliderId((prev) =>
                        prev === `${widgetId}:fontSize` ? null : prev
                      );
                    }}
                    onChange={(event) =>
                      onSetWidgetStyle(widgetId, {
                        widgetFontSize: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {t("editPanel.widgetBorderWidth")}: {resolvedBorderWidth}px
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={1}
                    value={resolvedBorderWidth}
                    onKeyDown={(event) => handleStyleSliderKeyDown(event, `${widgetId}:borderWidth`)}
                    onBlur={() => {
                      setActiveStyleSliderId((prev) =>
                        prev === `${widgetId}:borderWidth` ? null : prev
                      );
                    }}
                    onChange={(event) =>
                      onSetWidgetStyle(widgetId, {
                        widgetBorderWidth: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <div style={{ display: "flex", gap: 8 }}>
                  {/* Tilbakestiller widget-stilen til de globale standardverdiene */}
                  <button
                    type="button"
                    data-style-action="reset"
                    onClick={() => onResetWidgetStyle(widgetId)}
                    onKeyDown={(event) => handleStyleActionButtonKeyDown(event, "reset")}
                    style={{
                      flex: 1,
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      cursor: "pointer",
                      padding: "6px 8px",
                      fontSize: 12,
                    }}
                  >
                    {t("editPanel.widgetStyleResetThis")}
                  </button>
                  {/* Lukker stil-editoren og returnerer fokus til stil-knappen */}
                  <button
                    type="button"
                    data-style-action="close"
                    onClick={() => closeStyleEditorAndFocusButton(widgetId)}
                    onKeyDown={(event) => handleStyleActionButtonKeyDown(event, "close")}
                    style={{
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      cursor: "pointer",
                      padding: "6px 8px",
                      fontSize: 12,
                    }}
                  >
                    {t("editPanel.close")}
                  </button>
                </div>
              </div>
            )}

            {isInteractive && isNewsWidget && newsCountryMenuWidgetId === widgetId && (
              <div
                className="widget-news-country-menu"
                style={{
                  position: "absolute",
                  top: 36,
                  right: 8,
                  zIndex: 20,
                  padding: 8,
                  borderRadius: 12,
                  background: "rgba(15, 23, 42, 0.88)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 6,
                }}
              >
                {NEWS_COUNTRY_OPTIONS.map((option) => {
                  const currentCountry =
                    newsCountries[widgetId] ??
                    (() => {
                      try {
                        return localStorage.getItem(getNewsCountryStorageKey(widgetId)) ?? undefined;
                      } catch {
                        return undefined;
                      }
                    })();
                  const isActive = currentCountry === option.code;

                  // Flaggknapp: setter valgt land og lukker menyen
                  return (
                    <button
                      key={option.code}
                      type="button"
                      aria-label={option.label}
                      title={option.label}
                      aria-pressed={isActive}
                      onClick={() => {
                        try {
                          localStorage.setItem(getNewsCountryStorageKey(widgetId), option.code);
                        } catch {
                          // Ignorer feil.
                        }
                        setNewsCountries((prev) => ({ ...prev, [widgetId]: option.code }));
                        window.dispatchEvent(
                          new CustomEvent("panelia:news:country-change", {
                            detail: { widgetId, country: option.code },
                          })
                        );
                        setNewsCountryMenuWidgetId(null);
                        // Sett fokus tilbake til flagg-knappen etter valg
                        requestAnimationFrame(() => {
                          const widgetRoot = document.querySelector(`[data-widget-id="${widgetId}"]`);
                          if (widgetRoot instanceof HTMLElement) {
                            const flagButton = widgetRoot.querySelector(
                              "button.widget-news-country-btn"
                            ) as HTMLButtonElement | null;
                            flagButton?.focus();
                          }
                        });
                      }}
                      onKeyDown={(event) => {
                        const menuContainer = event.currentTarget.parentElement;
                        if (!menuContainer) return;

                        const buttons = Array.from(
                          menuContainer.querySelectorAll<HTMLButtonElement>("button:not([disabled])")
                        );
                        const currentIndex = buttons.indexOf(event.currentTarget);
                        if (currentIndex === -1) return;

                        const colsPerRow = 4;
                        const currentCol = currentIndex % colsPerRow;
                        const currentRow = Math.floor(currentIndex / colsPerRow);

                        let nextIndex = currentIndex;
                        let handled = false;

                        if (event.key === "ArrowRight") {
                          if (currentCol < colsPerRow - 1 && currentIndex + 1 < buttons.length) {
                            nextIndex = currentIndex + 1;
                            handled = true;
                          }
                        } else if (event.key === "ArrowLeft") {
                          if (currentCol > 0) {
                            nextIndex = currentIndex - 1;
                            handled = true;
                          }
                        } else if (event.key === "ArrowDown") {
                          if (currentIndex + colsPerRow < buttons.length) {
                            nextIndex = currentIndex + colsPerRow;
                            handled = true;
                          }
                        } else if (event.key === "ArrowUp") {
                          if (currentRow > 0) {
                            nextIndex = currentIndex - colsPerRow;
                            handled = true;
                          }
                        } else if (event.key === "Escape") {
                          event.preventDefault();
                          event.stopPropagation();
                          setNewsCountryMenuWidgetId(null);
                          const widgetRoot = event.currentTarget.closest("[data-widget-id]");
                          const flagButton =
                            widgetRoot instanceof HTMLElement
                              ? (widgetRoot.querySelector(
                                  "button.widget-news-country-btn"
                                ) as HTMLButtonElement | null)
                              : null;
                          flagButton?.focus();
                          return;
                        }

                        if (handled) {
                          event.preventDefault();
                          event.stopPropagation();
                          buttons[nextIndex]?.focus();
                        }
                      }}
                      style={{
                        width: 34,
                        height: 26,
                        borderRadius: 8,
                        border: isActive
                          ? "1px solid rgba(255,255,255,0.95)"
                          : "1px solid rgba(255,255,255,0.25)",
                        background: isActive
                          ? "rgba(255,255,255,0.24)"
                          : "rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      <img
                        src={`https://flagcdn.com/w40/${option.code}.png`}
                        alt=""
                        loading="lazy"
                        width={20}
                        height={15}
                        style={{ borderRadius: 2, objectFit: "cover" }}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            <WidgetInstanceProvider widgetId={widgetId}>
                <Component
                config={
                  widgetType === "calendar"
                    ? (calendarWidgetConfig ?? {})
                    : widgetType === "clock"
                      ? { mode: clockMode, showBackground: showClockBackground }
                      : {}
                }
                onConfigChange={() => {}}
                widgetId={widgetId}
                onClose={() => onCloseWidget(widgetId)}
              />
            </WidgetInstanceProvider>
          </div>
        );
        })}
      </GridLayout>
    </div>
  );
}
