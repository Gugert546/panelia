import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useAuth } from "../../../auth/useAuth";
import { useLanguage } from "../../../../providers/languageProvider";
import { useFontSize } from "../../../../providers/themeProviders";

type EmailProviderId = "gmail" | "outlook";
type EmailConnectionStatus = "loading" | "connected" | "disconnected";

// Format for e-postmeldinger fra API.
type EmailMessage = {
  id: string;
  threadId: string;
  provider: EmailProviderId;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string | null;
  unread: boolean;
  providerUrl: string;
};

type EmailMessagesResponse = {
  messages?: EmailMessage[];
};

// Tilgjengelige e-post-leverandører (Gmail, Outlook, mm).
const EMAIL_PROVIDERS = [
  { id: "gmail", label: "Gmail", enabled: true },
  { id: "outlook", label: "Outlook", enabled: true },
  { id: "imap", label: "IMAP", enabled: false },
] as const;

// Pakker ut avsendernavnet fra "Name <email@domain>" format.
function extractSenderName(sender: string) {
  const trimmed = sender.trim();
  const angleIndex = trimmed.indexOf("<");
  // Hvis det finnes navn før E-post-adressen, bruk det.
  if (angleIndex > 0) return trimmed.slice(0, angleIndex).replace(/^"|"$/g, "").trim();
  return trimmed;
}

// Formaterer meldings-tid som "HH:mm" (samme dag) eller "DD Mmm" (annen dag).
function formatMessageTime(value: string | null, locale: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  // Sjekker om meldingen er fra i dag eller tidligere.
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  return new Intl.DateTimeFormat(locale, sameDay
    ? { hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short" }
  ).format(date);
}

function parseEmailProvider(value: string | null): EmailProviderId | null {
  return value === "gmail" || value === "outlook" ? value : null;
}

// Refs for fokus-håndtering under tastaturnavigasjon.
export default function EmailWidget() {
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();
  const { fontSize } = useFontSize();
  // E-post-provider valg og forbindelsestatus.
  const [provider, setProvider] = useState<EmailProviderId>("gmail");
  const [connectionStatus, setConnectionStatus] =
    useState<EmailConnectionStatus>("loading");
  // Flags for å blokkere samtidig forbindelse/oppdatering.
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  // Meldinger og feil/notiser.
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [error, setError] = useState("");
  const [oauthNotice, setOauthNotice] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  // Refs for sidefelt-navigasjon.
  const providerSelectRef = useRef<HTMLSelectElement | null>(null);
  const refreshButtonRef = useRef<HTMLButtonElement | null>(null);
  const connectButtonRef = useRef<HTMLButtonElement | null>(null);
  const disconnectButtonRef = useRef<HTMLButtonElement | null>(null);
  const messageButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const locale = language === "no" ? "nb-NO" : "en-US";
  const selectedProvider = EMAIL_PROVIDERS.find((item) => item.id === provider);

  useEffect(() => {
    const url = new URL(window.location.href);
    const oauthResult = url.searchParams.get("email_oauth");
    const oauthProvider = parseEmailProvider(url.searchParams.get("email_provider"));

    if (!oauthResult) return;

    if (oauthProvider) {
      setProvider(oauthProvider);
    }

    setOauthNotice(
      oauthResult === "connected"
        ? t("widgets.emailWidget.oauthConnected")
        : t("widgets.emailWidget.oauthError")
    );
    url.searchParams.delete("email_oauth");
    url.searchParams.delete("email_provider");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [t]);

  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    const loadStatus = async () => {
      if (!user) {
        setConnectionStatus("disconnected");
        setMessages([]);
        return;
      }

      setConnectionStatus("loading");
      setError("");

      try {
        const token = await user.getIdToken();
        const params = new URLSearchParams({ provider });
        const response = await fetch(`/api/email/status?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to read email status");
        }

        const payload = (await response.json()) as { connected?: boolean };
        if (!cancelled) {
          setConnectionStatus(payload.connected ? "connected" : "disconnected");
        }
      } catch {
        if (!cancelled) {
          setConnectionStatus("disconnected");
          setError(t("widgets.emailWidget.statusError"));
        }
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [loading, provider, t, user]);

  useEffect(() => {
    if (!user || connectionStatus !== "connected") return;

    let cancelled = false;

    const loadMessages = async () => {
      setRefreshBusy(true);
      setError("");

      try {
        const token = await user.getIdToken();
        const params = new URLSearchParams({
          provider,
          maxResults: "8",
        });
        const response = await fetch(`/api/email/messages?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load email messages");
        }

        const payload = (await response.json()) as EmailMessagesResponse;
        if (!cancelled) {
          setMessages(Array.isArray(payload.messages) ? payload.messages : []);
        }
      } catch {
        if (!cancelled) {
          setError(t("widgets.emailWidget.messagesError"));
        }
      } finally {
        if (!cancelled) setRefreshBusy(false);
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [connectionStatus, provider, refreshTick, t, user]);

  useEffect(() => {
    if (connectionStatus !== "connected") return;

    const interval = setInterval(() => {
      setRefreshTick((current) => current + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [connectionStatus]);

  const handleConnect = async () => {
    if (!user) {
      setError(t("widgets.emailWidget.signInRequired"));
      return;
    }

    setConnectionBusy(true);
    setError("");

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/email/connect-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider,
          returnTo: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start email OAuth");
      }

      const payload = (await response.json()) as { url?: string };
      if (!payload.url) {
        throw new Error("Email OAuth URL missing");
      }

      window.location.href = payload.url;
    } catch {
      setError(t("widgets.emailWidget.connectError"));
      setConnectionBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) {
      setConnectionStatus("disconnected");
      setMessages([]);
      return;
    }

    setConnectionBusy(true);
    setError("");

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/email/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect email");
      }

      setConnectionStatus("disconnected");
      setMessages([]);
    } catch {
      setError(t("widgets.emailWidget.disconnectError"));
    } finally {
      setConnectionBusy(false);
    }
  };

  const handleOpenMessage = (message: EmailMessage) => {
    window.open(message.providerUrl, "_blank", "noopener,noreferrer");
  };

  const focusWidgetTopControl = (start: HTMLElement) => {
    const widgetRoot = start.closest("[data-widget-id]");
    const lockButton = widgetRoot?.querySelector(
      "button.widget-lock-btn:not([disabled])"
    ) as HTMLButtonElement | null;
    const styleButton = widgetRoot?.querySelector(
      "button.widget-style-btn:not([disabled])"
    ) as HTMLButtonElement | null;

    (lockButton ?? styleButton)?.focus();
  };

  const focusFirstMessage = () => {
    messageButtonRefs.current[0]?.focus();
  };

  const focusFirstLowerControl = () => {
    if (showDisconnected) {
      connectButtonRef.current?.focus();
      return;
    }

    if (connectionStatus === "connected") {
      disconnectButtonRef.current?.focus();
    }
  };

  const handleProviderSelectKeyDown = (
    event: KeyboardEvent<HTMLSelectElement>
  ) => {
    if (
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight"
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "ArrowUp") {
      focusWidgetTopControl(event.currentTarget);
      return;
    }

    if (event.key === "ArrowRight") {
      refreshButtonRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      focusFirstLowerControl();
    }
  };

  const handleRefreshButtonKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>
  ) => {
    if (
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight"
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "ArrowUp") {
      focusWidgetTopControl(event.currentTarget);
      return;
    }

    if (event.key === "ArrowLeft") {
      providerSelectRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      focusFirstLowerControl();
    }
  };

  const handleConnectButtonKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>
  ) => {
    if (event.key !== "ArrowUp") return;

    event.preventDefault();
    event.stopPropagation();
    providerSelectRef.current?.focus();
  };

  const handleDisconnectButtonKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>
  ) => {
    if (
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight"
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "ArrowUp") {
      providerSelectRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      focusFirstMessage();
    }
  };

  const handleMessageButtonKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight"
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      return;
    }

    if (event.key === "ArrowUp") {
      if (index === 0) {
        disconnectButtonRef.current?.focus();
        return;
      }

      messageButtonRefs.current[index - 1]?.focus();
      return;
    }

    messageButtonRefs.current[index + 1]?.focus();
  };

  const connectLabel =
    provider === "outlook"
      ? t("widgets.emailWidget.connectOutlook")
      : t("widgets.emailWidget.connectGmail");
  const connectHelp =
    provider === "outlook"
      ? t("widgets.emailWidget.connectOutlookHelp")
      : t("widgets.emailWidget.connectGmailHelp");

  const showDisconnected =
    connectionStatus === "disconnected" || !user || !selectedProvider?.enabled;

  return (
    <WidgetContainer>
      <WidgetPane title={t("widgets.emailWidget.title")}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            height: "100%",
            gap: 12,
            fontSize,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <select
              ref={providerSelectRef}
              value={provider}
              onChange={(event) => setProvider(event.target.value as EmailProviderId)}
              onKeyDown={handleProviderSelectKeyDown}
              style={{
                border: "1px solid rgba(255,255,255,0.32)",
                borderRadius: 999,
                background: "rgba(255,255,255,0.16)",
                color: "inherit",
                padding: "6px 10px",
                fontWeight: 700,
                outline: "none",
                boxShadow: undefined,
              }}
              onFocus={e => e.currentTarget.style.border = '2px solid #fff'}
              onBlur={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.32)'}
            >
              {EMAIL_PROVIDERS.map((item) => (
                <option key={item.id} value={item.id} disabled={!item.enabled}>
                  {item.enabled ? item.label : `${item.label} (${t("widgets.emailWidget.soon")})`}
                </option>
              ))}
            </select>

            <button
              ref={refreshButtonRef}
              type="button"
              onClick={() => setRefreshTick((current) => current + 1)}
              disabled={refreshBusy || connectionStatus !== "connected"}
              onKeyDown={handleRefreshButtonKeyDown}
              aria-label={t("widgets.emailWidget.refresh")}
              title={t("widgets.emailWidget.refresh")}
              style={{
                marginLeft: "auto",
                width: 30,
                height: 30,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.32)",
                background: "rgba(255,255,255,0.16)",
                color: "inherit",
                cursor:
                  refreshBusy || connectionStatus !== "connected"
                    ? "not-allowed"
                    : "pointer",
                opacity: refreshBusy || connectionStatus !== "connected" ? 0.55 : 1,
              }}
            >
              <span
                className="material-symbols-rounded"
                aria-hidden="true"
                style={{ fontSize: 17, lineHeight: 1 }}
              >
                refresh
              </span>
            </button>
          </div>

          {connectionStatus === "loading" && (
            <div style={{ opacity: 0.75 }}>{t("widgets.emailWidget.checking")}</div>
          )}

          {showDisconnected && connectionStatus !== "loading" && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 12,
                textAlign: "center",
              }}
            >
              <div style={{ opacity: 0.78 }}>
                {!user
                  ? t("widgets.emailWidget.signInRequired")
                  : selectedProvider?.enabled
                    ? connectHelp
                    : t("widgets.emailWidget.providerUnavailable")}
              </div>
              {user && selectedProvider?.enabled && (
                <button
                  ref={connectButtonRef}
                  data-email-connect-btn="true"
                  type="button"
                  onKeyDown={handleConnectButtonKeyDown}
                  onClick={handleConnect}
                  disabled={connectionBusy}
                  style={{
                    alignSelf: "center",
                    border: "none",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.9)",
                    color: "#111827",
                    padding: "9px 14px",
                    fontWeight: 800,
                    cursor: connectionBusy ? "wait" : "pointer",
                  }}
                >
                  {connectionBusy
                    ? t("widgets.emailWidget.connecting")
                    : connectLabel}
                </button>
              )}
            </div>
          )}

          {connectionStatus === "connected" && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: Math.max(11, fontSize - 2),
                  opacity: 0.76,
                }}
              >
                <span>{t("widgets.emailWidget.unreadFirst")}</span>
                <button
                  ref={disconnectButtonRef}
                  type="button"
                  onClick={handleDisconnect}
                  disabled={connectionBusy}
                  onKeyDown={handleDisconnectButtonKeyDown}
                  style={{
                    marginLeft: "auto",
                    border: "none",
                    background: "transparent",
                    color: "inherit",
                    textDecoration: "underline",
                    cursor: connectionBusy ? "wait" : "pointer",
                    opacity: 0.8,
                    padding: 0,
                  }}
                >
                  {t("widgets.emailWidget.disconnect")}
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {messages.length === 0 && !refreshBusy && (
                  <div style={{ opacity: 0.72, paddingTop: 12 }}>
                    {t("widgets.emailWidget.empty")}
                  </div>
                )}

                {messages.map((message, index) => (
                  <button
                    key={message.id}
                    ref={(element) => {
                      messageButtonRefs.current[index] = element;
                    }}
                    type="button"
                    onClick={() => handleOpenMessage(message)}
                    onKeyDown={(event) => handleMessageButtonKeyDown(event, index)}
                    style={{
                      width: "100%",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 14,
                      background: message.unread
                        ? "rgba(255,255,255,0.24)"
                        : "rgba(255,255,255,0.10)",
                      color: "inherit",
                      padding: "9px 10px",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      {message.unread && (
                        <span
                          aria-label={t("widgets.emailWidget.unread")}
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 999,
                            background: "#60a5fa",
                            flex: "0 0 auto",
                          }}
                        />
                      )}
                      <strong
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {extractSenderName(message.from)}
                      </strong>
                      <span style={{ marginLeft: "auto", opacity: 0.68, fontSize: Math.max(10, fontSize - 3) }}>
                        {formatMessageTime(message.receivedAt, locale)}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontWeight: message.unread ? 800 : 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {message.subject}
                    </div>
                    {message.snippet && (
                      <div
                        style={{
                          marginTop: 3,
                          opacity: 0.68,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: Math.max(11, fontSize - 2),
                        }}
                      >
                        {message.snippet}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {error && (
            <div style={{ color: "#fecaca", fontSize: Math.max(11, fontSize - 2) }}>
              {error}
            </div>
          )}

          {oauthNotice && !error && (
            <div style={{ opacity: 0.76, fontSize: Math.max(11, fontSize - 2) }}>
              {oauthNotice}
            </div>
          )}
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}
