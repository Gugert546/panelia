import { useEffect, useState } from "react";
import AddCustomButtonModal from "./AddCustomButtonModal";
import type { CustomButtonConfig } from "../features/dashboard/hooks/useWidgetsState";
import { useFontSize } from '../providers/themeProviders';
import { useLanguage } from '../providers/languageProvider';

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
  const { setFontSizeMode } = useFontSize();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    setModalOpen(false);
  }, [open]);

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setLanguage('no')}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: language === 'no' ? '2px solid #4da3ff' : '1px solid #ddd',
              background: language === 'no' ? '#cde8ff' : '#f3f3f3',
              cursor: 'pointer',
              fontSize: 12
            }}
            title="Norsk"
          >
            Norsk
          </button>
          <button
            onClick={() => setLanguage('en')}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: language === 'en' ? '2px solid #4da3ff' : '1px solid #ddd',
              background: language === 'en' ? '#cde8ff' : '#f3f3f3',
              cursor: 'pointer',
              fontSize: 12
            }}
            title="English"
          >
            English
          </button>
        </div>
        <button onClick={onClose}>{t('editPanel.close')}</button>
      </div>

      <h2>{t('editPanel.selectWidgets')}</h2>

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
          {t('editPanel.addCustomButton')}
        </div>

      </div>

      <AddCustomButtonModal open={modalOpen} onClose={() => setModalOpen(false)} customButtonConfigs={customButtonConfigs} removeCustomButton={removeCustomButton} />
      <div style={{ marginTop: 20 }}>
        <h3>{t('editPanel.fontSize')}</h3>
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
            {t('editPanel.small')}
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
            {t('editPanel.medium')}
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
            {t('editPanel.large')}
          </button>
        </div>
      </div>
    </div>
  );
}