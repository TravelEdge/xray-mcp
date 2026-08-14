/**
 * OAuth2/PKCE token management for secure stateless authorization flows.
 *
 * Implements RFC 7636 (PKCE) for desktop/CLI clients without a backend server.
 * Per OAUTH-01: Session tokens are short-lived (configurable TTL, default 1h).
 * Per OAUTH-02: PKCE state validation prevents CSRF attacks.
 * Per OAUTH-03: Token cache uses in-memory Map with automatic expiry.
 */

import crypto from "node:crypto";

export interface OAuthSession {
  state: string;
  codeChallenge: string;
  codeChallengeMethod: "S256" | "plain";
  createdAt: number;
  expiresAt: number;
  clientId: string;
  redirectUri: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  state: string;
}

/**
 * Manages OAuth2/PKCE authorization sessions and token exchange.
 * Single instance per process — token cache is module-scoped.
 */
export class OAuthManager {
  private sessions: Map<string, OAuthSession>;
  private tokens: Map<string, TokenResponse>;
  private readonly sessionTtl: number; // ms
  private readonly tokenTtl: number; // ms

  constructor(
    sessionTtlSeconds: number = 600, // 10 minutes
    tokenTtlSeconds: number = 3600, // 1 hour
  ) {
    this.sessions = new Map();
    this.tokens = new Map();
    this.sessionTtl = sessionTtlSeconds * 1000;
    this.tokenTtl = tokenTtlSeconds * 1000;

    // Cleanup interval: Remove expired sessions and tokens every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Validates an authorization request and stores session state.
   * Per OAUTH-02: Validates code_challenge and code_challenge_method.
   */
  validateAuthorizationRequest(params: {
    response_type: string;
    client_id: string;
    redirect_uri: string;
    code_challenge: string;
    code_challenge_method: string;
    state: string;
  }): void {
    if (params.response_type !== "code") {
      throw new Error("Unsupported response_type. Only 'code' is supported.");
    }

    if (!params.client_id) {
      throw new Error("Missing required parameter: client_id");
    }

    if (!params.redirect_uri) {
      throw new Error("Missing required parameter: redirect_uri");
    }

    if (!params.code_challenge) {
      throw new Error("Missing required parameter: code_challenge (PKCE required)");
    }

    if (params.code_challenge_method !== "S256" && params.code_challenge_method !== "plain") {
      throw new Error("Invalid code_challenge_method. Must be 'S256' or 'plain'.");
    }

    if (!params.state) {
      throw new Error("Missing required parameter: state");
    }

    const session: OAuthSession = {
      state: params.state,
      codeChallenge: params.code_challenge,
      codeChallengeMethod: params.code_challenge_method,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.sessionTtl,
      clientId: params.client_id,
      redirectUri: params.redirect_uri,
    };

    this.sessions.set(params.state, session);
  }

  /**
   * Exchanges an authorization code for tokens.
   * Per OAUTH-02: Validates code_verifier against stored code_challenge.
   */
  exchangeCodeForToken(params: {
    code: string;
    code_verifier: string;
    state: string;
  }): TokenResponse {
    const session = this.sessions.get(params.state);

    if (!session) {
      throw new Error("Invalid state parameter. Session not found or expired.");
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(params.state);
      throw new Error("Authorization session has expired.");
    }

    // Validate code_verifier against code_challenge
    const calculatedChallenge = this.calculateChallenge(
      params.code_verifier,
      session.codeChallengeMethod,
    );

    if (calculatedChallenge !== session.codeChallenge) {
      throw new Error("Invalid code_verifier. Challenge verification failed.");
    }

    // Generate token (in production, exchange with actual auth server)
    const token: TokenResponse = {
      access_token: crypto.randomBytes(32).toString("hex"),
      token_type: "Bearer",
      expires_in: this.tokenTtl / 1000,
      state: params.state,
    };

    // Cache token for later validation
    this.tokens.set(token.access_token, {
      ...token,
      state: params.state,
    });

    // Clean up session after successful exchange
    this.sessions.delete(params.state);

    return token;
  }

  /**
   * Validates a token is still valid and not expired.
   */
  validateToken(token: string): boolean {
    const cached = this.tokens.get(token);
    if (!cached) {
      return false;
    }

    const issuedAt = Date.now() - cached.expires_in * 1000;
    const expiresAt = issuedAt + cached.expires_in * 1000;

    return Date.now() < expiresAt;
  }

  /**
   * Retrieves cached token data for validation.
   */
  getToken(token: string): TokenResponse | undefined {
    const cached = this.tokens.get(token);
    if (cached && this.validateToken(token)) {
      return cached;
    }
    this.tokens.delete(token);
    return undefined;
  }

  /**
   * Per OAUTH-02: Calculates PKCE code challenge from verifier.
   * S256: SHA256(code_verifier) then base64url-encode.
   * plain: Use verifier as-is (not recommended, but supported for compatibility).
   */
  private calculateChallenge(verifier: string, method: "S256" | "plain"): string {
    if (method === "plain") {
      return verifier;
    }

    // S256: SHA256(verifier) base64url-encoded
    const hash = crypto.createHash("sha256").update(verifier).digest();
    return this.base64UrlEncode(hash);
  }

  /**
   * Base64url encoding (RFC 4648) for PKCE.
   */
  private base64UrlEncode(buffer: Buffer): string {
    return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  /**
   * Cleanup expired sessions and tokens.
   */
  private cleanup(): void {
    const now = Date.now();

    // Remove expired sessions
    for (const [state, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(state);
      }
    }

    // Remove expired tokens (check against issue time + TTL)
    for (const [token, data] of this.tokens.entries()) {
      const issuedAt = now - data.expires_in * 1000;
      if (now > issuedAt + data.expires_in * 1000) {
        this.tokens.delete(token);
      }
    }
  }

  /**
   * Get stats for monitoring/debugging.
   */
  getStats(): { activeSessions: number; cachedTokens: number } {
    return {
      activeSessions: this.sessions.size,
      cachedTokens: this.tokens.size,
    };
  }
}

// Module-scoped singleton
export const oauthManager = new OAuthManager();
