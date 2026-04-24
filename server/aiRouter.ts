import express from "express";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import { tools } from "./tools/registry";
import { runTool } from "./tools/dispatch";
import { adminAuth, adminDb } from "./firebaseAdmin";

dotenv.config();

export const aiRouter = express.Router();

const MAX_INPUT_CHARS = 3000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_MESSAGE_CHARS = 1200;
const MAX_TOOL_ROUNDS = 5;
const DEFAULT_MAX_OUTPUT_TOKENS = 700;
const DEFAULT_DAILY_MESSAGE_LIMIT = 50;

type ChatHistoryItem = {
  sender: "user" | "ai";
  text: string;
};

type ChatToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

function getPositiveIntegerEnv(key: string, fallback: number) {
  const rawValue = process.env[key]?.trim();
  if (!rawValue) return fallback;

  const parsedValue = Number(rawValue);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) return fallback;

  return parsedValue;
}

function getAiMaxOutputTokens() {
  return getPositiveIntegerEnv("AI_MAX_OUTPUT_TOKENS", DEFAULT_MAX_OUTPUT_TOKENS);
}

function getAiDailyMessageLimit() {
  return getPositiveIntegerEnv("AI_DAILY_MESSAGE_LIMIT", DEFAULT_DAILY_MESSAGE_LIMIT);
}

function getOsloDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function consumeDailyAiQuota(uid: string, inputChars: number) {
  const dateKey = getOsloDateKey();
  const dailyLimit = getAiDailyMessageLimit();
  const usageRef = adminDb
    .collection("users")
    .doc(uid)
    .collection("aiUsage")
    .doc(dateKey);

  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(usageRef);
    const data = snapshot.exists ? snapshot.data() : undefined;
    const currentMessageCount =
      typeof data?.messageCount === "number" && Number.isFinite(data.messageCount)
        ? data.messageCount
        : 0;
    const currentInputChars =
      typeof data?.inputChars === "number" && Number.isFinite(data.inputChars)
        ? data.inputChars
        : 0;

    if (currentMessageCount >= dailyLimit) {
      return {
        allowed: false,
        limit: dailyLimit,
        remaining: 0,
      };
    }

    const nextMessageCount = currentMessageCount + 1;

    transaction.set(
      usageRef,
      {
        date: dateKey,
        messageCount: nextMessageCount,
        inputChars: currentInputChars + inputChars,
        limit: dailyLimit,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return {
      allowed: true,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - nextMessageCount),
    };
  });
}

function buildSystemPrompt() {
  const now = new Date();
  const nowIso = now.toISOString();
  const localeDate = now.toLocaleDateString("nb-NO", { timeZone: "Europe/Oslo" });

  return `
Du er Panelia-assistenten.
Nåtid: ${nowIso} (lokal dato i Europe/Oslo: ${localeDate}).

- Når brukeren ber om å opprette/endre/slette app-data (f.eks. bokmerker og kalenderhendelser), skal du bruke tilgjengelige tools.
- Ikke påstå at en handling er utført før du har fått tool-resultat som bekrefter det.
- Hvis en handling er destruktiv (sletting), be om eksplisitt bekreftelse først.
- Svar kort og praktisk på norsk.

Intent-mapping for kalender:
- "lag/opprett ny avtale", "legg til møte", "book" => createCalendarEvent
- "endre/flytt/oppdater avtale" => updateCalendarEvent
- "slett/fjern avtal(e)" => deleteCalendarEvent (kun etter bekreftelse)
- "vis/list kommende avtaler" => listCalendarEvents

Intent-mapping for egendefinerte knapper:
- "legg til/opprett custom button/knapp/snarvei" => addCustomButton
- "vis/list knappene mine" => listCustomButtons
- "slett/fjern knapp" => removeCustomButton (kun etter bekreftelse)
- Hvis brukeren vil fjerne en knapp og id mangler, bruk listCustomButtons for å finne kandidater. Spør hvis flere kan passe.

Intent-mapping for vanlige dashboard-widgets:
- "legg til/vis/slå på widget" => addDashboardWidget
- "fjern/skjul/slå av widget" => removeDashboardWidget
- "hvilke widgets har jeg" => listDashboardWidgets
- Dette gjelder kun vanlige widgets: clock, calendar, google_search, weather, news, spotify, minesweeper, bookmark, info, ai_chat, email.
- Ikke bruk disse for notes/notater eller custom buttons/egendefinerte knapper.
- Å slå vanlige widgets av/på trenger ikke ekstra bekreftelse.

Intent-mapping for klokke:
- "sett/bytt klokke til analog" => setClockMode med mode "analog"
- "sett/bytt klokke til digital" => setClockMode med mode "digital"
- "switch/toggle/bytt klokkemodus" uten spesifikk modus => toggleClockMode
- Hvis brukeren sier "bytt tilbake", "switch back" eller lignende rett etter en samtale om klokkemodus, bruk toggleClockMode.
- setClockMode/toggleClockMode legger til clock-widgeten hvis den ikke allerede er på dashboardet.
- Ikke si at klokkemodus er endret uten at setClockMode eller toggleClockMode faktisk er kjørt.

Intent-mapping for temaer/presets:
- "bytt/switch/sett tema", "bruk theme", "apply preset" => applyDashboardTheme
- "lagre/save nåværende tema/layout/preset" => saveDashboardTheme
- "slett/delete/fjern tema/preset" => deleteDashboardTheme (kun etter bekreftelse)
- "vis/list temaer/presets" => listDashboardThemes
- Tema-match er tilgivende: hvis brukeren sier "cat theme" eller "floating theme", send den meningsbærende delen som themeName. Toolen kan matche delnavn som "cat" mot "floating cat".
- Hvis brukeren ber om å lagre tema uten navn, kan saveDashboardTheme kalles uten name. Da brukes "Preset N".
- Hvis brukeren sier "lagre dette som X" eller "save current theme as X", bruk name "X".
- Hvis brukeren vil slette et tema, finn først sannsynlig tema med listDashboardThemes eller spør om bekreftelse direkte hvis navnet er klart. Kjør deleteDashboardTheme først etter eksplisitt "ja"/bekreftelse.
- Hvis applyDashboardTheme returnerer ok:false med reason "ambiguous", spør brukeren hvilken kandidat de mener.
- Hvis applyDashboardTheme returnerer ok:false med reason "not_found", si kort at temaet ikke ble funnet og nevn tilgjengelige kandidater hvis tool-resultatet har dem.
- Hvis deleteDashboardTheme returnerer ok:false med reason "ambiguous", spør brukeren hvilken kandidat de mener.
- Hvis deleteDashboardTheme returnerer ok:false med reason "not_found", si kort at temaet ikke ble funnet og nevn tilgjengelige kandidater hvis tool-resultatet har dem.
- Ikke si at temaet er endret uten at applyDashboardTheme returnerer ok:true.
- Ikke si at temaet er lagret uten at saveDashboardTheme returnerer ok:true.
- Ikke si at temaet er slettet uten at deleteDashboardTheme returnerer ok:true.

Intent-mapping for dashboard-styling:
- "endre styling/design/utseende", "gjør teksten større/mindre", "endre widget-farge", "endre border", "endre tekstfarge", "endre opasitet" => updateDashboardStyle
- Bruk "textSize" for global tekststørrelse, "widgetColor" for widget-bakgrunn, "widgetOpacity" for opasitet, "borderThickness" for border-tykkelse, "borderColor" for borderfarge, og "textColor" for tekstfarge.
- Du kan sende flere av disse i samme tool-kall når brukeren ber om flere stilendringer samtidig.
- Ikke si at styling er endret uten at updateDashboardStyle returnerer ok:true.

Intent-mapping for styling av én widget:
- "endre fargen på vær-widgeten", "gjør bokmerker røde", "sett større tekst bare på kalender", "endre border på én widget" => updateDashboardWidgetStyle
- Bruk "widgetId" for mål-widgeten og de samme feltene som global styling: "textSize", "widgetColor", "widgetOpacity", "borderThickness", "borderColor", "textColor".
- Hvis brukeren tydelig mener én bestemt widget, bruk denne toolen i stedet for global updateDashboardStyle.
- Hvis updateDashboardWidgetStyle returnerer ok:false med reason "ambiguous", spør hvilken widget-id/kandidat de mener.
- Hvis updateDashboardWidgetStyle returnerer ok:false med reason "not_found", si kort at widgeten ikke ble funnet.
- Hvis updateDashboardWidgetStyle returnerer ok:false med reason "locked", si kort at widgeten er låst og må låses opp før individuell styling.
- Ikke si at widget-styling er endret uten at updateDashboardWidgetStyle returnerer ok:true.

Regler for å gjette manglende data ved opprettelse:
- Hvis tittel mangler, bruk "Møte".
- Hvis sluttid mangler, bruk varighet 1 time.
- Tolke relative datoer/tider (f.eks. "i morgen kl 11") ut fra Europe/Oslo.
- Spør bare oppfølgingsspørsmål når starttid faktisk ikke kan utledes.
- Etter hver tool-kjøring: oppsummer kort hva som ble gjort, inkludert antakelser.
`.trim();
}

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

function parseChatHistory(value: unknown): ChatHistoryItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-MAX_HISTORY_MESSAGES)
    .flatMap((item): ChatHistoryItem[] => {
      if (!item || typeof item !== "object") return [];

      const sender = (item as Record<string, unknown>).sender;
      const text = (item as Record<string, unknown>).text;

      if ((sender !== "user" && sender !== "ai") || typeof text !== "string") {
        return [];
      }

      const trimmedText = text.trim().slice(0, MAX_HISTORY_MESSAGE_CHARS);
      if (!trimmedText) return [];

      return [{ sender, text: trimmedText }];
    });
}

function toOpenAIHistoryMessages(history: ChatHistoryItem[]) {
  return history.map((item) => ({
    role: item.sender === "user" ? "user" : "assistant",
    content: item.text,
  }));
}

function isClockSwitchBackRequest(userInput: string, history: ChatHistoryItem[]) {
  const normalizedInput = userInput.toLocaleLowerCase("nb");
  const asksToSwitchBack =
    normalizedInput.includes("bytt tilbake") ||
    normalizedInput.includes("tilbake") ||
    normalizedInput.includes("switch back") ||
    normalizedInput.includes("change back");

  if (!asksToSwitchBack) return false;

  const recentText = history
    .slice(-6)
    .map((item) => item.text)
    .join("\n")
    .toLocaleLowerCase("nb");

  return (
    recentText.includes("klokke") ||
    recentText.includes("clock") ||
    recentText.includes("analog") ||
    recentText.includes("digital")
  );
}

function buildContextualToolHint(userInput: string, history: ChatHistoryItem[]) {
  if (isClockSwitchBackRequest(userInput, history)) {
    return {
      role: "system",
      content:
        "Konteksthint: Brukeren sier trolig at klokkemodusen skal byttes tilbake. Du må kalle toggleClockMode før du svarer.",
    };
  }

  return null;
}

function toOpenAITools() {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters as any,
    },
  }));
}

function parseToolArguments(rawArguments: string) {
  try {
    return rawArguments ? JSON.parse(rawArguments) : {};
  } catch {
    return {};
  }
}

function getBearerToken(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

async function requireUid(req: express.Request, res: express.Response) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "missing bearer token" });
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    res.status(401).json({ error: "invalid bearer token" });
    return null;
  }
}

aiRouter.post("/chat", async (req, res) => {
  const { userInput } = req.body;

  if (!userInput || typeof userInput !== "string") {
    return res.status(400).json({ error: "Missing userInput" });
  }

  const trimmedUserInput = userInput.trim();
  const history = parseChatHistory(req.body?.history);

  if (!trimmedUserInput) {
    return res.status(400).json({ error: "Missing userInput" });
  }

  if (trimmedUserInput.length > MAX_INPUT_CHARS) {
    return res.status(413).json({
      error: "Input is too long",
      maxInputChars: MAX_INPUT_CHARS,
    });
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return res.status(503).json({ error: "OPENAI_API_KEY is not configured on the server" });
  }

  const uid = await requireUid(req, res);
  if (!uid) return;

  const quota = await consumeDailyAiQuota(uid, trimmedUserInput.length);
  if (!quota.allowed) {
    return res.status(429).json({
      error: "Daily AI message limit reached",
      dailyLimit: quota.limit,
      remaining: quota.remaining,
    });
  }

  const requestId =
    (req.headers["x-request-id"] as string | undefined) ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const contextualToolHint = buildContextualToolHint(trimmedUserInput, history);
  const messages: any[] = [
    { role: "system", content: buildSystemPrompt() },
    ...(contextualToolHint ? [contextualToolHint] : []),
    ...toOpenAIHistoryMessages(history),
    { role: "user", content: trimmedUserInput },
  ];

  const toolSpecs = toOpenAITools();
  const executedTools: Array<{ name: string; result: unknown }> = [];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages,
        tools: toolSpecs,
        max_tokens: getAiMaxOutputTokens(),
      });

      const message = completion.choices[0]?.message;
      if (!message) {
        return res.status(500).json({ error: "No message returned from model" });
      }

      messages.push(message);

      const toolCalls = (message as any).tool_calls as ChatToolCall[] | undefined;

      if (!toolCalls?.length) {
        return res.json({
          output: typeof message.content === "string" ? message.content : "",
          executedTools,
          usage: {
            dailyLimit: quota.limit,
            remaining: quota.remaining,
          },
        });
      }

      for (const call of toolCalls) {
        const name = call.function.name;
        const args = parseToolArguments(call.function.arguments);

        const result = await runTool(name, args, { uid, requestId });
        executedTools.push({ name, result });

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return res.json({
      output: "Jeg måtte stoppe fordi handlingen krevde for mange verktøysteg. Prøv igjen med en litt mer spesifikk beskjed.",
      executedTools,
      usage: {
        dailyLimit: quota.limit,
        remaining: quota.remaining,
      },
    });
  } catch (error) {
    console.error("AI route error:", error);
    return res.status(500).json({ error: "Failed to communicate with OpenAI API" });
  }
});
