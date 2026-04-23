import { useWidgets } from "../../dashboard/hooks/WidgetsContext";
import { useFontSize } from "../../../providers/themeProviders";
import { useWidgetInstance } from "../components/WidgetInstanceContext";

export function useResolvedWidgetFontSize() {
  const { fontSize } = useFontSize();
  const { widgetLocks, widgetStyles } = useWidgets();
  const widgetInstance = useWidgetInstance();

  if (!widgetInstance) return fontSize;

  const widgetId = widgetInstance.widgetId;
  const isLocked = Boolean(widgetLocks[widgetId]);
  const widgetStyle = widgetStyles[widgetId];

  if (isLocked && widgetStyle?.lockSnapshot && widgetStyle.widgetFontSize !== undefined) {
    return widgetStyle.widgetFontSize;
  }

  return fontSize;
}
