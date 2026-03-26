import type { AuthContext, CredentialMode, XrayRegion } from "../types/index.js";
import { XrayAuthError } from "../types/index.js";

/**
 * Resolves Xray credentials from environment variables.
 *
 * All env vars use the XRAY_ prefix per D-08:
 * - XRAY_CLIENT_ID: Xray Cloud client ID (required)
 * - XRAY_CLIENT_SECRET: Xray Cloud client secret (required)
 * - XRAY_REGION: Target region (optional, defaults to "global")
 * - XRAY_CREDENTIAL_MODE: Credential sharing mode (optional, defaults to "strict")
 *
 * Lazy validation per D-10 — credentials are only validated when first needed,
 * not at server startup.
 */
export class CredentialStore {
  /**
   * Resolves credentials from environment variables.
   * Throws XrayAuthError with actionable hints if required vars are missing.
   */
  resolveFromEnv(): AuthContext {
    const clientId = process.env.XRAY_CLIENT_ID;
    const clientSecret = process.env.XRAY_CLIENT_SECRET;
    const regionRaw = process.env.XRAY_REGION;
    const region = (regionRaw || "global") as XrayRegion;

    if (!clientId) {
      throw new XrayAuthError(
        "ERR:AUTH_MISSING_CRED No client ID\n-> Set XRAY_CLIENT_ID environment variable",
      );
    }

    if (!clientSecret) {
      throw new XrayAuthError(
        "ERR:AUTH_MISSING_CRED No client secret\n-> Set XRAY_CLIENT_SECRET environment variable",
      );
    }

    return {
      credentials: {
        xrayClientId: clientId,
        xrayClientSecret: clientSecret,
        xrayRegion: region,
      },
      source: "env",
    };
  }

  /**
   * Resolves credentials from HTTP request headers.
   * Used in HTTP transport mode for per-request credential isolation (D-31).
   *
   * Headers:
   * - X-Xray-Client-Id: Xray Cloud client ID (required)
   * - X-Xray-Client-Secret: Xray Cloud client secret (required)
   * - Region is server-wide via XRAY_REGION env var only (D-32)
   */
  resolveFromHeaders(headers: { clientId?: string; clientSecret?: string }): AuthContext {
    const { clientId, clientSecret } = headers;
    const region = (process.env.XRAY_REGION || "global") as XrayRegion;

    if (!clientId) {
      throw new XrayAuthError(
        "ERR:AUTH_MISSING_CRED No client ID in request headers\n-> Set X-Xray-Client-Id header",
      );
    }
    if (!clientSecret) {
      throw new XrayAuthError(
        "ERR:AUTH_MISSING_CRED No client secret in request headers\n-> Set X-Xray-Client-Secret header",
      );
    }

    return {
      credentials: { xrayClientId: clientId, xrayClientSecret: clientSecret, xrayRegion: region },
      source: "header",
    };
  }

  /**
   * Returns the configured credential mode from XRAY_CREDENTIAL_MODE env var.
   * Defaults to "strict" if not set.
   * Throws XrayAuthError for invalid values.
   */
  getCredentialMode(): CredentialMode {
    const raw = process.env.XRAY_CREDENTIAL_MODE || "strict";

    if (!["strict", "shared-reads", "fully-shared"].includes(raw)) {
      throw new XrayAuthError(
        `ERR:AUTH_INVALID_MODE Invalid credential mode: ${raw}\n-> Use strict, shared-reads, or fully-shared`,
      );
    }

    return raw as CredentialMode;
  }
}
