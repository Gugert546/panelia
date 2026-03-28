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
      background: "#121212",
      borderRadius: 20,
      color: "#FFFFFF"
    }
    : {
      display: "flex",
      flexDirection: "column" as const,
      minHeight: 0,
      width: "100%",
      height: "100%"
    };

  const darkModeSwitchStyle = {
    width: 38,
    height: 20,
    borderRadius: 999,
    border: "none",
    padding: 2,
    cursor: "pointer",
    background: isDarkMode ? "#1DB954" : "#A0A0A0",
    display: "flex",
    justifyContent: isDarkMode ? "flex-end" : "flex-start",
    alignItems: "center"
  };

  return (
    <WidgetContainer>
      <WidgetPane title="">
        <div style={paneContentStyle}>
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

          <div style={{ display: "flex", justifyContent: "flex-start", paddingTop: 8, flexShrink: 0 }}>
            <button
              onClick={onToggleDarkMode}
              style={darkModeSwitchStyle}
              aria-label={isDarkMode ? t("widgets.spotifyWidget.disableDarkMode") : t("widgets.spotifyWidget.enableDarkMode")}
              title={isDarkMode ? t("widgets.spotifyWidget.darkModeOn") : t("widgets.spotifyWidget.darkModeOff")}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  display: "block"
                }}
              />
            </button>
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

  const track = player.item;
  const progress = player.progress_ms;
  const duration = track.duration_ms;

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
      background: "#121212",
      borderRadius: 20
    }
    : {
      display: "flex",
      flexDirection: "column" as const,
      minHeight: 0,
      width: "100%",
      height: "100%"
    };

  const controlButtonStyle = isDarkMode
    ? {
      background: "#1F1F1F",
      color: "#FFFFFF",
      border: "1px solid #2A2A2A",
      borderRadius: 8,
      padding: "4px 8px",
      cursor: "pointer"
    }
    : {
      borderRadius: 8,
      padding: "4px 8px",
      cursor: "pointer"
    };

  const darkModeSwitchStyle = {
    width: 38,
    height: 20,
    borderRadius: 999,
    border: "none",
    padding: 2,
    cursor: "pointer",
    background: isDarkMode ? "#1DB954" : "#A0A0A0",
    display: "flex",
    justifyContent: isDarkMode ? "flex-end" : "flex-start",
    alignItems: "center"
  };

  return (
    <WidgetContainer>
      <WidgetPane title="">
        <div style={paneContentStyle}>
          {isMinimized ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <img
                src={track.album.images[0]?.url}
                width="100%"
                style={{ borderRadius: 8, cursor: "pointer" }}
                onClick={onExpandFromCover}
                aria-label="Expand player"
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={onExpandFromCover}
                  style={controlButtonStyle}
                  aria-label="Expand player"
                >
                  🗖
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                gap: 12,
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
                <button
                  onClick={onToggleMinimized}
                  style={controlButtonStyle}
                  aria-label={isMinimized ? t("widgets.spotifyWidget.expandPlayer") : t("widgets.spotifyWidget.minimizePlayer")}
                >
                  {isMinimized ? "🗖" : "🗕"}
                </button>
              </div>

              <img
                src={track.album.images[0]?.url}
                width="100%"
                style={{ borderRadius: 8 }}
              />

              <div style={{ marginTop: 10, fontWeight: 600 }}>
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

              <div style={{ marginTop: 10 }}>
                <button onClick={onPrevTrack}>⏮</button>
                <button onClick={onPlayPause}>
                  {player.is_playing ? "⏸" : "▶"}
                </button>
                <button onClick={onNextTrack}>⏭</button>
              </div>

              <div style={{ marginTop: 10 }}>
                🔊
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(event) => onChangeVolume(Number(event.target.value))}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                🎧
                <select
                  onChange={(event) => onChangeDevice(event.target.value)}
                  style={isDarkMode
                    ? {
                      background: "#1F1F1F",
                      color: "#FFFFFF",
                      border: "1px solid #2A2A2A",
                      borderRadius: 6
                    }
                    : undefined}
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

          <div style={{ display: "flex", justifyContent: "flex-start", paddingTop: 8, flexShrink: 0 }}>
            <button
              onClick={onToggleDarkMode}
              style={darkModeSwitchStyle}
              aria-label={isDarkMode ? t("widgets.spotifyWidget.disableDarkMode") : t("widgets.spotifyWidget.enableDarkMode")}
              title={isDarkMode ? t("widgets.spotifyWidget.darkModeOn") : t("widgets.spotifyWidget.darkModeOff")}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  display: "block"
                }}
              />
            </button>
          </div>
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}
