import { useFontSize } from "../../../../providers/themeProviders";
import { useSpotifyWidgetLogic } from "./SpotifyWidgetLogic";
import {
  SpotifyConnectView,
  SpotifyIdleView,
  SpotifyPlayingView
} from "./SpotifyWidgetUI";

export default function SpotifyWidget() {
  const { fontSize } = useFontSize();
  const {
    token,
    player,
    devices,
    volume,
    isDarkMode,
    isMinimized,
    setIsDarkMode,
    setIsMinimized,
    connectSpotify,
    playPause,
    nextTrack,
    prevTrack,
    changeVolume,
    seek,
    changeDevice
  } = useSpotifyWidgetLogic();

  if (!token) {
    return <SpotifyConnectView onConnect={connectSpotify} />;
  }

  if (!player) {
    return (
      <SpotifyIdleView
        fontSize={fontSize}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((previous) => !previous)}
      />
    );
  }

  return (
    <SpotifyPlayingView
      player={player}
      devices={devices}
      volume={volume}
      fontSize={fontSize}
      isDarkMode={isDarkMode}
      isMinimized={isMinimized}
      onToggleDarkMode={() => setIsDarkMode((previous) => !previous)}
      onToggleMinimized={() => setIsMinimized((previous) => !previous)}
      onExpandFromCover={() => setIsMinimized(false)}
      onPrevTrack={prevTrack}
      onPlayPause={playPause}
      onNextTrack={nextTrack}
      onSeek={seek}
      onChangeVolume={changeVolume}
      onChangeDevice={changeDevice}
    />
  );

}
