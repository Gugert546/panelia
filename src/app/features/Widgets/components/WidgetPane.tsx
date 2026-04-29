import React from "react";
import { useWidgets } from "../../dashboard/hooks/WidgetsContext";
import { useWidgetInstance } from "./WidgetInstanceContext";
import { useResolvedWidgetFontSize } from "../hooks/useResolvedWidgetFontSize";

type WidgetPaneProps = {
  title?: string;
  noShadow?: boolean;
  children: React.ReactNode;
};

export default function WidgetPane({ title, children }: WidgetPaneProps) {
  const {
    widgetSurfaceColor,
    widgetBorderColor,
    widgetTextColor,
    widgetBlur,
    widgetBorderWidth,
    widgetStyles,
  } = useWidgets();
  const widgetInstance = useWidgetInstance();
  const widgetStyle = widgetInstance ? widgetStyles[widgetInstance.widgetId] : undefined;
  const resolvedFontSize = useResolvedWidgetFontSize();

  const resolvedSurfaceColor = widgetStyle?.widgetSurfaceColor ?? widgetSurfaceColor;
  const resolvedBorderColor = widgetStyle?.widgetBorderColor ?? widgetBorderColor;
  const resolvedTextColor = widgetStyle?.widgetTextColor ?? widgetTextColor;
  const resolvedBlur = widgetStyle?.widgetBlur ?? widgetBlur;
  const resolvedBorderWidth = widgetStyle?.widgetBorderWidth ?? widgetBorderWidth;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 8,
        borderRadius: 20,
        overflow: "hidden",

        background: resolvedSurfaceColor,
        border: `${resolvedBorderWidth}px solid ${resolvedBorderColor}`,
        color: resolvedTextColor,
        fontSize: resolvedFontSize,
        backdropFilter: `blur(${resolvedBlur}px)`,
        WebkitBackdropFilter: `blur(${resolvedBlur}px)`,

        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {title && (
        <h3
          style={{
            margin: 0,
            fontSize: Math.max(resolvedFontSize + 2, 16),
            fontWeight: 500,
            letterSpacing: 0.4,
          }}
        >
          {title}
        </h3>
      )}
        {/* endret for å fikse scroll problem i kalender widget */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}
