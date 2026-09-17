import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import {
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthRouter,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { type NextFunction, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { authManager, CredentialStore, OAuthProvider } from "../auth/index.js";
import type { AuthContext } from "../types/index.js";
import { createServer } from "./createServer.js";

/**
 * Creates the Express HTTP app for Streamable HTTP MCP transport.
 *
 * Per D-30: Uses createMcpExpressApp from MCP SDK for DNS rebinding protection.
 * Per D-33: Each POST /mcp creates a new McpServer for credential isolation.
 * Per D-32: Region is server-wide via XRAY_REGION env var only.
 *
 * Credentials for a request are resolved, in order:
 *   1. OAuth bearer token (when PUBLIC_URL + OAUTH_ENCRYPTION_KEY are set) — the
 *      user's own Xray key pair, sealed inside the token at login.
 *   2. X-Xray-Client-Id / X-Xray-Client-Secret headers (D-31).
 *   3. Server env credentials, in shared-reads / fully-shared modes (source "shared" —
 *      WriteGuard denies writes on these in shared-reads).
 * Otherwise 401 — with OAuth discovery headers when OAuth is enabled.
 */
export function createHttpApp() {
  const allowedHostsRaw = process.env.ALLOWED_HOSTS;
  const allowedHosts = allowedHostsRaw
    ? allowedHostsRaw.split(",").map((h) => h.trim())
    : undefined;
  const app = createMcpExpressApp({ host: "0.0.0.0", allowedHosts });
  // Behind a load balancer / gateway: rate limiters must key on the client IP from
  // X-Forwarded-For, not the proxy's. Number of trusted hops; harmless with no proxy.
  app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));

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

  const oauth = createOAuthProvider();
  const region = () =>
    (process.env.XRAY_REGION || "global") as AuthContext["credentials"]["xrayRegion"];

  if (oauth) {
    const publicUrl = new URL(process.env.PUBLIC_URL as string);
    app.use(
      mcpAuthRouter({
        provider: oauth,
        issuerUrl: publicUrl,
        resourceServerUrl: new URL("/mcp", publicUrl),
        resourceName: "Xray MCP",
      }),
    );
    // Login form target. Rate-limited: it forwards guesses to Xray's /authenticate.
    app.post(
      "/authorize/login",
      rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }),
      express.urlencoded({ extended: false }),
      (req: Request, res: Response) => oauth.login(req.body, res),
    );
  }

  // Resolve credentials for POST /mcp. Sets res.locals.xrayAuth or ends the response.
  const resolveAuth = (req: Request, res: Response, next: NextFunction) => {
    const credentialStore = new CredentialStore();
    const clientId = req.headers["x-xray-client-id"] as string | undefined;
    const clientSecret = req.headers["x-xray-client-secret"] as string | undefined;
    const hasBearer = /^bearer /i.test(req.headers.authorization ?? "");

    if (oauth && (hasBearer || !clientId)) {
      if (!hasBearer && credentialStore.allowsShared()) {
        res.locals.xrayAuth = credentialStore.resolveShared();
        return next();
      }
      return requireBearerAuth({
        verifier: oauth,
        resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(
          new URL("/mcp", process.env.PUBLIC_URL),
        ),
      })(req, res, () => {
        const extra = req.auth?.extra as { xrayClientId: string; xrayClientSecret: string };
        // Token issued via "continue with shared access" carries no key.
        if (!extra.xrayClientId) {
          if (!credentialStore.allowsShared()) {
            res.status(401).json({
              error: "unauthorized",
              message: "Shared access is disabled; reconnect with your own Xray API key",
            });
            return;
          }
          res.locals.xrayAuth = credentialStore.resolveShared();
          return next();
        }
        res.locals.xrayAuth = {
          credentials: {
            xrayClientId: extra.xrayClientId,
            xrayClientSecret: extra.xrayClientSecret,
            xrayRegion: region(),
          },
          source: "oauth",
        };
        next();
      });
    }

    if (!clientId && credentialStore.allowsShared()) {
      res.locals.xrayAuth = credentialStore.resolveShared();
      return next();
    }
    try {
      res.locals.xrayAuth = credentialStore.resolveFromHeaders({ clientId, clientSecret });
      next();
    } catch (err) {
      res
        .status(401)
        .json({ error: "unauthorized", message: err instanceof Error ? err.message : String(err) });
    }
  };

  // TRNS-02, TRNS-03: Stateless per-request MCP handler
  app.post("/mcp", resolveAuth, async (req: Request, res: Response) => {
    // D-33: Per-request server instance for credential isolation
    const server = createServer({ credentialOverride: res.locals.xrayAuth as AuthContext });

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

/** OAuth is on iff PUBLIC_URL and OAUTH_ENCRYPTION_KEY are both set. */
function createOAuthProvider(): OAuthProvider | undefined {
  const key = process.env.OAUTH_ENCRYPTION_KEY;
  const publicUrl = process.env.PUBLIC_URL;
  if (!key || !publicUrl) return undefined;
  const region = (process.env.XRAY_REGION || "global") as AuthContext["credentials"]["xrayRegion"];
  return new OAuthProvider(
    key,
    async (xrayClientId, xrayClientSecret) => {
      await authManager.getCloudToken({ xrayClientId, xrayClientSecret, xrayRegion: region });
    },
    new CredentialStore().allowsShared(),
  );
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
