type Widget = {
  id: string;
  label: string;
};

type EditPanelProps = {
  open: boolean;
  onClose: () => void;
  availableWidgets: Widget[];
  activeWidgets: string[];
  toggleWidget: (id: string) => void;
};

export default function EditPanel({
  open,
  onClose,
  availableWidgets,
  activeWidgets,
  toggleWidget
}: EditPanelProps) {

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: open ? 86 : "-50%",
        width: "50%",
        height: "100%",
        background: "rgba(255, 255, 255, 0.95)",
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
              onClick={() => toggleWidget(widget.id)}
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
              {widget.label}
              {isActive && " ✓"}
            </div>
          );
        })}
      </div>
    </div>
  );
}