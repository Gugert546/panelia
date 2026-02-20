import React from "react";

type WidgetPaneProps = {
  title?: string;
  children: React.ReactNode;
};

export default function WidgetPane({ title, children }: WidgetPaneProps) {
  return (
    <div
      style={{
        minWidth: 280,
        padding: 20,
        borderRadius: 20,

        // matches floating-on-background look
        background: "rgba(255,255,255,0.15)",
        backdropFilter: "blur(14px)",

        // soft elevation like dashboard layering
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",

        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "center",
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

      <div style={{ width: "100%" }}>
        {children}
      </div>
    </div>
  );
}

/*

Eksempler:

<WidgetPane title="Clock">
  <ClockWidgetMock />
</WidgetPane>


<WidgetPane title="Search">
  <SearchWidgetMock />
</WidgetPane>


*/ 