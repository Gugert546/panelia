import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../features/auth/useAuth";
import { sendMessageToAI } from "./aiLogic";
import {
  AiChatContext,
  type AiChatContextValue,
  type AiChatMessage,
} from "./aiChatStore";

type Props = {
  children: ReactNode;
};

function createMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AiChatProvider({ children }: Props) {
  const { user } = useAuth();
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
      const aiResponse = await sendMessageToAI(trimmedText);
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
  }, []);

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
