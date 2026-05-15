import { createContext, useContext } from "react";

type WidgetInstanceContextValue = {
  widgetId: string;
};

const WidgetInstanceContext = createContext<WidgetInstanceContextValue | null>(null);

type WidgetInstanceProviderProps = {
  widgetId: string;
  children: React.ReactNode;
};

export function WidgetInstanceProvider({
  widgetId,
  children,
}: WidgetInstanceProviderProps) {
  // Gjør widget-ID tilgjengelig for underkomponenter.
  return (
    <WidgetInstanceContext.Provider value={{ widgetId }}>
      {children}
    </WidgetInstanceContext.Provider>
  );
}

export function useWidgetInstance() {
  return useContext(WidgetInstanceContext);
}
