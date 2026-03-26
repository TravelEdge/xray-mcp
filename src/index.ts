#!/usr/bin/env node

// CRITICAL: Import tools BEFORE createServer() to populate TOOL_REGISTRY (D-25, Pitfall 4).
import "./tools/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./transport/createServer.js";

/**
 * Application entry point.
 *
 * Selects transport based on the TRANSPORT environment variable:
 * - (default / unset): stdio transport — for Claude Desktop, Cursor, VS Code
 * - "http": Streamable HTTP transport — wired in Phase 3 (TRNS-02)
 *
 * Lazy credential validation (D-10): the server starts without checking
 * credentials. The first tool call triggers credential resolution.
 */
async function main(): Promise<void> {
  const transport = process.env.TRANSPORT;

  if (transport === "http") {
    // HTTP transport (TRNS-02) will be implemented in Phase 3.
    // For now, exit with a clear message rather than silently failing.
    console.error("HTTP transport not yet implemented. Use stdio (default) or omit TRANSPORT.");
    process.exit(1);
  }

  // Default: stdio transport (TRNS-01)
  const server = createServer();
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
