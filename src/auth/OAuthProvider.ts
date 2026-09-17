import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import {
  InvalidGrantError,
  InvalidTokenError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type {
  AuthorizationParams,
  OAuthServerProvider,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { Response } from "express";

/**
 * Stateless OAuth 2.1 provider that lets MCP clients (Claude, ChatGPT, Copilot, ...)
 * sign in with the user's own Xray API key pair.
 *
 * Nothing is stored server-side. Every artifact the server hands out — client_id,
 * authorization code, access token, refresh token — is an AES-256-GCM sealed blob
 * that the server alone can open. Any replica with the same key can serve any token,
 * and a pod restart loses nothing.
 *
 * ponytail: no per-token revocation without a store. Levers today: delete the user's
 * Xray key (every call fails) or rotate OAUTH_ENCRYPTION_KEY (everyone re-logs in).
 * Upgrade path: Redis denylist keyed on `jti`, which every token already carries.
 */

const ACCESS_TTL_S = 24 * 60 * 60;
const REFRESH_TTL_S = 30 * 24 * 60 * 60;
const CODE_TTL_S = 10 * 60;
const CLIENT_TTL_S = 365 * 24 * 60 * 60;

type Sealed =
  | { t: "client"; redirect_uris: string[]; client_secret?: string }
  | { t: "login"; client_id: string; redirect_uri: string; challenge: string }
  | {
      t: "code";
      cid: string;
      cs: string;
      client_id: string;
      redirect_uri: string;
      challenge: string;
    }
  | { t: "access" | "refresh"; cid: string; cs: string; client_id: string };

type SealedWithMeta = Sealed & { exp: number; jti: string };

/** Verifies an Xray client id/secret pair. Throws on failure. */
export type XrayCredentialCheck = (clientId: string, clientSecret: string) => Promise<void>;

export class OAuthProvider implements OAuthServerProvider {
  private readonly key: Buffer;

  constructor(
    encryptionKeyBase64: string,
    private readonly checkCredentials: XrayCredentialCheck,
    /** Offer "continue with shared access" on the sign-in page (shared-reads / fully-shared). */
    private readonly allowShared = false,
  ) {
    this.key = Buffer.from(encryptionKeyBase64, "base64");
    if (this.key.length !== 32) {
      throw new Error("OAUTH_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
    }
  }

  // --- sealing -------------------------------------------------------------

  seal(payload: Sealed, ttlSeconds: number): string {
    const body: SealedWithMeta = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
      jti: randomBytes(8).toString("hex"),
    };
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ct = Buffer.concat([cipher.update(JSON.stringify(body), "utf8"), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64url");
  }

  unseal<T extends Sealed["t"]>(token: string, type: T): (SealedWithMeta & { t: T }) | null {
    try {
      const buf = Buffer.from(token, "base64url");
      const decipher = createDecipheriv("aes-256-gcm", this.key, buf.subarray(0, 12));
      decipher.setAuthTag(buf.subarray(12, 28));
      const pt = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]);
      const body = JSON.parse(pt.toString("utf8")) as SealedWithMeta;
      if (body.t !== type || body.exp < Math.floor(Date.now() / 1000)) return null;
      return body as SealedWithMeta & { t: T };
    } catch {
      return null;
    }
  }

  // --- clients (dynamic registration, stateless) --------------------------

  get clientsStore(): OAuthRegisteredClientsStore {
    return {
      getClient: (clientId) => {
        const c = this.unseal(clientId, "client");
        if (!c) return undefined;
        return {
          client_id: clientId,
          client_secret: c.client_secret,
          redirect_uris: c.redirect_uris,
          token_endpoint_auth_method: c.client_secret ? "client_secret_post" : "none",
        };
      },
      registerClient: (client) => {
        const client_id = this.seal(
          { t: "client", redirect_uris: client.redirect_uris, client_secret: client.client_secret },
          CLIENT_TTL_S,
        );
        return {
          ...client,
          client_id,
          client_id_issued_at: Math.floor(Date.now() / 1000),
          client_secret_expires_at: 0,
        };
      },
    };
  }

  // --- authorization -------------------------------------------------------

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    const request = this.seal(
      {
        t: "login",
        client_id: client.client_id,
        redirect_uri: params.redirectUri,
        challenge: params.codeChallenge,
      },
      CODE_TTL_S,
    );
    res
      .status(200)
      .type("html")
      .send(loginPage(request, params.state, undefined, this.allowShared));
  }

  /**
   * Handles the login form POST. Validates the Xray key pair against Xray, then
   * redirects back to the client with an authorization code.
   */
  async login(
    body: {
      request?: string;
      state?: string;
      client_id?: string;
      client_secret?: string;
      shared?: string;
    },
    res: Response,
  ): Promise<void> {
    const req = body.request ? this.unseal(body.request, "login") : null;
    if (!req) {
      res
        .status(400)
        .type("html")
        .send(
          loginPage(
            "",
            body.state,
            "Login session expired — start again from your MCP client.",
            this.allowShared,
          ),
        );
      return;
    }
    // Shared access: token carries no key; the server uses its own (read-only in shared-reads).
    const shared = this.allowShared && body.shared === "1";
    const cid = shared ? "" : (body.client_id ?? "").trim();
    const cs = shared ? "" : (body.client_secret ?? "").trim();
    if (!shared) {
      try {
        if (!cid || !cs) throw new Error("missing");
        await this.checkCredentials(cid, cs);
      } catch {
        res
          .status(401)
          .type("html")
          .send(
            loginPage(
              body.request ?? "",
              body.state,
              "Xray rejected those credentials. Check the Client ID and Secret.",
              this.allowShared,
            ),
          );
        return;
      }
    }
    const code = this.seal(
      {
        t: "code",
        cid,
        cs,
        client_id: req.client_id,
        redirect_uri: req.redirect_uri,
        challenge: req.challenge,
      },
      CODE_TTL_S,
    );
    const target = new URL(req.redirect_uri);
    target.searchParams.set("code", code);
    if (body.state) target.searchParams.set("state", body.state);
    res.redirect(302, target.href);
  }

  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const code = this.unseal(authorizationCode, "code");
    if (!code || code.client_id !== client.client_id) {
      throw new InvalidGrantError("Invalid authorization code");
    }
    return code.challenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
  ): Promise<OAuthTokens> {
    // ponytail: codes are single-use only by TTL (10 min) + PKCE, not by a store.
    const code = this.unseal(authorizationCode, "code");
    if (!code || code.client_id !== client.client_id) {
      throw new InvalidGrantError("Invalid authorization code");
    }
    if (redirectUri && redirectUri !== code.redirect_uri) {
      throw new InvalidGrantError("redirect_uri mismatch");
    }
    return this.issueTokens(code.cid, code.cs, client.client_id);
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
  ): Promise<OAuthTokens> {
    const rt = this.unseal(refreshToken, "refresh");
    if (!rt || rt.client_id !== client.client_id) {
      throw new InvalidGrantError("Invalid refresh token");
    }
    return this.issueTokens(rt.cid, rt.cs, client.client_id);
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const at = this.unseal(token, "access");
    if (!at) throw new InvalidTokenError("Invalid or expired access token");
    return {
      token,
      clientId: at.client_id,
      scopes: [],
      expiresAt: at.exp,
      extra: { xrayClientId: at.cid, xrayClientSecret: at.cs },
    };
  }

  private issueTokens(cid: string, cs: string, client_id: string): OAuthTokens {
    return {
      access_token: this.seal({ t: "access", cid, cs, client_id }, ACCESS_TTL_S),
      token_type: "bearer",
      expires_in: ACCESS_TTL_S,
      refresh_token: this.seal({ t: "refresh", cid, cs, client_id }, REFRESH_TTL_S),
    };
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function loginPage(
  request: string,
  state: string | undefined,
  error?: string,
  allowShared = false,
): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in to Xray</title>
<style>body{font:15px/1.5 system-ui,sans-serif;background:#f4f5f7;margin:0;display:grid;place-items:center;min-height:100vh}
form{background:#fff;padding:2rem;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.12);width:min(92vw,380px)}
h1{font-size:1.25rem;margin:0 0 .25rem}p{margin:0 0 1rem;color:#555}label{display:block;font-weight:600;margin-top:1rem}
input{width:100%;box-sizing:border-box;padding:.5rem;margin-top:.25rem;border:1px solid #ccc;border-radius:4px;font:inherit}
button{margin-top:1.5rem;width:100%;padding:.6rem;border:0;border-radius:4px;background:#0052cc;color:#fff;font:inherit;font-weight:600}
.err{background:#ffebe6;color:#bf2600;padding:.5rem .75rem;border-radius:4px;margin-bottom:.5rem}
.or{text-align:center;color:#888;margin:1rem 0 0}.alt{background:#fff;color:#0052cc;border:1px solid #0052cc;margin-top:.5rem}</style></head><body>
<form method="post" action="/authorize/login" autocomplete="off">
<h1>Sign in to Xray</h1><p>Use your personal Xray Cloud API key. Actions in Xray will be attributed to you.</p>
${error ? `<div class="err">${esc(error)}</div>` : ""}
<input type="hidden" name="request" value="${esc(request)}"><input type="hidden" name="state" value="${esc(state ?? "")}">
<label>Client ID<input name="client_id" required autofocus></label>
<label>Client Secret<input name="client_secret" type="password" required></label>
<button type="submit">Connect</button>
${allowShared ? `<p class="or">or</p><button type="submit" name="shared" value="1" class="alt" formnovalidate>Continue with shared access (read-only)</button>` : ""}
</form></body></html>`;
}
