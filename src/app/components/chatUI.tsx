import { useEffect, useRef, useState, type CSSProperties } from "react";
import WidgetPane from "../features/Widgets/components/WidgetPane";
import { useLanguage } from "../providers/languageProvider";
import { useAiChat } from "./useAiChat";

type ChatVariant = "panel" | "widget";

type ChatProps = {
  variant?: ChatVariant;
};

const MAX_INPUT_CHARS = 3000;

export default function Chat({ variant = "widget" }: ChatProps) {
  const { messages, isSending, sendMessage } = useAiChat();
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isPanel = variant === "panel";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isSending]);

  const handleSend = async () => {
    const messageText = input.trim();
    if (!messageText || isSending) return;

    setInput("");
    await sendMessage(messageText, t("chat.error"));
  };

  const chatContent = (
    <div
      style={{
        ...styles.root,
        padding: isPanel ? 0 : 2,
      }}
    >
      <div
        style={{
          ...styles.chatWindow,
          minHeight: isPanel ? 0 : 180,
        }}
      >
        {messages.map((message) => {
          const isUserMessage = message.sender === "user";

          return (
            <div
              key={message.id}
              style={{
                ...styles.message,
                alignSelf: isUserMessage ? "flex-end" : "flex-start",
                backgroundColor: isUserMessage
                  ? "rgba(255, 255, 255, 0.93)"
                  : "rgba(229, 229, 234, 0.68)",
              }}
            >
              {message.text}
            </div>
          );
        })}
        {isSending && (
          <div
            style={{
              ...styles.message,
              ...styles.pendingMessage,
            }}
          >
            {t("chat.sending")}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputContainer}>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleSend();
            }
          }}
          placeholder={t("chat.placeholder")}
          disabled={isSending}
          maxLength={MAX_INPUT_CHARS}
          style={styles.input}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={isSending || !input.trim()}
          aria-label={isSending ? t("chat.sending") : t("chat.send")}
          title={isSending ? t("chat.sending") : t("chat.send")}
          style={{
            ...styles.sendButton,
            opacity: isSending || !input.trim() ? 0.58 : 1,
            cursor: isSending || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          <span
            className="material-symbols-rounded"
            aria-hidden="true"
            style={{ fontSize: 20, lineHeight: 1 }}
          >
            send
          </span>
        </button>
      </div>
    </div>
  );

  if (isPanel) {
    return chatContent;
  }

  return <WidgetPane title={t("chat.title")}>{chatContent}</WidgetPane>;
}

const styles: Record<string, CSSProperties> = {
  root: {
    width: "100%",
    height: "100%",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    boxSizing: "border-box",
  },
  chatWindow: {
    width: "100%",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "8px 2px",
    gap: 8,
    overflowY: "auto",
    boxSizing: "border-box",
  },
  message: {
    maxWidth: "86%",
    padding: "10px 13px",
    borderRadius: 8,
    fontSize: 14,
    lineHeight: 1.4,
    color: "#111827",
    overflowWrap: "anywhere",
    backdropFilter: "blur(8px)",
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)",
  },
  pendingMessage: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(229, 229, 234, 0.48)",
    fontStyle: "italic",
  },
  inputContainer: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    minHeight: 42,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 42,
    padding: "0 12px",
    fontSize: 14,
    border: "1px solid rgba(15, 23, 42, 0.16)",
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.42)",
    backdropFilter: "blur(8px)",
    color: "inherit",
    outline: "none",
    boxSizing: "border-box",
  },
  sendButton: {
    width: 42,
    height: 42,
    flex: "0 0 42px",
    color: "#fff",
    backgroundColor: "rgba(37, 99, 235, 0.86)",
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: 8,
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s ease, background-color 0.2s ease",
  },
};
