type Widget = {
  id: string;
  label: string;
};

type WidgetSize = "small" | "medium" | "large" | "wide";

type EditPanelProps = {
  open: boolean;
  onClose: () => void;
  availableWidgets: Widget[];
  activeWidgets: string[];
  toggleWidget: (id: string) => void;
  widgetSizes: Record<string, WidgetSize>;
  setWidgetSizes: React.Dispatch<React.SetStateAction<Record<string, WidgetSize>>>;
};

const SIZE_OPTIONS: WidgetSize[] = ["small", "medium", "large", "wide"];

export default function EditPanel({
  open,
  onClose,
  availableWidgets,
  activeWidgets,
  toggleWidget,
  widgetSizes,
  setWidgetSizes
}: EditPanelProps) {

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: open ? 86 : "-50%",
        width: "30%",
        height: "100%",
        background: "#f7cdb3",
        backdropFilter: "blur(10px)",
        transition: "left 0.3s ease",
        zIndex: 999,
        padding: 24,
        boxShadow: "4px 0 12px rgba(0,0,0,0.1)"
      }}
    >
      <button onClick={onClose}>Lukk</button>

      <h2>Velg Widgets</h2>

      <div style={{ marginTop: 20 }}>
        {availableWidgets.map(widget => {

          const isActive = activeWidgets.includes(widget.id);

          return (
            <div
              key={widget.id}
              style={{
                padding: 12,
                width: "50%",
                marginBottom: 10,
                borderRadius: 8,
                cursor: "pointer",
                background: isActive ? "#cde8ff" : "#f3f3f3",
                border: isActive ? "2px solid #4da3ff" : "1px solid #ddd"
              }}
            >
              {/* Toggle */}
              <div onClick={() => toggleWidget(widget.id)}>
                {widget.label}
                {isActive && " ✓"}
              </div>

              {/* Size controls */}
              {isActive && (
                <div style={{ marginTop: 8 }}>
                  {SIZE_OPTIONS.map(size => (
                    <button
                      key={size}
                      onClick={(e) => {
                        e.stopPropagation();
                        setWidgetSizes(prev => ({
                          ...prev,
                          [widget.id]: size
                        }));
                      }}
                      style={{
                        marginRight: 6,
                        marginTop: 4,
                        padding: "2px 6px",
                        borderRadius: 4,
                        border: "none",
                        fontSize: 12,
                        background:
                          widgetSizes[widget.id] === size
                            ? "#4da3ff"
                            : "#ddd",
                        color:
                          widgetSizes[widget.id] === size
                            ? "white"
                            : "#333",
                        cursor: "pointer"
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}