import { useEffect, useRef, useState } from "react";
import AddCustomButtonModal from "./AddCustomButtonModal";
import type {
  CustomButtonConfig,
  DashboardPreset,
  DashboardBackgroundId,
  WidgetSizeMode,
} from "../features/dashboard/hooks/useWidgetsState";
import { useFontSize } from '../providers/themeProviders';
import { useLanguage } from '../providers/languageProvider';
import { uploadBackgroundMedia, validateFileSize } from "../../lib/firebase/storage";
import { useAuth } from "../features/auth/useAuth";
import sol1 from "../../assets/panelia-bg/Sol 1.png";
import sol2 from "../../assets/panelia-bg/Sol 2.png";
import sol3 from "../../assets/panelia-bg/Sol 3.png";
import natt1 from "../../assets/panelia-bg/Natt 1.png";
import natt2 from "../../assets/panelia-bg/Natt 2.png";
import natt3 from "../../assets/panelia-bg/Natt 3.png";

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
  widgetSurfaceColor: string;
  setWidgetSurfaceColor: (color: string) => void;
  widgetBorderColor: string;
  setWidgetBorderColor: (color: string) => void;
  widgetBorderWidth: number;
  setWidgetBorderWidth: (width: number) => void;
  widgetSizeMode: WidgetSizeMode;
  setWidgetSizeMode: (mode: WidgetSizeMode) => void;
  dashboardBackgroundId: DashboardBackgroundId;
  setDashboardBackgroundId: (backgroundId: DashboardBackgroundId) => void;
  setCustomVideoBackgroundUrl: (url: string) => void;
  dashboardPresets: DashboardPreset[];
  saveCurrentAsPreset: (name?: string) => string;
  applyDashboardPreset: (presetId: string) => boolean;
  deleteDashboardPreset: (presetId: string) => void;
};

const BACKGROUND_OPTIONS: Array<{
  id: DashboardBackgroundId;
  labelKey: string;
  preview?: string;
}> = [
  { id: "sol1", labelKey: "editPanel.backgroundSol1", preview: sol1 },
  { id: "sol2", labelKey: "editPanel.backgroundSol2", preview: sol2 },
  { id: "sol3", labelKey: "editPanel.backgroundSol3", preview: sol3 },
  { id: "natt1", labelKey: "editPanel.backgroundNatt1", preview: natt1 },
  { id: "natt2", labelKey: "editPanel.backgroundNatt2", preview: natt2 },
  { id: "natt3", labelKey: "editPanel.backgroundNatt3", preview: natt3 },
  { id: "videoCustom", labelKey: "editPanel.backgroundVideoCustom" },
];

const DEFAULT_WIDGET_SURFACE_COLOR = "rgba(255,255,255,0.15)";
const DEFAULT_WIDGET_BORDER_COLOR = "rgba(255,255,255,0.35)";
const DEFAULT_WIDGET_BORDER_WIDTH = 1;
const DEFAULT_WIDGET_SIZE_MODE: WidgetSizeMode = "medium";

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

  return "#ffffff";
}

export default function EditPanel({
  open,
  onClose,
  availableWidgets,
  activeWidgets,
  toggleWidget,
  customButtonConfigs,
  removeCustomButton,
  widgetSurfaceColor,
  setWidgetSurfaceColor,
  widgetBorderColor,
  setWidgetBorderColor,
  widgetBorderWidth,
  setWidgetBorderWidth,

  setWidgetSizeMode,
  dashboardBackgroundId,
  setDashboardBackgroundId,
  setCustomVideoBackgroundUrl,
  dashboardPresets,
  saveCurrentAsPreset,
  applyDashboardPreset,
  deleteDashboardPreset,
}: EditPanelProps) {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"widgets" | "background">("widgets");
  const [presetName, setPresetName] = useState("");
  const customVideoInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadVideoError, setUploadVideoError] = useState("");
  const { setFontSizeMode } = useFontSize();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    setModalOpen(false);
    setViewMode("widgets");
  }, [open]);

  const handleCustomVideoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user) {
      setUploadVideoError(t('editPanel.uploadNotSignedIn') || "Please sign in first");
      return;
    }

    const validation = validateFileSize(file);
    if (!validation.valid) {
      setUploadVideoError(t('editPanel.fileTooLarge') || validation.error || "File is too large");
      event.target.value = "";
      return;
    }

    setUploadingVideo(true);
    setUploadVideoError("");

    try {
      const downloadUrl = await uploadBackgroundMedia(file, "video");
      setCustomVideoBackgroundUrl(downloadUrl);
      setDashboardBackgroundId("videoCustom");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setUploadVideoError(errorMsg);
    } finally {
      setUploadingVideo(false);
      event.target.value = "";
    }
  };

  const handleResetWidgetStyle = () => {
    setWidgetSurfaceColor(DEFAULT_WIDGET_SURFACE_COLOR);
    setWidgetBorderColor(DEFAULT_WIDGET_BORDER_COLOR);
    setWidgetBorderWidth(DEFAULT_WIDGET_BORDER_WIDTH);
    setWidgetSizeMode(DEFAULT_WIDGET_SIZE_MODE);
    setFontSizeMode("medium");
  };

  const handleSavePreset = () => {
    saveCurrentAsPreset(presetName);
    setPresetName("");
  };

  const handleApplyPreset = (presetId: string) => {
    applyDashboardPreset(presetId);
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

      <h2>
        {viewMode === "widgets"
          ? t('editPanel.selectWidgets')
          : t('editPanel.modeBackground')}
      </h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        <button
          onClick={() => setViewMode("widgets")}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: viewMode === "widgets" ? "2px solid #4da3ff" : "1px solid #ddd",
            background: viewMode === "widgets" ? "#cde8ff" : "#f3f3f3",
            cursor: "pointer",
          }}
        >
          {t('editPanel.modeWidgets')}
        </button>
        <button
          onClick={() => setViewMode("background")}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: viewMode === "background" ? "2px solid #4da3ff" : "1px solid #ddd",
            background: viewMode === "background" ? "#cde8ff" : "#f3f3f3",
            cursor: "pointer",
          }}
        >
          {t('editPanel.modeBackground')}
        </button>
      </div>

      <div
        style={{
          marginTop: 20,
          overflowY: "auto",
          flex: 1,
          paddingRight: 6
        }}
      >

        {viewMode === "widgets" &&
          availableWidgets.map(widget => {

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

        {viewMode === "widgets" && (
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
        )}

        {viewMode === "background" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              width: "90%",
            }}
          >  
        <div style={{ marginTop: 1 }}>
          <h3>{t('editPanel.customPresets')}</h3>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <input
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder={t('editPanel.presetNamePlaceholder')}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#fff",
              }}
            />

            <button
              onClick={handleSavePreset}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#f3f3f3",
                cursor: "pointer",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {t('editPanel.savePreset')}
            </button>
          </div>

          {dashboardPresets.length === 0 && (
            <div
              style={{
                fontSize: 13,
                color: "#4b5563",
                background: "#f7f7f7",
                border: "1px dashed #d1d5db",
                borderRadius: 8,
                padding: "8px 10px",
                marginBottom: 12,
              }}
            >
              {t('editPanel.noPresets')}
            </div>
          )}

          {dashboardPresets.map((preset) => (
            <div
              key={preset.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                background: "#f7f7f7",
                padding: 10,
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {preset.name}
              </div>
              <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 8 }}>
                {new Date(preset.createdAt).toLocaleString()}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleApplyPreset(preset.id)}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #bcd5f7",
                    background: "#eaf4ff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {t('editPanel.applyPreset')}
                </button>

                <button
                  onClick={() => deleteDashboardPreset(preset.id)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #e5b4b4",
                    background: "#fff1f1",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {t('editPanel.deletePreset')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 1}}>
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
            <label style={{ fontSize: 14, fontWeight: 600 }}>
              {t('editPanel.widgetColor')}
            </label>

            <label
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "fit-content",
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#f6f6f6",
                cursor: "pointer",
              }}
            >
              <input
                type="color"
                value={toColorInputValue(widgetSurfaceColor)}
                onChange={(event) => setWidgetSurfaceColor(event.target.value)}
                aria-label={t('editPanel.widgetColor')}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  cursor: "pointer",
                }}
              />
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.3)",
                  background: widgetSurfaceColor,
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {t('editPanel.widgetColor')}
              </span>
            </label>

            <label style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>
              {t('editPanel.widgetBorderColor')}
            </label>

            <label
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "fit-content",
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#f6f6f6",
                cursor: "pointer",
              }}
            >
              <input
                type="color"
                value={toColorInputValue(widgetBorderColor)}
                onChange={(event) => setWidgetBorderColor(event.target.value)}
                aria-label={t('editPanel.widgetBorderColor')}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  cursor: "pointer",
                }}
              />
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.3)",
                  background: widgetBorderColor,
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {t('editPanel.widgetBorderColor')}
              </span>
            </label>

            <label style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>
              {t('editPanel.widgetBorderWidth')}: {widgetBorderWidth}px
            </label>

            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={widgetBorderWidth}
              onChange={(event) => setWidgetBorderWidth(Number(event.target.value))}
              aria-label={t('editPanel.widgetBorderWidth')}
              style={{ width: "100%" }}
            />

            <button
              onClick={handleResetWidgetStyle}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#f3f3f3",
                cursor: "pointer",
                fontWeight: 600,
                textAlign: "left",
              }}
            >
              {t('editPanel.resetWidgetStyle')}
            </button>

            <input
              ref={customVideoInputRef}
              type="file"
              accept="video/mp4,video/webm"
              onChange={handleCustomVideoUpload}
              style={{ display: "none" }}
            />

            <button
              onClick={() => !uploadingVideo && customVideoInputRef.current?.click()}
              disabled={uploadingVideo}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: uploadVideoError ? "1px solid #d97706" : "1px solid #ddd",
                background: uploadVideoError ? "#fef3c7" : "#f3f3f3",
                cursor: uploadingVideo ? "not-allowed" : "pointer",
                textAlign: "left",
                fontWeight: 600,
                opacity: uploadingVideo ? 0.6 : 1,
              }}
            >
              {uploadingVideo ? t('editPanel.uploading') : t('editPanel.uploadCustomVideo')}
            </button>

            {uploadVideoError && (
              <div
                style={{
                  fontSize: 12,
                  color: "#92400e",
                  background: "#fef3c7",
                  border: "1px solid #d97706",
                  borderRadius: 8,
                  padding: "8px 10px",
                }}
              >
                {uploadVideoError}
              </div>
            )}

            <div
              style={{
                fontSize: 12,
                color: "#4b5563",
                background: "#f7f7f7",
                border: "1px dashed #d1d5db",
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              {t('editPanel.customVideoSyncNote')}
            </div>

            {BACKGROUND_OPTIONS.map((option) => {
              const selected = dashboardBackgroundId === option.id;

              if (option.preview) {
                return (
                  <button
                    key={option.id}
                    onClick={() => setDashboardBackgroundId(option.id)}
                    aria-label={t(option.labelKey)}
                    style={{
                      width: "100%",
                      padding: 0,
                      borderRadius: 10,
                      border: selected ? "2px solid #4da3ff" : "1px solid #ddd",
                      background: selected ? "#eaf4ff" : "#f7f7f7",
                      cursor: "pointer",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={option.preview}
                      alt=""
                      style={{
                        width: "100%",
                        height: 72,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </button>
                );
              }

              return (
                <button
                  key={option.id}
                  onClick={() => setDashboardBackgroundId(option.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,
                    border: selected ? "2px solid #4da3ff" : "1px solid #ddd",
                    background: selected ? "#eaf4ff" : "#f7f7f7",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {option.id.startsWith("video") ? (
                    <div
                      style={{
                        width: 64,
                        height: 38,
                        borderRadius: 6,
                        border: "1px solid rgba(0,0,0,0.2)",
                        background: "linear-gradient(135deg, #294b82, #5f8cc7, #b2d9ff)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#eaf4ff",
                        flexShrink: 0,
                      }}
                    >
                      Video
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 38,
                        borderRadius: 6,
                        border: "1px solid rgba(0,0,0,0.2)",
                        background:
                          "linear-gradient(120deg, rgba(255,255,255,0.85), rgba(200,220,255,0.95))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#1e2d4d",
                        flexShrink: 0,
                      }}
                    >
                      Auto
                    </div>
                  )}

                  <span style={{ fontWeight: 500 }}>
                    {t(option.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

      </div>

      <AddCustomButtonModal open={modalOpen} onClose={() => setModalOpen(false)} customButtonConfigs={customButtonConfigs} removeCustomButton={removeCustomButton} />
      

    </div>
  );
}