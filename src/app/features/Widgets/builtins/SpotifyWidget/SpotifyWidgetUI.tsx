import { useState, type CSSProperties, type FocusEvent } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import spotifyLogo from "../../../../../assets/spotify-logo.png";
import { useLanguage } from "../../../../providers/languageProvider";
import type { SpotifyDevice, SpotifyPlayerState } from "./SpotifyWidgetLogic";

type ConnectViewProps = {
  onConnect: () => void;
};

export function SpotifyConnectView({ onConnect }: ConnectViewProps) {
  const { t } = useLanguage();

  return (
    <WidgetContainer>
      <WidgetPane title="">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "10%"
          }}
        >
          <img
            src={spotifyLogo}
            alt="Spotify"
            width="40%"
            style={{ objectFit: "contain", display: "block" }}
          />
          <button
            onClick={onConnect}
            style={{
              padding: 10,
              marginTop: "10%",
              background: "#1DB954",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              width: "100%",
              fontWeight: 600
            }}
          >
            {t("widgets.spotifyWidget.connect")}
          </button>
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}

type IdleViewProps = {
  fontSize: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
};

export function SpotifyIdleView({ fontSize, isDarkMode, onToggleDarkMode }: IdleViewProps) {
  const { t } = useLanguage();
  const [controlsAreVisible, setControlsAreVisible] = useState(false);

  function handleWidgetBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setControlsAreVisible(false);
    }
  }

  const controlInset = isDarkMode
    ? "calc(clamp(8px, 2.2cqw, 14px) + 20px)"
    : "clamp(8px, 2.2cqw, 14px)";

  const paneContentStyle: CSSProperties = isDarkMode
    ? {
      width: "calc(100% + 40px)",
      height: "calc(100% + 40px)",
      margin: -20,
      padding: 20,
      display: "flex",
      flexDirection: "column" as const,
      minHeight: 0,
      boxSizing: "border-box" as const,
      background: "#121212",
      color: "#FFFFFF"
    }
    : {
      display: "flex",
      flexDirection: "column" as const,
      minHeight: 0,
      width: "100%",
      height: "100%"
    };

  /*const controlButtonStyle = isDarkMode
    ? {
      width: 28,
      height: 28,
      background: "#1F1F1F",
      color: "#FFFFFF",
      border: "1px solid #2A2A2A",
      borderRadius: 999,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
    : {
      width: 28,
      height: 28,
      borderRadius: 999,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    };
    /*
  /*
  const actionIconStyle = {
    fontFamily: "\"Material Symbols Rounded\"",
    fontWeight: 400,
    fontStyle: "normal",
    fontSize: 18,
    lineHeight: 1,
    display: "block",
    color: isDarkMode ? "#C4C4C4" : "#4A4A4A",
    fontVariationSettings: "\"FILL\" 1, \"wght\" 400, \"GRAD\" 0, \"opsz\" 24"
  };*/

  return (
    <WidgetContainer>
      <WidgetPane title="">
        <div
          style={{
            ...paneContentStyle,
            position: "relative"
          }}
          onMouseEnter={() => setControlsAreVisible(true)}
          onMouseLeave={() => setControlsAreVisible(false)}
          onFocus={() => setControlsAreVisible(true)}
          onBlur={handleWidgetBlur}
        >
          <div
            style={{
              position: "absolute",
              top: controlInset,
              left: controlInset,
              zIndex: 1,
              display: "flex",
              opacity: controlsAreVisible ? 1 : 0,
              transform: controlsAreVisible ? "translateY(0)" : "translateY(-4px)",
              pointerEvents: controlsAreVisible ? "auto" : "none",
              transition: "opacity 160ms ease, transform 160ms ease"
            }}
          >
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label={isDarkMode ? t("widgets.spotifyWidget.disableDarkMode") : t("widgets.spotifyWidget.enableDarkMode")}
              title={isDarkMode ? t("widgets.spotifyWidget.darkModeOn") : t("widgets.spotifyWidget.darkModeOff")}
              aria-pressed={isDarkMode}
              style={{
                width: "clamp(24px, 6cqw, 32px)",
                height: "clamp(24px, 6cqw, 32px)",
                borderRadius: "999px",
                border: "1px solid rgba(255, 255, 255, 0.35)",
                display: "grid",
                placeItems: "center",
                background: isDarkMode ? "rgba(15, 23, 42, 0.78)" : "rgba(15, 23, 42, 0.58)",
                color: "#f8fafc",
                cursor: "pointer",
                backdropFilter: "blur(10px)",
                boxShadow: "0 8px 22px rgba(15, 23, 42, 0.3)"
              }}
            >
              <span
                className="material-symbols-rounded"
                aria-hidden="true"
                style={{ fontSize: "clamp(14px, 3.8cqw, 18px)", lineHeight: 1 }}
              >
                dark_mode
              </span>
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              gap: 10,
              width: "100%",
              minHeight: 0,
              textAlign: "center"
            }}
          >
            <img
              src={spotifyLogo}
              alt="Spotify"
              width="50%"
              style={{ objectFit: "contain", display: "block" }}
            />
            <div style={{ fontSize, opacity: 0.8 }}>
              {t("widgets.spotifyWidget.startPlaying")}
            </div>
          </div>
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}

type PlayingViewProps = {
  player: SpotifyPlayerState;
  devices: SpotifyDevice[];
  volume: number;
  fontSize: number;
  isDarkMode: boolean;
  isMinimized: boolean;
  onToggleDarkMode: () => void;
  onToggleMinimized: () => void;
  onExpandFromCover: () => void;
  onPrevTrack: () => void;
  onPlayPause: () => void;
  onNextTrack: () => void;
  onSeek: (positionMs: number) => void;
  onChangeVolume: (value: number) => void;
  onChangeDevice: (deviceId: string) => void;
};

export function SpotifyPlayingView({
  player,
  devices,
  volume,
  fontSize,
  isDarkMode,
  isMinimized,
  onToggleDarkMode,
  onToggleMinimized,
  onExpandFromCover,
  onPrevTrack,
  onPlayPause,
  onNextTrack,
  onSeek,
  onChangeVolume,
  onChangeDevice
}: PlayingViewProps) {
  const { t } = useLanguage();
  const [controlsAreVisible, setControlsAreVisible] = useState(false);

  const track = player.item;
  const progress = player.progress_ms;
  const duration = track.duration_ms;

  function handleWidgetBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setControlsAreVisible(false);
    }
  }

  const panelStyle = isDarkMode
    ? { color: "#FFFFFF" }
    : { color: "inherit" };

  const paneContentStyle = isDarkMode
    ? {
      width: "calc(100% + 40px)",
      height: "calc(100% + 40px)",
      margin: -20,
      padding: 20,
      display: "flex",
      flexDirection: "column" as const,
      minHeight: 0,
      boxSizing: "border-box" as const,
      background: "#121212"
    }
    : {
      display: "flex",
      flexDirection: "column" as const,
      minHeight: 0,
      width: "100%",
      height: "100%"
    };

  const controlInset = isDarkMode
    ? "calc(clamp(8px, 2.2cqw, 14px) + 20px)"
    : "clamp(8px, 2.2cqw, 14px)";

  const floatingControlsStyle: CSSProperties = {
    position: "absolute" as const,
    top: controlInset,
    left: controlInset,
    zIndex: 2,
    display: "flex",
    gap: "clamp(6px, 1.5cqw, 10px)",
    opacity: controlsAreVisible ? 1 : 0,
    transform: controlsAreVisible ? "translateY(0)" : "translateY(-4px)",
    pointerEvents: controlsAreVisible ? "auto" : "none",
    transition: "opacity 160ms ease, transform 160ms ease"
  };

  const controlButtonStyle: CSSProperties = {
    width: "clamp(24px, 6cqw, 32px)",
    height: "clamp(24px, 6cqw, 32px)",
    borderRadius: "999px",
    border: "1px solid rgba(255, 255, 255, 0.35)",
    display: "grid",
    placeItems: "center",
    background: isDarkMode ? "rgba(15, 23, 42, 0.78)" : "rgba(15, 23, 42, 0.58)",
    color: "#f8fafc",
    cursor: "pointer",
    backdropFilter: "blur(10px)",
    boxShadow: "0 8px 22px rgba(15, 23, 42, 0.3)"
  };

  const playbackBarStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    marginTop: 1,
    padding: "10px 14px",
    borderRadius: 14,
    //background: isDarkMode ? "#242424" : "#e8e8e800"
  };

  const sidePlaybackButtonStyle = {
    border: "none",
    background: "transparent",
    color: isDarkMode ? "#B9B9B9" : "#4A4A4A",
    fontSize: 22,
    lineHeight: 1,
    padding: 0,
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer"
  };

  const primaryPlaybackButtonStyle = {
    width: 46,
    height: 46,
    borderRadius: "50%",
    border: isDarkMode ? "2px solid #9B9B9B" : "2px solid #8A8A8A",
    background: isDarkMode ? "#2E2E2E" : "#F6F6F6",
    color: isDarkMode ? "#D8D8D8" : "#3D3D3D",
    fontSize: 24,
    lineHeight: 1,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer"
  };

  const playbackIconStyle = {
    fontFamily: "\"Material Symbols Rounded\"",
    fontWeight: 400,
    fontStyle: "normal",
    fontSize: 24,
    lineHeight: 1,
    display: "block",
    fontVariationSettings: "\"FILL\" 1, \"wght\" 400, \"GRAD\" 0, \"opsz\" 24"
  };

  const primaryPlaybackIconStyle = {
    ...playbackIconStyle,
    fontSize: 28,
    fontVariationSettings: "\"FILL\" 1, \"wght\" 500, \"GRAD\" 0, \"opsz\" 24"
  };

  const utilityIconStyle = {
    ...playbackIconStyle,
    fontSize: 20,
    color: isDarkMode ? "#C4C4C4" : "#4A4A4A",
    flexShrink: 0
  };

  const floatingControlIconStyle: CSSProperties = {
    fontSize: "clamp(14px, 3.8cqw, 18px)",
    lineHeight: 1
  };

  const utilityRowStyle = {
    marginTop: 5,
    display: "flex",
    alignItems: "center",
    gap: 10
  };

  const selectStyle = isDarkMode
    ? {
      flex: 1,
      background: "#1F1F1F",
      color: "#FFFFFF",
      border: "1px solid #2A2A2A",
      borderRadius: 6,
      padding: "6px 8px"
    }
    : {
      flex: 1,
      borderRadius: 6,
      padding: "6px 8px"
    };

  return (
    <WidgetContainer>
      <WidgetPane title="">
        <div
          style={{
            ...paneContentStyle,
            position: "relative"
          }}
          onMouseEnter={() => setControlsAreVisible(true)}
          onMouseLeave={() => setControlsAreVisible(false)}
          onFocus={() => setControlsAreVisible(true)}
          onBlur={handleWidgetBlur}
        >
          <div style={floatingControlsStyle}>
            <button
              type="button"
              onClick={onToggleDarkMode}
              style={controlButtonStyle}
              aria-label={isDarkMode ? t("widgets.spotifyWidget.disableDarkMode") : t("widgets.spotifyWidget.enableDarkMode")}
              title={isDarkMode ? t("widgets.spotifyWidget.darkModeOn") : t("widgets.spotifyWidget.darkModeOff")}
              aria-pressed={isDarkMode}
            >
              <span className="material-symbols-rounded" aria-hidden="true" style={floatingControlIconStyle}>
                dark_mode
              </span>
            </button>
            <button
              type="button"
              onClick={isMinimized ? onExpandFromCover : onToggleMinimized}
              style={controlButtonStyle}
              aria-label={isMinimized ? t("widgets.spotifyWidget.expandPlayer") : t("widgets.spotifyWidget.minimizePlayer")}
              title={isMinimized ? t("widgets.spotifyWidget.expandPlayer") : t("widgets.spotifyWidget.minimizePlayer")}
            >
              <span className="material-symbols-rounded" aria-hidden="true" style={floatingControlIconStyle}>
                {isMinimized ? "open_in_full" : "close_fullscreen"}
              </span>
            </button>
          </div>
          {isMinimized ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <img
                src={track.album.images[0]?.url}
                width="100%"
                style={{ borderRadius: 8, cursor: "pointer" }}
                onClick={onExpandFromCover}
                aria-label="Expand player"
              />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                gap: 4,
                width: "100%",
                minHeight: 0,
                ...panelStyle
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div
                  style={{
                    fontWeight: 500,
                    letterSpacing: 0.4
                  }}
                >
                  {t("widgets.spotifyWidget.nowPlaying")}
                </div>
              </div>

              <img
                src={track.album.images[0]?.url}
                width="100%"
                style={{ borderRadius: 8 }}
              />

              <div style={{ marginTop: 5, fontWeight: 600 }}>
                {track.name}
              </div>

              <div style={{ fontSize, opacity: 0.7 }}>
                {track.artists.map((artist) => artist.name).join(", ")}
              </div>

              <input
                type="range"
                min={0}
                max={duration}
                value={progress}
                onChange={(event) => onSeek(Number(event.target.value))}
                style={{
                  width: "100%",
                  marginTop: 10,
                  accentColor: "#1DB954"
                }}
              />

              <div style={playbackBarStyle}>
                <button
                  onClick={onPrevTrack}
                  style={sidePlaybackButtonStyle}
                  aria-label="Previous track"
                  title="Previous track"
                >
                  <span className="material-symbols-rounded" aria-hidden="true" style={playbackIconStyle}>
                    skip_previous
                  </span>
                </button>
                <button
                  onClick={onPlayPause}
                  style={primaryPlaybackButtonStyle}
                  aria-label={player.is_playing ? "Pause" : "Play"}
                  title={player.is_playing ? "Pause" : "Play"}
                >
                  <span className="material-symbols-rounded" aria-hidden="true" style={primaryPlaybackIconStyle}>
                    {player.is_playing ? "pause" : "play_arrow"}
                  </span>
                </button>
                <button
                  onClick={onNextTrack}
                  style={sidePlaybackButtonStyle}
                  aria-label="Next track"
                  title="Next track"
                >
                  <span className="material-symbols-rounded" aria-hidden="true" style={playbackIconStyle}>
                    skip_next
                  </span>
                </button>
              </div>

              <div style={utilityRowStyle}>
                <span className="material-symbols-rounded" aria-hidden="true" style={utilityIconStyle}>
                  volume_up
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(event) => onChangeVolume(Number(event.target.value))}
                  style={{ flex: 1, accentColor: "#1DB954" }}
                />
              </div>

              <div style={utilityRowStyle}>
                <span className="material-symbols-rounded" aria-hidden="true" style={utilityIconStyle}>
                  speaker
                </span>
                <select
                  onChange={(event) => onChangeDevice(event.target.value)}
                  style={selectStyle}
                >
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}
