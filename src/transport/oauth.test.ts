import { createHash, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../auth/AuthManager.js", async (orig) => {
  const mod = await orig<typeof import("../auth/AuthManager.js")>();
  return {
    ...mod,
    authManager: {
      getCloudToken: vi.fn(async (c: { xrayClientId: string }) => {
        if (c.xrayClientId === "bad") throw new Error("ERR:AUTH_INVALID_CRED");
        return "mock-xray-token";
      }),
    },
  };
});
vi.mock("../tools/index.js", () => ({}));

const INIT = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "t", version: "0" },
  },
});
const MCP_HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
};

async function startApp() {
  const { createHttpApp } = await import("./http.js");
  const server = createHttpApp().listen(0);
  const addr = server.address();
  const base = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
  return { base, close: () => new Promise<void>((r) => server.close(() => r())) };
}

describe("HTTP auth resolution (OAuth disabled)", () => {
  const env = { ...process.env };
  beforeEach(() => {
    delete process.env.OAUTH_ENCRYPTION_KEY;
    delete process.env.PUBLIC_URL;
    delete process.env.XRAY_CLIENT_ID;
    delete process.env.XRAY_CLIENT_SECRET;
    process.env.XRAY_CREDENTIAL_MODE = "strict";
    vi.resetModules();
  });
  afterEach(() => {
    process.env = { ...env };
  });

  it("POST /mcp without credentials is a JSON 401, not an HTML 500", async () => {
    const { base, close } = await startApp();
    try {
      const res = await fetch(`${base}/mcp`, { method: "POST", headers: MCP_HEADERS, body: INIT });
      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe("unauthorized");
    } finally {
      await close();
    }
  });

  it("fully-shared mode falls back to server env credentials", async () => {
    process.env.XRAY_CREDENTIAL_MODE = "fully-shared";
    process.env.XRAY_CLIENT_ID = "env-id";
    process.env.XRAY_CLIENT_SECRET = "env-secret";
    const { base, close } = await startApp();
    try {
      const res = await fetch(`${base}/mcp`, { method: "POST", headers: MCP_HEADERS, body: INIT });
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('"serverInfo"');
    } finally {
      await close();
    }
  });
});

describe("HTTP auth resolution (OAuth enabled)", () => {
  const env = { ...process.env };
  const REDIRECT = "https://claude.ai/api/mcp/auth_callback";
  beforeEach(() => {
    process.env.OAUTH_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    process.env.PUBLIC_URL = "https://xray-mcp.example.com";
    process.env.XRAY_CREDENTIAL_MODE = "strict";
    process.env.MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL = "true";
    vi.resetModules();
  });
  afterEach(() => {
    process.env = { ...env };
  });

  it("advertises OAuth discovery and challenges unauthenticated POST /mcp with 401 + WWW-Authenticate", async () => {
    const { base, close } = await startApp();
    try {
      const prm = await fetch(`${base}/.well-known/oauth-protected-resource/mcp`).then((r) =>
        r.json(),
      );
      expect(prm.resource).toBe("https://xray-mcp.example.com/mcp");
      expect(prm.authorization_servers).toEqual(["https://xray-mcp.example.com/"]);

      const as = await fetch(`${base}/.well-known/oauth-authorization-server`).then((r) =>
        r.json(),
      );
      expect(as.registration_endpoint).toBe("https://xray-mcp.example.com/register");
      expect(as.code_challenge_methods_supported).toEqual(["S256"]);

      const res = await fetch(`${base}/mcp`, { method: "POST", headers: MCP_HEADERS, body: INIT });
      expect(res.status).toBe(401);
      expect(res.headers.get("www-authenticate")).toContain("resource_metadata=");
    } finally {
      await close();
    }
  });

  it("headers still work when OAuth is enabled", async () => {
    const { base, close } = await startApp();
    try {
      const res = await fetch(`${base}/mcp`, {
        method: "POST",
        headers: { ...MCP_HEADERS, "x-xray-client-id": "hid", "x-xray-client-secret": "hs" },
        body: INIT,
      });
      expect(res.status).toBe(200);
    } finally {
      await close();
    }
  });

  it("full flow: register → authorize → login → token → POST /mcp with bearer", async () => {
    const { base, close } = await startApp();
    try {
      // Dynamic client registration
      const reg = await fetch(`${base}/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ redirect_uris: [REDIRECT], token_endpoint_auth_method: "none" }),
      });
      expect(reg.status).toBe(201);
      const { client_id } = await reg.json();

      // Authorize → login form
      const verifier = randomBytes(32).toString("base64url");
      const challenge = createHash("sha256").update(verifier).digest("base64url");
      const q = new URLSearchParams({
        response_type: "code",
        client_id,
        redirect_uri: REDIRECT,
        code_challenge: challenge,
        code_challenge_method: "S256",
        state: "st",
      });
      const form = await fetch(`${base}/authorize?${q}`);
      expect(form.status).toBe(200);
      const request = /name="request" value="([^"]+)"/.exec(await form.text())?.[1] as string;

      // Bad Xray creds → 401 form, no redirect
      const bad = await fetch(`${base}/authorize/login`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ request, state: "st", client_id: "bad", client_secret: "x" }),
        redirect: "manual",
      });
      expect(bad.status).toBe(401);

      // Good Xray creds → 302 to client with code
      const ok = await fetch(`${base}/authorize/login`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ request, state: "st", client_id: "good", client_secret: "s" }),
        redirect: "manual",
      });
      expect(ok.status).toBe(302);
      const loc = new URL(ok.headers.get("location") as string);
      expect(loc.searchParams.get("state")).toBe("st");
      const code = loc.searchParams.get("code") as string;

      // Token exchange with PKCE
      const tok = await fetch(`${base}/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id,
          code,
          code_verifier: verifier,
          redirect_uri: REDIRECT,
        }),
      });
      expect(tok.status).toBe(200);
      const tokens = await tok.json();
      expect(tokens.access_token).toBeTruthy();

      // Wrong verifier is rejected
      const badTok = await fetch(`${base}/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id,
          code,
          code_verifier: "wrong",
          redirect_uri: REDIRECT,
        }),
      });
      expect(badTok.status).toBe(400);

      // Bearer token reaches the MCP server
      const mcp = await fetch(`${base}/mcp`, {
        method: "POST",
        headers: { ...MCP_HEADERS, authorization: `Bearer ${tokens.access_token}` },
        body: INIT,
      });
      expect(mcp.status).toBe(200);
      expect(await mcp.text()).toContain('"serverInfo"');

      // Garbage bearer → 401
      const junk = await fetch(`${base}/mcp`, {
        method: "POST",
        headers: { ...MCP_HEADERS, authorization: "Bearer nope" },
        body: INIT,
      });
      expect(junk.status).toBe(401);
    } finally {
      await close();
    }
  });
});
