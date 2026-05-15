import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useWidgetsState } from "./useWidgetsState";

type WidgetsContextValue = ReturnType<typeof useWidgetsState>;

const WidgetsContext = createContext<WidgetsContextValue | null>(null);

type Props = {
  children: ReactNode;
};

export function WidgetsProvider({ children }: Props) {
  // Deler samme dashboard-tilstand i hele widget-treet.
  const value = useWidgetsState();

  return (
    <WidgetsContext.Provider value={value}>
      {children}
    </WidgetsContext.Provider>
  );
}

export function useWidgets() {
  const context = useContext(WidgetsContext);

  if (!context) {
    throw new Error("useWidgets must be used inside WidgetsProvider");
  }

  return context;
}