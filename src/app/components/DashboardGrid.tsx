import { useEffect, useRef, useState } from "react";
import GridLayout from "react-grid-layout/legacy";
import type { Layout } from "react-grid-layout";
import { ColorPicker } from "./ColorPicker";
import { WIDGETS } from "../features/Widgets/registry/WidgetRegistry";
import { WidgetInstanceProvider } from "../features/Widgets/components/WidgetInstanceContext";
import type { WidgetStyleOverrides } from "../features/dashboard/hooks/useWidgetsState";
import { useLanguage } from "../providers/languageProvider";
import { useFontSize } from "../providers/themeProviders";

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

function getWidgetType(widgetId: string) {
  const separatorIndex = widgetId.indexOf(":");
  if (separatorIndex === -1) return widgetId;
  return widgetId.slice(0, separatorIndex);
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

  const focusAdjacentWidget = (
    widgetId: string,
    direction: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown"
  ): boolean => {
    const current = computedLayout.find((item) => item.i === widgetId);
    if (!current) return false;

    const cx = current.x + current.w / 2;
    const cy = current.y + current.h / 2;
    const isHorizontal = direction === "ArrowLeft" || direction === "ArrowRight";

    // Step 1: Filter to only widgets in the target direction (by center)
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

    // Step 2: Prefer widgets that share overlap on the perpendicular axis (same row/col).
    //         If any exist, use only those. Otherwise fall back to all in-direction widgets.
    const overlapping = inDirection.filter((item) =>
      isHorizontal
        ? current.y < item.y + item.h && current.y + current.h > item.y
        : current.x < item.x + item.w && current.x + current.w > item.x
    );

    const pool = overlapping.length > 0 ? overlapping : inDirection;

    // Step 3: Among the pool, pick the one closest in the primary direction
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

    const controls = Array.from(
      controlsContainer.querySelectorAll<HTMLButtonElement>(
        "button.widget-clock-mode-btn, button.widget-clock-background-btn, button.widget-style-btn, button.widget-lock-btn"
      )
    ).filter((button) => !button.disabled);

    const index = controls.indexOf(currentButton);
    if (index === -1) return;

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

      const nextControl = controls[index + 1];
      if (nextControl) {
        nextControl.focus();
        return;
      }

      const widgetRoot = currentButton.closest("[data-widget-id]");
      if (!(widgetRoot instanceof HTMLElement)) return;

      const firstArticleLink = widgetRoot.querySelector(
        '.news-widget-list a[href]'
      ) as HTMLElement | null;
      if (firstArticleLink) {
        firstArticleLink.focus();
        return;
      }

      const firstInnerControl = widgetRoot.querySelector(
        'textarea,input,select,button:not(.widget-lock-btn):not(.widget-style-btn):not(.widget-clock-mode-btn):not(.widget-clock-background-btn),[href],[tabindex]:not([tabindex="-1"])'
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
          'textarea,input,select,button:not(.widget-lock-btn):not(.widget-style-btn):not(.widget-clock-mode-btn):not(.widget-clock-background-btn),[href],[tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.closest(".widget-style-control"));

      const target = event.target as HTMLElement;
      const isFirst =
        contentElements[0] === target || contentElements[0]?.contains(target);

      if (isFirst) {
        const topControls = Array.from(
          widgetRoot.querySelectorAll<HTMLElement>(
            "button.widget-clock-mode-btn, button.widget-clock-background-btn, button.widget-style-btn, button.widget-lock-btn"
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
    if (widgetLocks[widgetId]) return;

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      focusFirstWidgetControl(event.currentTarget, widgetId);
      return;
    }

    if (
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

    newLayout.forEach(item => {
      const widgetType = getWidgetType(item.i);
      const widget = WIDGETS[widgetType as keyof typeof WIDGETS];
      const baseGrid = widget?.defaultGrid;

      const baseW = scaleSpanToBase(item.w, activeGridColumns);

      newLayouts[item.i] = {
        x: scaleXToBase(item.x, item.w, activeGridColumns),
        y: item.y,
        
        // Clamp to widget minimums so users can’t resize smaller than starting size
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
        draggableCancel="input,button,select,option,textarea,label,[role='button'],[contenteditable='true'],.widget-lock-btn,.widget-clock-mode-btn,.widget-style-btn,.widget-style-control"
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
              // Ensure persisted layouts never shrink below the widget's default size
              w: Math.max(storedLayout.w, baseGrid.w),
              h: Math.max(storedLayout.h, baseGrid.h),
            }
          : baseGrid;
        const isClockWidget = widgetType === "clock";
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
              zIndex: isStyleEditorOpen ? 50 : hoveredWidgetId === widgetId ? 10 : 1,
            }}
            onFocus={() => {
              setFocusedWidgetId(widgetId);
              setFocusVisibleWidgetId(lastInteractionWasKeyboardRef.current ? widgetId : null);
            }}
            onBlur={(event) => {
              const nextTarget = event.relatedTarget;
              // If focus is moving to another widget child, don't clear (e.g., button inside widget)
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
                return;
              }

              // Always clear the focused widget ID for this widget when it loses focus
              setFocusedWidgetId((prev) => (prev === widgetId ? null : prev));
              setFocusVisibleWidgetId((prev) => (prev === widgetId ? null : prev));
            }}
            onKeyDown={(event) => handleWidgetKeyDown(event, widgetId)}
            onMouseEnter={() => setHoveredWidgetId(widgetId)}
            onMouseLeave={() => setHoveredWidgetId((prev) => (prev === widgetId ? null : prev))}
          >
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
                {!isLocked && (
                  <button
                    type="button"
                    className="widget-style-btn"
                    aria-label={t("editPanel.widgetStyleOpen")}
                    title={t("editPanel.widgetStyleOpen")}
                    onClick={() =>
                      setStyleEditorWidgetId((prev) => (prev === widgetId ? null : widgetId))
                    }
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
