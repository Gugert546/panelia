import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../features/auth/useAuth";
import { useWidgets } from "../features/dashboard/hooks/WidgetsContext";
import { sendMessageToAI, type AiChatHistoryItem } from "./aiLogic";
import {
  AiChatContext,
  type AiChatContextValue,
  type AiChatMessage,
} from "./aiChatStore";

type Props = {
  children: ReactNode;
};

const MAX_HISTORY_MESSAGES = 12;

type DashboardWidgetToolResult = {
  widgetId?: string;
  active?: boolean;
};

function createMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AiChatProvider({ children }: Props) {
  const { user } = useAuth();
  const { reloadLayout, syncDashboardWidgetState } = useWidgets();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setMessages([]);
    setIsSending(false);
  }, [user?.uid]);

  const sendMessage = useCallback(async (text: string, errorText: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    setMessages((prev) => [
      ...prev,
      { id: createMessageId(), sender: "user", text: trimmedText },
    ]);
    setIsSending(true);

    try {
      const history: AiChatHistoryItem[] = messages
        .slice(-MAX_HISTORY_MESSAGES)
        .map((message) => ({
          sender: message.sender,
          text: message.text,
        }));
      const aiResponse = await sendMessageToAI(trimmedText, history);
      for (const tool of aiResponse.executedTools) {
        if (tool.name !== "addDashboardWidget" && tool.name !== "removeDashboardWidget") {
          continue;
        }

        const result = tool.result as DashboardWidgetToolResult;

        if (typeof result.widgetId === "string" && typeof result.active === "boolean") {
          syncDashboardWidgetState(result.widgetId, result.active);
        }
      }

      const shouldReloadLayout = aiResponse.executedTools.some((tool) =>
        [
          "addCustomButton",
          "removeCustomButton",
          "addDashboardWidget",
          "arrangeDashboardWidgets",
          "removeDashboardWidget",
          "setClockMode",
          "toggleClockMode",
          "applyDashboardTheme",
          "saveDashboardTheme",
          "deleteDashboardTheme",
          "updateDashboardStyle",
          "updateDashboardWidgetStyle",
        ].includes(tool.name)
      );

      if (shouldReloadLayout) {
        await reloadLayout();
      }

      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          sender: "ai",
          text: aiResponse.output_text,
        },
      ]);
    } catch (error) {
      console.error("Error sending message to AI:", error);
      setMessages((prev) => [
        ...prev,
        { id: createMessageId(), sender: "ai", text: errorText },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [messages, reloadLayout, syncDashboardWidgetState]);

  const value = useMemo<AiChatContextValue>(
    () => ({
      messages,
      isSending,
      sendMessage,
    }),
    [isSending, messages, sendMessage]
  );

  return (
    <AiChatContext.Provider value={value}>
      {children}
    </AiChatContext.Provider>
  );
}
