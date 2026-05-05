import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from "react";
import WidgetContainer from "../features/Widgets/components/WidgetContainer";
import WidgetPane from "../features/Widgets/components/WidgetPane";
import { useLanguage } from "../providers/languageProvider";
import { useAiChat } from "./useAiChat";

type ChatVariant = "panel" | "widget";

type ChatProps = {
  variant?: ChatVariant;
  autoFocus?: boolean;
  onRequestSidebarChatFocus?: () => void;
};

export type ChatHandle = {
  focusInput: () => void;
};

const MAX_INPUT_CHARS = 3000;

function isConfirmationPrompt(text: string) {
  const normalized = text.toLocaleLowerCase("nb");

  return (
    normalized.includes("bekrefter du") ||
    normalized.includes("skriv \"ja\"") ||
    normalized.includes("skriv ja") ||
    normalized.includes("er du sikker") ||
    normalized.includes("are you sure") ||
    normalized.includes("confirm") ||
    normalized.includes("bekreft")
  );
}

const Chat = forwardRef<ChatHandle, ChatProps>(function Chat(
  { variant = "widget", autoFocus = false, onRequestSidebarChatFocus }: ChatProps,
  ref
) {
  const { messages, isSending, sendMessage } = useAiChat();
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const sendButtonRef = useRef<HTMLButtonElement | null>(null);
  const isPanel = variant === "panel";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isSending]);

  useEffect(() => {
    const inputElement = inputRef.current;
    if (!inputElement) return;

    inputElement.style.height = "42px";
    inputElement.style.height = `${inputElement.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    if (!autoFocus) return;

    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, [autoFocus]);

  useImperativeHandle(ref, () => ({
    focusInput: () => {
      requestAnimationFrame(() => {
        inputRef.current?.focus({ preventScroll: true });
      });
    },
  }), []);

  const handleSend = async () => {
    const messageText = input.trim();
    if (!messageText || isSending) return;

    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());
    await sendMessage(messageText, t("chat.error"));
    inputRef.current?.focus();
  };

  const handleQuickReply = async (reply: "ja" | "nei") => {
    if (isSending) return;

    setInput("");
    await sendMessage(reply, t("chat.error"));
    inputRef.current?.focus();
  };

  const focusWidgetTopControl = (start: HTMLElement) => {
    const widgetRoot = start.closest("[data-widget-id]");
    if (!(widgetRoot instanceof HTMLElement)) return;

    const topControl = widgetRoot.querySelector(
      "button.widget-style-btn, button.widget-lock-btn"
    ) as HTMLElement | null;

    topControl?.focus();
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
        <div
          style={{
            ...styles.message,
            ...styles.welcomeMessage,
          }}
        >
          {t("chat.welcome")}
        </div>

        {messages.map((message, index) => {
          const isUserMessage = message.sender === "user";
          const showConfirmationActions =
            !isUserMessage &&
            index === messages.length - 1 &&
            !isSending &&
            isConfirmationPrompt(message.text);

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
              <div>{message.text}</div>
              {showConfirmationActions && (
                <div style={styles.confirmActions}>
                  <button
                    type="button"
                    onClick={() => void handleQuickReply("ja")}
                    style={{
                      ...styles.confirmButton,
                      ...styles.confirmPrimaryButton,
                    }}
                  >
                    Ja
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleQuickReply("nei")}
                    style={styles.confirmButton}
                  >
                    Nei
                  </button>
                </div>
              )}
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
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
              return;
            }

            if (
              isPanel &&
              event.key === "ArrowLeft" &&
              !event.shiftKey &&
              !event.altKey &&
              !event.ctrlKey &&
              !event.metaKey
            ) {
              const target = event.currentTarget;
              const hasSelection = target.selectionStart !== target.selectionEnd;
              const caretAtStart = target.selectionStart === 0 && target.selectionEnd === 0;

              if (!hasSelection && caretAtStart) {
                event.preventDefault();
                onRequestSidebarChatFocus?.();
                return;
              }
            }

            if (
              event.key === "ArrowRight" &&
              !event.shiftKey &&
              !event.altKey &&
              !event.ctrlKey &&
              !event.metaKey
            ) {
              const target = event.currentTarget;
              const hasSelection = target.selectionStart !== target.selectionEnd;
              const caretAtEnd = target.selectionEnd === target.value.length;

              if (!hasSelection && caretAtEnd) {
                event.preventDefault();
                sendButtonRef.current?.focus();
              }
            }

            if (
              event.key === "ArrowUp" &&
              !event.shiftKey &&
              !event.altKey &&
              !event.ctrlKey &&
              !event.metaKey
            ) {
              const target = event.currentTarget;
              const hasSelection = target.selectionStart !== target.selectionEnd;
              const caretAtTop = target.selectionStart === 0 && target.selectionEnd === 0;

              if (!hasSelection && caretAtTop) {
                event.preventDefault();
                focusWidgetTopControl(target);
              }
            }
          }}
          placeholder={t("chat.placeholder")}
          maxLength={MAX_INPUT_CHARS}
          rows={1}
          style={styles.input}
        />
        <button
          ref={sendButtonRef}
          type="button"
          onClick={() => void handleSend()}
          aria-disabled={isSending || !input.trim()}
          aria-label={isSending ? t("chat.sending") : t("chat.send")}
          title={isSending ? t("chat.sending") : t("chat.send")}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              inputRef.current?.focus();
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              focusWidgetTopControl(event.currentTarget);
            }
          }}
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

  return (
    <WidgetContainer>
      <WidgetPane title={t("chat.title")}>{chatContent}</WidgetPane>
    </WidgetContainer>
  );
});

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
    whiteSpace: "pre-line",
    backdropFilter: "blur(8px)",
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)",
  },
  welcomeMessage: {
    alignSelf: "flex-start",
      backgroundColor: "rgba(229, 229, 234, 0.68)",
  },
  pendingMessage: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(229, 229, 234, 0.48)",
    fontStyle: "italic",
  },
  confirmActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  confirmButton: {
    minWidth: 68,
    minHeight: 34,
    padding: "7px 12px",
    borderRadius: 8,
    border: "1px solid rgba(15, 23, 42, 0.16)",
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    color: "#111827",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  confirmPrimaryButton: {
    border: "1px solid rgba(37, 99, 235, 0.34)",
    backgroundColor: "rgba(37, 99, 235, 0.86)",
    color: "#fff",
  },
  inputContainer: {
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
    width: "100%",
    minHeight: 42,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    maxHeight: 156,
    padding: "10px 12px",
    fontSize: 14,
    lineHeight: 1.4,
    border: "1px solid rgba(15, 23, 42, 0.16)",
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.42)",
    backdropFilter: "blur(8px)",
    color: "inherit",
    outline: "none",
    boxSizing: "border-box",
    resize: "none",
    overflowY: "auto",
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
export default Chat;
