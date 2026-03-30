import React from "react";
import { useWidgets } from "../../dashboard/hooks/WidgetsContext";

type WidgetPaneProps = {
  title?: string;
  noShadow?: boolean;
  children: React.ReactNode;
};

export default function WidgetPane({ title, children }: WidgetPaneProps) {
  const { widgetSurfaceColor, widgetBorderColor, widgetTextColor, widgetOpacity, widgetBorderWidth } = useWidgets();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 20,
        borderRadius: 20,

        background: widgetSurfaceColor,
        border: `${widgetBorderWidth}px solid ${widgetBorderColor}`,
        color: widgetTextColor,
        opacity: widgetOpacity,
        backdropFilter: "blur(14px)",

        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {title && (
        <h3
          style={{
            margin: 0,
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