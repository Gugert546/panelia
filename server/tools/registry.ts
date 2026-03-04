// server/tools/registry.ts
import { makeBookmarkTool } from "./bookmarks";

export const tools = [makeBookmarkTool] as const;

export const toolMap = new Map(tools.map(t => [t.name, t]));