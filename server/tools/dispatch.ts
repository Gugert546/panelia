// server/tools/dispatch.ts
import { toolMap } from "./registry";
import type { ToolContext } from "./types";

export async function runTool(name: string, args: unknown, ctx: ToolContext) {
  const tool = toolMap.get(name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);

  // (Recommended) validate args with zod/valibot/ajv here

  return tool.handler(args as any, ctx);
}