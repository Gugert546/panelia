import type {
  CustomBackgroundMediaType,
  DashboardBackgroundId,
} from "./hooks/useWidgetsState";
import { getBackgroundByTime } from "./hooks/getBackgroundByTime";
import sol1 from "../../../assets/panelia-bg/Sol 1.png";
import sol2 from "../../../assets/panelia-bg/Sol bagrunn 2.png";
import sol3 from "../../../assets/panelia-bg/Sol bagrunn 3.png";
import natt1 from "../../../assets/panelia-bg/Natt bagrunn 1.png";
import natt2 from "../../../assets/panelia-bg/Natt bagrunn 2.png";
import natt3 from "../../../assets/panelia-bg/Natt bagrunn 3.png";
import foregroundSol2 from "../../../assets/panelia-bg/IMG_1111.png";
import foregroundSol3 from "../../../assets/panelia-bg/IMG_1117.png";
import foregroundNatt1 from "../../../assets/panelia-bg/IMG_1114.png";
import foregroundNatt2 from "../../../assets/panelia-bg/IMG_1112.png";
import foregroundNatt3 from "../../../assets/panelia-bg/IMG_1113.png";
import waterSol1 from "../../../assets/panelia-bg/Vann S1.png";
import waterSol3 from "../../../assets/panelia-bg/Vann S3.png";
import waterNatt2 from "../../../assets/panelia-bg/Vann N2.png";
import waterNatt3 from "../../../assets/panelia-bg/Vann N3.png";

type DashboardBackgroundProps = {
  backgroundId: DashboardBackgroundId;
  customBackgroundUrl: string;
  customBackgroundType: CustomBackgroundMediaType;
};

function toCssUrl(url: string) {
  return `url("${url.replace(/"/g, '\\"')}")`;
}

function resolveEffectiveBackgroundId(backgroundId: DashboardBackgroundId) {
  if (backgroundId === "defaultbg") {
    return getBackgroundByTime() as DashboardBackgroundId;
  }

  return backgroundId;
}

function resolveDashboardBackground(backgroundId: DashboardBackgroundId) {
  const effectiveBackgroundId = resolveEffectiveBackgroundId(backgroundId);

  if (effectiveBackgroundId === "sol1") return sol1;
  if (effectiveBackgroundId === "sol2") return sol2;
  if (effectiveBackgroundId === "sol3") return sol3;
  if (effectiveBackgroundId === "natt1") return natt1;
  if (effectiveBackgroundId === "natt2") return natt2;
  if (effectiveBackgroundId === "natt3") return natt3;
  if (effectiveBackgroundId === "customMedia") return sol1;

  return sol1;
}

function resolveDashboardForeground(backgroundId: DashboardBackgroundId) {
  const effectiveBackgroundId = resolveEffectiveBackgroundId(backgroundId);

  if (effectiveBackgroundId === "sol2") return foregroundSol2;
  if (effectiveBackgroundId === "sol3") return foregroundSol3;
  if (effectiveBackgroundId === "natt1") return foregroundNatt1;
  if (effectiveBackgroundId === "natt2") return foregroundNatt2;
  if (effectiveBackgroundId === "natt3") return foregroundNatt3;

  return null;
}

function resolveDashboardWater(backgroundId: DashboardBackgroundId) {
  const effectiveBackgroundId = resolveEffectiveBackgroundId(backgroundId);

  if (effectiveBackgroundId === "sol2") return waterSol1;
  if (effectiveBackgroundId === "sol3") return waterSol3;
  if (effectiveBackgroundId === "natt1") return waterNatt3;
  if (effectiveBackgroundId === "natt2") return waterNatt3;
  if (effectiveBackgroundId === "natt3") return waterNatt2;

  return null;
}

function getSkyBodyType(backgroundId: DashboardBackgroundId) {
  const effectiveBackgroundId = resolveEffectiveBackgroundId(backgroundId);

  if (effectiveBackgroundId.startsWith("natt")) return "moon";
  if (effectiveBackgroundId.startsWith("sol")) return "sun";

  return null;
}

function getVideoBackgroundSource(
  backgroundId: DashboardBackgroundId,
  customBackgroundUrl: string,
  customBackgroundType: CustomBackgroundMediaType
) {
  if (backgroundId === "customMedia" && customBackgroundType === "video") {
    return customBackgroundUrl || null;
  }

  return null;
}

function getImageBackgroundSource(
  backgroundId: DashboardBackgroundId,
  customBackgroundUrl: string,
  customBackgroundType: CustomBackgroundMediaType
) {
  if (backgroundId === "customMedia" && customBackgroundType === "image") {
    return customBackgroundUrl || resolveDashboardBackground("defaultbg");
  }

  return resolveDashboardBackground(backgroundId);
}

export default function DashboardBackground({
  backgroundId,
  customBackgroundUrl,
  customBackgroundType,
}: DashboardBackgroundProps) {
  const backgroundImageUrl = getImageBackgroundSource(
    backgroundId,
    customBackgroundUrl,
    customBackgroundType
  );
  const foregroundImageUrl =
    backgroundId === "customMedia" ? null : resolveDashboardForeground(backgroundId);
  const waterImageUrl =
    backgroundId === "customMedia" ? null : resolveDashboardWater(backgroundId);
  const skyBodyType =
    backgroundId === "customMedia" ? null : getSkyBodyType(backgroundId);
  const videoBackgroundSource = getVideoBackgroundSource(
    backgroundId,
    customBackgroundUrl,
    customBackgroundType
  );

  return (
    <>
      <div
        className="dashboard-background-layer"
        aria-hidden="true"
        style={{
          backgroundImage: toCssUrl(backgroundImageUrl),
        }}
      />

      {videoBackgroundSource && (
        <video
          className="dashboard-bg-video"
          src={videoBackgroundSource}
          autoPlay
          loop
          muted
          playsInline
        />
      )}

      {skyBodyType && (
        <div className="dashboard-sky-orbit" aria-hidden="true">
          <div className={`dashboard-sky-body dashboard-sky-body-${skyBodyType}`} />
        </div>
      )}

      {waterImageUrl && (
        <div className="dashboard-water-layer" aria-hidden="true">
          <img className="dashboard-water-texture" src={waterImageUrl} alt="" />
        </div>
      )}

      {foregroundImageUrl && (
        <img
          className="dashboard-foreground-layer"
          src={foregroundImageUrl}
          alt=""
          aria-hidden="true"
        />
      )}
    </>
  );
}
