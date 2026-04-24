import { createContext } from "react";

export type AiChatMessage = {
  id: string;
  sender: "user" | "ai";
  text: string;
};

export type AiChatContextValue = {
  messages: AiChatMessage[];
  isSending: boolean;
  sendMessage: (text: string, errorText: string) => Promise<void>;
};

export const AiChatContext = createContext<AiChatContextValue | null>(null);
