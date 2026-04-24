import { useEffect, useRef, useState } from "react";
import AddCustomButtonModal from "./AddCustomButtonModal";
import type {
  CustomBackgroundMediaType,
  CustomButtonConfig,
  DashboardPreset,
  DashboardBackgroundId,
  WidgetSizeMode,
} from "../features/dashboard/hooks/useWidgetsState";
import { useFontSize } from '../providers/themeProviders';
import { useLanguage } from '../providers/languageProvider';
import {
  detectBackgroundMediaType,
  uploadBackgroundMedia,
  validateFileSize,
} from "../../lib/firebase/storage";
import { useAuth } from "../features/auth/useAuth";
import paneliabgmashup from "../../assets/panelia-bg/paneliabgmashup.png";


type Widget = {
  id: string;
  label: string;
  icon?: string;
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
  widgetTextColor: string;
  setWidgetTextColor: (color: string) => void;
  widgetOpacity: number;
  setWidgetOpacity: (opacity: number) => void;
  widgetBorderWidth: number;
  setWidgetBorderWidth: (width: number) => void;
  widgetSizeMode: WidgetSizeMode;
  setWidgetSizeMode: (mode: WidgetSizeMode) => void;
  dashboardBackgroundId: DashboardBackgroundId;
  setDashboardBackgroundId: (backgroundId: DashboardBackgroundId) => void;
  setCustomBackgroundUrl: (url: string) => void;
  setCustomBackgroundType: (type: CustomBackgroundMediaType) => void;
  dashboardPresets: DashboardPreset[];
  saveCurrentAsPreset: (name?: string) => string;
  applyDashboardPreset: (presetId: string) => boolean;
  deleteDashboardPreset: (presetId: string) => void;
  clearUnlockedWidgetStyles: () => void;
  clearAllWidgetStyles: () => void;
};

const BACKGROUND_OPTIONS: Array<{
  id: DashboardBackgroundId;
  labelKey: string;
  preview?: string;
}> = [
  { id: "defaultbg", labelKey: "editPanel.paneliabgmashup", preview: paneliabgmashup },
  
];

const DEFAULT_WIDGET_SURFACE_COLOR = "rgba(255,255,255,0.15)";
const DEFAULT_WIDGET_BORDER_COLOR = "rgba(255,255,255,0.35)";
const DEFAULT_WIDGET_TEXT_COLOR = "#000000";
const DEFAULT_WIDGET_OPACITY = 1;
const DEFAULT_WIDGET_BORDER_WIDTH = 1;
const DEFAULT_WIDGET_SIZE_MODE: WidgetSizeMode = "medium";
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 22;

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

  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i
  );

  if (rgbaMatch) {
    const [, red, green, blue] = rgbaMatch;
    return `#${[red, green, blue]
      .map((channel) => Number(channel).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  return "#ffffff";
}

function getColorAlpha(value: string) {
  const trimmed = value.trim();
  const rgbaMatch = trimmed.match(
    /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/i
  );

  if (rgbaMatch) {
    return Number(rgbaMatch[1]);
  }

  return 1;
}

function withAlpha(color: string, alpha: number) {
  const normalizedColor = toColorInputValue(color);
  const hex = normalizedColor.slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${red},${green},${blue},${alpha})`;
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
  widgetTextColor: selectedWidgetTextColor,
  setWidgetTextColor,
  setWidgetOpacity,
  widgetBorderWidth,
  setWidgetBorderWidth,

  setWidgetSizeMode,
  dashboardBackgroundId,
  setDashboardBackgroundId,
  setCustomBackgroundUrl,
  setCustomBackgroundType,
  dashboardPresets,
  saveCurrentAsPreset,
  applyDashboardPreset,
  deleteDashboardPreset,
  clearUnlockedWidgetStyles,
  clearAllWidgetStyles,
}: EditPanelProps) {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"widgets" | "background">("widgets");
  const [presetName, setPresetName] = useState("");
  const customBackgroundInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadBackgroundError, setUploadBackgroundError] = useState("");
  const { fontSize: widgetFontSize, setFontSize } = useFontSize();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const widgetSurfaceAlpha = getColorAlpha(widgetSurfaceColor);
  const panelSurfaceColor = "rgba(255,255,255,0.24)";
  const panelBorderColor = "rgba(15,23,42,0.22)";
  const panelTextColor = "#0f172a";
  const widgetTextColor = panelTextColor;
  const fontSize = 14;
  const notesWidgetCount = activeWidgets.filter(
    (activeWidgetId) => activeWidgetId === "notes" || activeWidgetId.startsWith("notes:")
  ).length;

  useEffect(() => {
    setModalOpen(false);
    setViewMode("widgets");
  }, [open]);
  
  const handleCustomBackgroundUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user) {
      setUploadBackgroundError(t('editPanel.uploadNotSignedIn') || "Please sign in first");
      return;
    }

    const mediaType = detectBackgroundMediaType(file) as CustomBackgroundMediaType | null;

    if (!mediaType) {
      setUploadBackgroundError(
        t('editPanel.unsupportedBackgroundFile') ||
          "Unsupported file type. Please upload an image or video."
      );
      event.target.value = "";
      return;
    }

    const validation = validateFileSize(file);
    if (!validation.valid) {
      setUploadBackgroundError(t('editPanel.fileTooLarge') || validation.error || "File is too large");
      event.target.value = "";
      return;
    }

    setUploadingBackground(true);
    setUploadBackgroundError("");

    try {
      const downloadUrl = await uploadBackgroundMedia(file, mediaType);
      setCustomBackgroundUrl(downloadUrl);
      setCustomBackgroundType(mediaType);
      setDashboardBackgroundId("customMedia");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setUploadBackgroundError(errorMsg);
    } finally {
      setUploadingBackground(false);
      event.target.value = "";
    }
  };

  const handleResetWidgetStyle = () => {
    setWidgetSurfaceColor(DEFAULT_WIDGET_SURFACE_COLOR);
    setWidgetBorderColor(DEFAULT_WIDGET_BORDER_COLOR);
    setWidgetTextColor(DEFAULT_WIDGET_TEXT_COLOR);
    setWidgetOpacity(DEFAULT_WIDGET_OPACITY);
    setWidgetBorderWidth(DEFAULT_WIDGET_BORDER_WIDTH);
    setWidgetSizeMode(DEFAULT_WIDGET_SIZE_MODE);
    setFontSize(DEFAULT_FONT_SIZE);
  };

  const handleSavePreset = () => {
    saveCurrentAsPreset(presetName);
    setPresetName("");
  };

  const handleApplyPreset = (presetId: string) => {
    applyDashboardPreset(presetId);
  };
  //farge på elementer i tema/widget meny
  const backgroundColor = panelSurfaceColor;
  //border-radius på elementer i tema menyen
  const borderRadiusThemeElements =8;
  //padding på elementer i tema-menyen
  const themeElementsPadding ='8px 12px';
  //størrelser på iconene i widget-menyen
  const widgetIconSize = Math.max(fontSize + 8, 22);
  //font størrelse på titler i tema-menyen
  const titleTextSize= Math.max(fontSize+ 3);
  //font størrelse på tittelen på sidemenyen
  const bigTitleFontSize= Math.max(fontSize+7);
  //farge på knapper
  const buttonColor = "#d3d3d36e";
  //border rundt knapper
  const buttonBorder = `1px solid ${panelBorderColor}`;
  //border rundet highlightede knapper
  const buttonBorderHighlight= "2px solid #ffffffe0"

  const buttonColorHighlight = "#ffffffb7"

  function handleResetTextColor(): void {
    setWidgetTextColor(DEFAULT_WIDGET_TEXT_COLOR);
  }

  function handleResetBorderColor(): void{
    setWidgetBorderColor(DEFAULT_WIDGET_BORDER_COLOR);
  }

  function handleResetWidgetColor(): void{
    setWidgetSurfaceColor(DEFAULT_WIDGET_SURFACE_COLOR);
  }

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
              border: language === 'no' ? buttonBorderHighlight: buttonBorder,
              background: language === 'no' ? buttonColorHighlight : buttonColor,
              cursor: 'pointer',
              fontSize,
              color:widgetTextColor,
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
              border: language === 'en' ? buttonBorderHighlight: buttonBorder,
              background: language === 'en' ? buttonColorHighlight : buttonColor,
              cursor: 'pointer',
              fontSize,
              color:widgetTextColor,
            }}
            title="English"
          >
            English
          </button>
        </div>
        <button style={{ 
          fontSize,
          background: buttonColor,
          borderRadius: 4,
          border: buttonBorder,
          padding: '4px 8px',
          color:widgetTextColor,

        }}onClick={onClose}>{t('editPanel.close')}</button>
      </div>

      <h2 style={{fontSize:bigTitleFontSize, color:widgetTextColor,}}>
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
            border: viewMode === "widgets" ? buttonBorderHighlight : buttonBorder,
            background: viewMode === "widgets" ? buttonColorHighlight : buttonColor,
            cursor: "pointer",
            fontSize,
            color:widgetTextColor,
          }}
        >
          {t('editPanel.modeWidgets')}
        </button>
        <button
          onClick={() => setViewMode("background")}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: viewMode === "background" ? buttonBorderHighlight : buttonBorder,
            background: viewMode === "background" ? buttonColorHighlight : buttonColor,
            cursor: "pointer",
            fontSize,
            color:widgetTextColor,
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
            const widgetLabel =
              widget.id === "notes" && notesWidgetCount > 0
                ? `${widget.label} (${notesWidgetCount})`
                : widget.label;

            const isActive =
              widget.id === "notes"
                ? activeWidgets.some((activeWidgetId) => activeWidgetId === "notes" || activeWidgetId.startsWith("notes:"))
                : activeWidgets.includes(widget.id);

            return (
              <div
                //alle widgets
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                style={{
                  padding: 12,
                  width: "90%",
                  marginBottom: 10,
                  borderRadius: 8,
                  cursor: "pointer",
                  background:backgroundColor,
                  border: isActive
                    ? buttonBorderHighlight
                    : "",
                    color:widgetTextColor,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize }}>{widgetLabel}</span>
                  <span
                    className="material-symbols-rounded"
                    aria-hidden="true"
                    style={{
                      fontSize: widgetIconSize,
                      lineHeight: 1,
                      opacity: 0.85,
                    }}
                  >
                    {widget.icon ?? "widgets"}
                  </span>
                </div>
                {isActive && ""}
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
              background: backgroundColor,
              color:widgetTextColor,
              //border: "1px solid #ddd"
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
        <div style={{
          //skriftstørrelse
           background: backgroundColor,
           borderRadius:borderRadiusThemeElements,
           padding: themeElementsPadding,
           }}>
          <h3 style={{
            fontSize:titleTextSize,
            margin:"auto",
            color:widgetTextColor,

          }}>{t('editPanel.fontSize')}</h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 8,
              }}
            >
              <input
                type="range"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                step={1}
                value={widgetFontSize}
                onChange={(event) => setFontSize(Number(event.target.value))}
                aria-label={t('editPanel.fontSize')}
                style={{
                  flex: 1,
                  accentColor: widgetTextColor,
                  cursor: "pointer",
                }}
              />
              <span
                style={{
                  minWidth: 32,
                  fontSize,
                  color: widgetTextColor,
                  textAlign: "right",
                }}
              >
                {widgetFontSize}
              </span>
            </div>
        </div>
          <div  style={{
            //velg Widget farge
            background: backgroundColor,
            borderRadius:borderRadiusThemeElements,
            padding: themeElementsPadding,
            }} >
            <label style={{ fontSize:titleTextSize, fontWeight: 600,color:widgetTextColor, }}>
              {t('editPanel.widgetColorMenu')}
            </label>
            <div
             style={{
              display: "flex",
              gap:5,


             }}
            
            >
             <button 
                      onClick={handleResetWidgetColor}
                      style={{
                        border: buttonBorder,
                        background: buttonColor,
                        color:widgetTextColor,
                        borderRadius: 10,
                        position: "relative",
                        width: "fit-content",
                        cursor: "pointer",
                        marginTop: 5,
                        }}>
                          {t('editPanel.reset')}
                      

                    </button>
            <label
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "fit-content",
                padding: "8px 12px",
                borderRadius: 10,
                border: buttonBorder,
                background: buttonColor,
                cursor: "pointer",
                marginTop:5,
                color:widgetTextColor,
              }}
            >
              <input
                type="color"
                value={toColorInputValue(widgetSurfaceColor)}
                onChange={(event) =>
                  setWidgetSurfaceColor(withAlpha(event.target.value, widgetSurfaceAlpha))
                }
                aria-label={t('editPanel.widgetColorButton')}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  cursor: "pointer",
                  color:widgetTextColor,
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
              <span style={{ fontSize, fontWeight: 500,color:widgetTextColor, }}>
                {t('editPanel.widgetColorButton')}
              </span>
            </label>
            </div>
            <label
              style={{
                display: "block",
                fontSize,
                fontWeight: 500,
                marginTop: 10,
                color:widgetTextColor,
              }}
            >
              {t('editPanel.widgetOpacity')}: {Math.round(widgetSurfaceAlpha * 100)}%
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={widgetSurfaceAlpha}
              onChange={(event) =>
                setWidgetSurfaceColor(withAlpha(widgetSurfaceColor, Number(event.target.value)))
              }
              aria-label={t('editPanel.widgetOpacity')}
              style={{
                width: "100%",
                marginTop: 5,
              }}
            />
          </div>
            <div style={{
                //border farger
                background: backgroundColor,
                borderRadius:borderRadiusThemeElements,
                padding: themeElementsPadding,
                color:widgetTextColor,

                }}>  
              <label style={{ fontSize:titleTextSize, fontWeight: 600, marginTop: 8 }}>
                {t('editPanel.widgetBorderColorTitle')}
              </label>
            <div
              style={{
                display: "flex",
                gap: 5,
              }}
            >
                <button 
                      onClick={handleResetBorderColor}
                      style={{
                        border: buttonBorder,
                        background: buttonColor,
                        color:widgetTextColor,
                        borderRadius: 10,
                        position: "relative",
                        width: "fit-content",
                        cursor: "pointer",
                        marginTop: 5,
                        }}>
                          {t('editPanel.reset')}
                      

                    </button>
                <label
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "fit-content",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: buttonBorder,
                    background: buttonColor,
                    cursor: "pointer",
                    marginTop: 5,
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
                      paddingBottom:10,
                      border: "1px solid rgba(0,0,0,0.3)",
                      background: widgetBorderColor,
                    }}
                  />
                  <span style={{ fontSize, fontWeight: 500 }}>
                    {t('editPanel.widgetBorderColor')}
                  </span>
                </label>
                </div>
               <label 
               style={{ 
                //border-bredde
                fontSize, 
                
                marginTop: 10 }}>
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
                style={{ 
                  width: "100%",
                  marginTop: 5,
                 }}
              />
            </div>
            <div style={{
              //tekstfarge
                background: backgroundColor,
                borderRadius:borderRadiusThemeElements,
                padding: themeElementsPadding,
                color:widgetTextColor,
                }}>
              <label style={{ fontSize:titleTextSize, fontWeight: 600, marginTop: 8 }}>
                {t('editPanel.widgetTextColor')}
              </label>
              <div
                style={{
                    display: "flex",
                    gap:5,
                  }}
                >
                <button 
                    onClick={handleResetTextColor}
                    style={{
                      border: buttonBorder,
                      background: buttonColor,
                      color:widgetTextColor,
                      borderRadius: 10,
                      position: "relative",
                      width: "fit-content",
                      cursor: "pointer",
                      marginTop: 5,
                      }}>
                        {t('editPanel.reset')}
                    

                  </button>  
                <label
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "fit-content",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: buttonBorder,
                    background: buttonColor,
                    cursor: "pointer",
                    marginTop: 5,
                  }}
                >
                  
                  <input
                    type="color"
                    value={toColorInputValue(selectedWidgetTextColor)}
                    onChange={(event) => setWidgetTextColor(event.target.value)}
                    aria-label={t('editPanel.widgetTextColor')}
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0,
                      cursor: "pointer",
                    }}
                  />
                  <span
                  //liten sirkel
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      border: "1px solid rgba(0,0,0,0.3)",
                      background: selectedWidgetTextColor,
                    }}
                  />
                  <span style={{ fontSize, fontWeight: 500 }}>
                    {t('editPanel.widgetColorButton')}
                  </span>
                </label>
                </div>
            </div> 
            
            <div style={{
              //tilbakestill stil
              background: backgroundColor,
              borderRadius:borderRadiusThemeElements,
              padding: themeElementsPadding,
              alignItems:"center",

              }}>     
              <button
                onClick={() => setResetConfirmOpen(true)}
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
                  fontSize,
                  color:widgetTextColor,
                }}
              >
                {t('editPanel.resetWidgetStyle')}
              </button>
            </div>
            <div style={{
              //custom bakgrunn
              background: backgroundColor,
              borderRadius:borderRadiusThemeElements,
              padding: themeElementsPadding,
              }}>    
              <input
                ref={customBackgroundInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                onChange={handleCustomBackgroundUpload}
                style={{ display: "none" }}
              />

              <button
                onClick={() => !uploadingBackground && customBackgroundInputRef.current?.click()}
                disabled={uploadingBackground}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: uploadBackgroundError ? "1px solid #d97706" : "1px solid #ddd",
                  background: uploadBackgroundError ? "#fef3c7" : "#f3f3f3",
                  cursor: uploadingBackground ? "not-allowed" : "pointer",
                  textAlign: "left",
                  fontWeight: 600,
                  opacity: uploadingBackground ? 0.6 : 1,
                  fontSize,
                  color:widgetTextColor,
                }}
              >
                {uploadingBackground ? t('editPanel.uploading') : t('editPanel.uploadCustomBackground')}
              </button>

              {uploadBackgroundError && (
                <div
                  style={{
                    fontSize,
                    color: "#92400e",
                    background: "#fef3c7",
                    border: "1px solid #d97706",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  {uploadBackgroundError}
                </div>
              )}

              <div
                style={{
                  fontSize,
                  color:widgetTextColor,
                  background: "#f7f7f7",
                  border: "1px dashed #d1d5db",
                  borderRadius: 8,
                  padding: "8px 10px",
                  marginTop:8
                }}
              >
                {t('editPanel.customBackgroundSyncNote')}

              </div>
          </div>
            
        <div 
        // egendefinerte presets
          style={{ 
            marginTop: 1,
            background: backgroundColor,
            padding: "8px 10px",
            borderRadius: 8,
            color:widgetTextColor,
            
            }}>
          <h3 style={{fontSize:titleTextSize, }}>{t('editPanel.customPresets')}</h3>

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
                fontSize,
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
                fontSize,
                color:widgetTextColor,
              }}
            >
              {t('editPanel.savePreset')}
            </button>
          </div>

          {dashboardPresets.length === 0 && (
            <div
              style={{
                fontSize,
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
                
                borderRadius: 10,
                background: backgroundColor,
                padding: 10,
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {preset.name}
              </div>
              <div style={{ fontSize, color: "#4b5563", marginBottom: 8 }}>
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
                    color:widgetTextColor,
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
                    color:widgetTextColor,
                  }}
                >
                  {t('editPanel.deletePreset')}
                </button>
              </div>
            </div>
          ))}
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
                      width: "95%",
                      padding: 0,
                      borderRadius: 10,
                      background: selected ? "#eaf4ff" : backgroundColor,
                      cursor: "pointer",
                      overflow: "hidden",
                      fontSize,
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
                  {option.id === "customMedia" ? (
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
                        fontSize,
                        fontWeight: 700,
                        color: "#eaf4ff",
                        flexShrink: 0,
                      }}
                    >
                      Media
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
                        fontSize,
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

      {resetConfirmOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
          }}
          onClick={() => setResetConfirmOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "28px 32px",
              minWidth: 320,
              maxWidth: 420,
              boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              {t('editPanel.resetWidgetStyle')}
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
              {t('editPanel.resetConfirmDescription')}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <button
                onClick={() => {
                  handleResetWidgetStyle();
                  clearUnlockedWidgetStyles();
                  setResetConfirmOpen(false);
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#0f172a",
                  textAlign: "left",
                }}
              >
                {t('editPanel.resetUnlockedWidgets')}
              </button>
              <button
                onClick={() => {
                  handleResetWidgetStyle();
                  clearAllWidgetStyles();
                  setResetConfirmOpen(false);
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #fca5a5",
                  background: "#fff1f1",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#b91c1c",
                  textAlign: "left",
                }}
              >
                {t('editPanel.resetAllWidgets')}
              </button>
              <button
                onClick={() => setResetConfirmOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#64748b",
                  textAlign: "center",
                }}
              >
                {t('editPanel.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
