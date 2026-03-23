import { useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
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
          {favicon ? (
            <img
              src={favicon}
              alt=""
              style={{
                width: 20,
                height: 20,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
          ) : null}

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