import { useWidgets } from "../../dashboard/hooks/WidgetsContext";
import { useFontSize } from "../../../providers/themeProviders";
import { useWidgetInstance } from "../components/WidgetInstanceContext";

export function useResolvedWidgetFontSize() {
  const { fontSize } = useFontSize();
  const { widgetStyles } = useWidgets();
  const widgetInstance = useWidgetInstance();

  if (!widgetInstance) return fontSize;

  const widgetId = widgetInstance.widgetId;
  const widgetStyle = widgetStyles[widgetId];

  // Bruker lokal skriftstørrelse hvis den finnes.
  if (widgetStyle?.widgetFontSize !== undefined) {
    return widgetStyle.widgetFontSize;
  }

  return fontSize;
}
