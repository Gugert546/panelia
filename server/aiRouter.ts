import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { OpenAI } from "openai";
import { tools } from "./tools/registry";
import { runTool } from "./tools/dispatch";

export const aiRouter = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System-regler som styrer når AI skal bruke tools
const SYSTEM_PROMPT = `
Du er Panelia-assistenten.
- Når brukeren ber om å opprette/endre/slette app-data (f.eks. bokmerker), skal du bruke tilgjengelige tools.
- Hvis nødvendig info mangler (f.eks. url), spør brukeren om det.
- Ikke påstå at en handling er utført før du har fått tool-resultat som bekrefter det.
- Hvis en handling er destruktiv (sletting), be om eksplisitt bekreftelse først.
- Svar kort og praktisk på norsk.
`.trim();

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

aiRouter.post("/chat", async (req, res) => {
  const { userInput } = req.body;

  if (!userInput || typeof userInput !== "string") {
    return res.status(400).json({ error: "Missing userInput" });
  }

  // Midlertidig: hardkodet uid frem til Firebase auth middleware er på plass
  const uid = "local-dev";
  const requestId =
    (req.headers["x-request-id"] as string | undefined) ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const messages: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userInput },
  ];

  const toolSpecs = toOpenAITools();

  try {
    // 1) Første modell-svar (kan bli vanlig tekst eller tool_calls)
    const first = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages,
      tools: toolSpecs,
    });

    const firstMsg = first.choices[0]?.message;
    if (!firstMsg) {
      return res.status(500).json({ error: "No message returned from model" });
    }

    messages.push(firstMsg);

    // 2) Hvis modellen ba om tool-calls: kjør dem
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
          args = call.function.arguments
            ? JSON.parse(call.function.arguments)
            : {};
        } catch {
          // Hvis modellen sender invalid JSON-args
          args = {};
        }

        const result = await runTool(name, args, { uid, requestId });

        // Tool-resultat må legges inn som role:"tool" og knyttes til tool_call_id
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }

      // 3) Spør modellen igjen for å få "menneskelig" slutt-svar
      const second = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages,
        tools: toolSpecs,
      });

      const secondMsg = second.choices[0]?.message;
      return res.json({ output: secondMsg?.content ?? "" });
    }

    // 4) Ingen tool-call → returner teksten direkte
    return res.json({ output: firstMsg.content ?? "" });
  } catch (error) {
    console.error("AI route error:", error);
    return res
      .status(500)
      .json({ error: "Failed to communicate with OpenAI API" });
  }
});