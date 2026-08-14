import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import { authManager, CredentialStore } from "../auth/index.js";
import { oauthManager } from "../auth/OAuthManager.js";
import { createServer } from "./createServer.js";
import { createCacheHeadersMiddleware, createCompressionMiddleware } from "./performance.js";
import {
  createCorsMiddleware,
  createErrorHandlingMiddleware,
  createRateLimitMiddleware,
  createRequestLoggingMiddleware,
  createSecurityHeadersMiddleware,
} from "./security.js";
import { mountRestApi } from "./restapi.js";

/**
 * Creates the Express HTTP app for Streamable HTTP MCP transport.
 *
 * Per D-30: Uses createMcpExpressApp from MCP SDK for DNS rebinding protection.
 * Per D-33: Each POST /mcp creates a new McpServer for credential isolation.
 * Per D-31: Credentials extracted from X-Xray-Client-Id / X-Xray-Client-Secret headers.
 * Per D-32: Region is server-wide via XRAY_REGION env var only.
 * Per SEC-04, SEC-05: CORS policy, CSP headers, rate limiting, security headers.
 */
export function createHttpApp() {
  const allowedHostsRaw = process.env.ALLOWED_HOSTS;
  const allowedHosts = allowedHostsRaw
    ? allowedHostsRaw.split(",").map((h) => h.trim())
    : undefined;
  const app = createMcpExpressApp({ host: "0.0.0.0", allowedHosts });

  // SEC-02: Rate limiting (100 requests per 60 seconds per IP)
  app.use(createRateLimitMiddleware(60 * 1000, 100));

  // OBJ-03: Request logging with correlation IDs
  app.use(createRequestLoggingMiddleware());

  // PERF-01: Response compression
  app.use(createCompressionMiddleware());

  // PERF-02: Cache headers for read operations
  app.use(createCacheHeadersMiddleware());

  // SEC-04: CORS policy
  const corsOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(",") || [];
  app.use(createCorsMiddleware(corsOrigins));

  // SEC-05: Security headers (CSP, HSTS, X-Frame-Options, etc.)
  app.use(createSecurityHeadersMiddleware());

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

  // OAUTH-01, OAUTH-02: OAuth2/PKCE authorization endpoint
  // Per RFC 7636: Initiates authorization flow with PKCE code_challenge validation
  app.get("/authorize", (req: Request, res: Response) => {
    try {
      const {
        response_type,
        client_id,
        redirect_uri,
        code_challenge,
        code_challenge_method,
        state,
      } = req.query;

      // Validate required parameters
      if (
        !response_type ||
        !client_id ||
        !redirect_uri ||
        !code_challenge ||
        !code_challenge_method ||
        !state
      ) {
        return res.status(400).json({
          error: "invalid_request",
          error_description: "Missing required OAuth2 parameters",
          state,
        });
      }

      oauthManager.validateAuthorizationRequest({
        response_type: response_type as string,
        client_id: client_id as string,
        redirect_uri: redirect_uri as string,
        code_challenge: code_challenge as string,
        code_challenge_method: code_challenge_method as string,
        state: state as string,
      });

      // In a real OAuth2 server, this would show a user login/consent screen.
      // For now, generate an authorization code.
      const authCode = Buffer.from(`${Date.now()}-${Math.random()}`).toString("base64");

      // Redirect back to client with authorization code
      const callbackUrl = new URL(redirect_uri as string);
      callbackUrl.searchParams.set("code", authCode);
      callbackUrl.searchParams.set("state", state as string);

      res.redirect(callbackUrl.toString());
    } catch (error) {
      const state = req.query.state as string | undefined;
      res.status(400).json({
        error: "invalid_request",
        error_description: error instanceof Error ? error.message : "Authorization request failed",
        state,
      });
    }
  });

  // OAUTH-01, OAUTH-02: OAuth2 token exchange endpoint
  // Per RFC 7636: Exchanges authorization code + code_verifier for access token
  app.post("/token", (req: Request, res: Response) => {
    try {
      const { code, code_verifier, state, grant_type } = req.body;

      if (!grant_type || grant_type !== "authorization_code") {
        return res.status(400).json({
          error: "unsupported_grant_type",
          error_description: "Only 'authorization_code' grant type is supported",
        });
      }

      if (!code || !code_verifier || !state) {
        return res.status(400).json({
          error: "invalid_request",
          error_description: "Missing required parameters: code, code_verifier, state",
        });
      }

      const token = oauthManager.exchangeCodeForToken({ code, code_verifier, state });

      res.json(token);
    } catch (error) {
      res.status(400).json({
        error: "invalid_grant",
        error_description: error instanceof Error ? error.message : "Token exchange failed",
      });
    }
  });

  // OAUTH-03: Token validation endpoint (internal use)
  app.post("/validate-token", (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "invalid_token",
          error_description: "Missing or invalid Authorization header",
        });
      }

      const token = authHeader.slice(7);
      const isValid = oauthManager.validateToken(token);

      if (!isValid) {
        return res.status(401).json({
          error: "invalid_token",
          error_description: "Token is invalid or expired",
        });
      }

      const tokenData = oauthManager.getToken(token);
      res.json({
        valid: true,
        token_type: tokenData?.token_type || "Bearer",
        expires_in: tokenData?.expires_in || 3600,
      });
    } catch (error) {
      res.status(500).json({
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Token validation failed",
      });
    }
  });

  // OAUTH-01: OAuth2 metadata endpoint (discovery)
  // Per RFC 8414: Provides authorization server metadata
  app.get("/.well-known/oauth-server-metadata", (_req: Request, res: Response) => {
    const baseUrl = `${_req.protocol}://${_req.get("host")}`;
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/authorize`,
      token_endpoint: `${baseUrl}/token`,
      revocation_endpoint: `${baseUrl}/revoke`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256", "plain"],
      token_endpoint_auth_methods_supported: ["none"],
    });
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

  // RESTAPI-01, RESTAPI-02, RESTAPI-03: Mount REST API for external integrations
  mountRestApi(app);

  // OBJ-02: Error handling middleware — must be last
  app.use(createErrorHandlingMiddleware());

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
