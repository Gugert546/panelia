import { useEffect, useMemo, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { getFaviconCandidates } from "../../../../../lib/utils/favicon";
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
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const faviconCandidates = useMemo(
    () => getFaviconCandidates(url, favicon),
    [url, favicon]
  );
  const [faviconIndex, setFaviconIndex] = useState(0);

  useEffect(() => {
    setFaviconIndex(0);
  }, [faviconCandidates.length, url, favicon]);

  const currentFavicon = faviconCandidates[faviconIndex] ?? "";

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(false);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (Math.abs(e.clientX - startPos.x) > 5 || Math.abs(e.clientY - startPos.y) > 5) {
      setIsDragging(true);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <WidgetContainer>
      <WidgetPane title="">
        <button
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "#111",
            width: "100%",
            height: "100%",
            padding: 12,
            borderRadius: 8,
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
                width: 20,
                height: 20,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
          ) : (
            <span
              aria-hidden="true"
              style={{
                width: 20,
                height: 20,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                background: "rgba(0,0,0,0.08)",
                fontSize: 12,
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
            }}
          >
            {label}
          </span>
        </button>
      </WidgetPane>
    </WidgetContainer>
  );
}