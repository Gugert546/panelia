import { useEffect, useState } from "react";
import AddCustomButtonModal from "./AddCustomButtonModal";
import type { CustomButtonConfig } from "../features/dashboard/hooks/useWidgetsState";

type Widget = {
  id: string;
  label: string;
};

type EditPanelProps = {
  open: boolean;
  onClose: () => void;
  availableWidgets: readonly Widget[];
  activeWidgets: string[];
  toggleWidget: (id: string) => void;
  customButtonConfigs: Record<string, CustomButtonConfig>;
  removeCustomButton: (id: string) => void;
};

export default function EditPanel({
  open,
  onClose,
  availableWidgets,
  activeWidgets,
  toggleWidget,
  customButtonConfigs,
  removeCustomButton
}: EditPanelProps) {
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setModalOpen(false);
  }, [open]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: open ? 86 : "-50%",
        width: "15%",
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

          const isActive = activeWidgets.includes(widget.id);

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
              {isActive && " ✓"}
            </div>
          );
        })}

        <div
          onClick={() => setModalOpen(true)}
          style={{
            padding: 12,
            width: "90%",
            marginBottom: 10,
            borderRadius: 8,
            cursor: "pointer",
            background: "#f3f3f3",
            border: "1px solid #ddd"
          }}
        >
          Legg til egendefinert knapp
        </div>

      </div>

      <AddCustomButtonModal open={modalOpen} onClose={() => setModalOpen(false)} customButtonConfigs={customButtonConfigs} removeCustomButton={removeCustomButton} />
    </div>
  );
}