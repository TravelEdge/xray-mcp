import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import { authManager, CredentialStore } from "../auth/index.js";
import { createServer } from "./createServer.js";

/**
 * Creates the Express HTTP app for Streamable HTTP MCP transport.
 *
 * Per D-30: Uses createMcpExpressApp from MCP SDK for DNS rebinding protection.
 * Per D-33: Each POST /mcp creates a new McpServer for credential isolation.
 * Per D-31: Credentials extracted from X-Xray-Client-Id / X-Xray-Client-Secret headers.
 * Per D-32: Region is server-wide via XRAY_REGION env var only.
 */
export function createHttpApp() {
  const allowedHostsRaw = process.env.ALLOWED_HOSTS;
  const allowedHosts = allowedHostsRaw
    ? allowedHostsRaw.split(",").map((h) => h.trim())
    : undefined;
  const app = createMcpExpressApp({ host: "0.0.0.0", allowedHosts });

  // TRNS-05: Health check — liveness probe
  app.get("/healthz", (_req: Request, res: Response) => {
    res.json({ status: "ok", transport: "http" });
  });

  // TRNS-06: Readiness check — verifies Xray API connectivity
  // Uses server-level env var credentials. Returns "not configured" if no creds.
  app.get("/readyz", async (_req: Request, res: Response) => {
    const credentialStore = new CredentialStore();
    try {
      const auth = credentialStore.resolveFromEnv();
      await authManager.getCloudToken(auth.credentials);
      res.json({ status: "ready", xray: "reachable" });
    } catch (err) {
      // If no server-level creds, return 200 with "not configured" (preserves lazy validation D-10)
      const message =
        err instanceof Error && err.message.includes("AUTH_MISSING_CRED")
          ? "not configured"
          : "unreachable";
      const statusCode = message === "not configured" ? 200 : 503;
      res
        .status(statusCode)
        .json({ status: message === "not configured" ? "ok" : "not ready", xray: message });
    }
  });

  // TRNS-02, TRNS-03: Stateless per-request MCP handler
  app.post("/mcp", async (req: Request, res: Response) => {
    const credentialStore = new CredentialStore();

    // D-31: Extract per-request credentials from custom headers
    const clientId = req.headers["x-xray-client-id"] as string | undefined;
    const clientSecret = req.headers["x-xray-client-secret"] as string | undefined;

    // Build per-request credential context
    const auth = credentialStore.resolveFromHeaders({ clientId, clientSecret });

    // D-33: Per-request server instance for credential isolation
    const server = createServer({ credentialOverride: auth });

    // Stateless transport: sessionIdGenerator undefined = no session tracking
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    // Clean up on response close to prevent resource leaks (Pitfall 3)
    res.on("close", async () => {
      await transport.close();
      await server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // MCP spec: GET and DELETE on /mcp return 405 in stateless mode
  app.get("/mcp", (_req: Request, res: Response) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });
  app.delete("/mcp", (_req: Request, res: Response) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

  return app;
}

/**
 * Starts the HTTP server. Called from src/index.ts when TRANSPORT=http.
 * Per D-38: Listens on port 3000 (configurable via PORT env var).
 */
export function startHttpServer(): void {
  const app = createHttpApp();
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, "0.0.0.0", () => {
    console.error(`xray-mcp HTTP server listening on port ${port}`);
  });
}
