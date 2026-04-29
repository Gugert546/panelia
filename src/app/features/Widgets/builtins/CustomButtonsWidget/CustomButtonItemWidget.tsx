import { useEffect, useMemo, useRef, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { getFaviconCandidates } from "../../../../../lib/utils/favicon";
import { useResolvedWidgetFontSize } from "../../hooks/useResolvedWidgetFontSize";
//import { useWidgets } from "../../../dashboard/hooks/WidgetsContext";

type Props = {
  label: string;
  url: string;
  favicon: string;
};

export default function CustomButtonItemWidget({
  label,
  url,
  favicon,
}: Props) {
  //const { widgetSurfaceColor, widgetBorderColor, widgetBorderWidth } = useWidgets();
  const fontSize = useResolvedWidgetFontSize();
  const iconLetterFontSize = Math.max(fontSize - 1, 13);
  const iconLetterMaxFontSize = Math.max(fontSize + 8, 22);
  const labelMaxFontSize = Math.max(fontSize + 12, 26);
  const faviconCandidates = useMemo(
    () => getFaviconCandidates(url, favicon),
    [url, favicon]
  );
  const [faviconIndex, setFaviconIndex] = useState(0);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  useEffect(() => {
    setFaviconIndex(0);
  }, [faviconCandidates.length, url, favicon]);

  const currentFavicon = faviconCandidates[faviconIndex] ?? "";

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    didDragRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dragStart = dragStartRef.current;
    if (!dragStart) {
      return;
    }

    if (
      Math.abs(e.clientX - dragStart.x) > 5 ||
      Math.abs(e.clientY - dragStart.y) > 5
    ) {
      didDragRef.current = true;
    }
  };

  const handleMouseUp = () => {
    dragStartRef.current = null;
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (didDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
      didDragRef.current = false;
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <WidgetContainer>
      <WidgetPane title="">
        <div
          style={{
            containerType: "inline-size",
            width: "100%",
            height: "100%",
          }}
        >
          <button
            type="button"
            className="widget-draggable-button"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "clamp(10px, 5cqw, 18px)",
              textDecoration: "none",
              color: "inherit",
              width: "100%",
              height: "100%",
              padding: "clamp(12px, 7cqw, 22px)",
              borderRadius: "clamp(10px, 5cqw, 18px)",
              background: "none",
              border: "none",
              transition: "opacity 0.2s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {currentFavicon ? (
              <img
                src={currentFavicon}
                alt=""
                onError={() => {
                  setFaviconIndex((prev) => {
                    if (prev >= faviconCandidates.length - 1) {
                      return prev;
                    }
                    return prev + 1;
                  });
                }}
                style={{
                  width: "clamp(24px, 14cqw, 44px)",
                  height: "clamp(24px, 14cqw, 44px)",
                  objectFit: "contain",
                  flexShrink: 0,
                }}
                draggable={false}
              />
            ) : (
              <span
                aria-hidden="true"
                style={{
                  width: "clamp(24px, 14cqw, 44px)",
                  height: "clamp(24px, 14cqw, 44px)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.08)",
                  fontSize: `clamp(${iconLetterFontSize}px, 8cqw, ${iconLetterMaxFontSize}px)`,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {label.slice(0, 1).toUpperCase()}
              </span>
            )}

            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontWeight: 500,
                fontSize: `clamp(${fontSize}px, 9cqw, ${labelMaxFontSize}px)`,
              }}
            >
              {label}
            </span>
          </button>
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}
