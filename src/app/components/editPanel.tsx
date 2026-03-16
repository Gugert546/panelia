import { useFontSize } from '../providers/themeProviders';

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
  const { setFontSizeMode } = useFontSize();

  const hasWidgetType = (widgetType: string) => {
    return activeWidgets.some((activeId) => {
      if (activeId === widgetType) return true;
      return activeId.startsWith(`${widgetType}:`);
    });
  };

  return (
    <div
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
        flexDirection: "column"
      }}
    >

      <button onClick={onClose}>Lukk</button>

      <h2>Velg Widgets</h2>

      <div
        style={{
          marginTop: 20,
          overflowY: "auto",
          flex: 1,
          paddingRight: 6
        }}
      >

        {availableWidgets.map(widget => {

          const isActive = hasWidgetType(widget.id);
          const isNotes = widget.id === "notes";

          return (
            <div
              key={widget.id}
              onClick={() => toggleWidget(widget.id)}
              style={{
                padding: 12,
                width: "90%",
                marginBottom: 10,
                borderRadius: 8,
                cursor: "pointer",
                background: isActive ? "#cde8ff" : "#f3f3f3",
                border: isActive
                  ? "2px solid #4da3ff"
                  : "1px solid #ddd"
              }}
            >
              {widget.label}
              {isNotes ? " +" : isActive ? " ✓" : ""}
            </div>
          );
        })}

      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Font Size</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setFontSizeMode('small')}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #ddd',
              background: '#f3f3f3',
              cursor: 'pointer'
            }}
          >
            Small
          </button>
          <button
            onClick={() => setFontSizeMode('medium')}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #ddd',
              background: '#f3f3f3',
              cursor: 'pointer'
            }}
          >
            Medium
          </button>
          <button
            onClick={() => setFontSizeMode('large')}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #ddd',
              background: '#f3f3f3',
              cursor: 'pointer'
            }}
          >
            Large
          </button>
        </div>
      </div>
    </div>
  );
}