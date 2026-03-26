import type { ToolDefinition } from "../types/index.js";

export const TOOL_REGISTRY: ToolDefinition[] = [];

export const TOOL_ACCESS_MAP = new Map<string, "read" | "write">();

export function registerTool(tool: ToolDefinition): void {
  TOOL_REGISTRY.push(tool);
  TOOL_ACCESS_MAP.set(tool.name, tool.accessLevel);
}
