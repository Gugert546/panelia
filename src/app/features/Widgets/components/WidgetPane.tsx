import React from "react";

type WidgetPaneProps = {
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties; // ✅ NY
};

export default function WidgetPane({ title, children, style }: WidgetPaneProps) {
  return (
    <div
      style={{
        minWidth: 280,
        padding: 20,
        borderRadius: 20,

        // default glass look
        background: "rgba(255,255,255,0.15)",
        backdropFilter: "blur(14px)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",

        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "center",

        ...style, // ✅ gjør at NotesWidget kan overstyre glass-bakgrunn
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

      <div style={{ width: "100%" }}>{children}</div>
    </div>
  );
}