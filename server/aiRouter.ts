import express from "express";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import { tools } from "./tools/registry";
import { runTool } from "./tools/dispatch";
import { adminAuth, adminDb } from "./firebaseAdmin";

dotenv.config();

export const aiRouter = express.Router();

const MAX_INPUT_CHARS = 3000;
const DEFAULT_MAX_OUTPUT_TOKENS = 700;
const DEFAULT_DAILY_MESSAGE_LIMIT = 50;

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

  const messages: any[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: trimmedUserInput },
  ];

  const toolSpecs = toOpenAITools();

  try {
    const first = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages,
      tools: toolSpecs,
      max_tokens: getAiMaxOutputTokens(),
    });

    const firstMsg = first.choices[0]?.message;
    if (!firstMsg) {
      return res.status(500).json({ error: "No message returned from model" });
    }

    messages.push(firstMsg);

    const toolCalls = (firstMsg as any).tool_calls as
      | Array<{
          id: string;
          type: "function";
          function: { name: string; arguments: string };
        }>
      | undefined;

    if (toolCalls?.length) {
      for (const call of toolCalls) {
        const name = call.function.name;

        let args: any = {};
        try {
          args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          args = {};
        }

        const result = await runTool(name, args, { uid, requestId });

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }

      const second = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages,
        tools: toolSpecs,
        max_tokens: getAiMaxOutputTokens(),
      });

      const secondMsg = second.choices[0]?.message;
      return res.json({
        output: secondMsg?.content ?? "",
        usage: {
          dailyLimit: quota.limit,
          remaining: quota.remaining,
        },
      });
    }

    return res.json({
      output: firstMsg.content ?? "",
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
