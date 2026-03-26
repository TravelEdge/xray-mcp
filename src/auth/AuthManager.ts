import type { CloudCredentials, XrayRegion } from "../types/index.js";
import { XrayAuthError, XrayHttpError } from "../types/index.js";

/**
 * Resolves the Xray Cloud base URL for a given region.
 * Exported as a standalone utility — also used by the HTTP transport and GraphQL client.
 */
export function resolveBaseUrl(region: XrayRegion): string {
  switch (region) {
    case "us":
      return "https://us.xray.cloud.getxray.app";
    case "eu":
      return "https://eu.xray.cloud.getxray.app";
    case "au":
      return "https://au.xray.cloud.getxray.app";
    default:
      return "https://xray.cloud.getxray.app";
  }
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

/**
 * Manages JWT authentication with Xray Cloud API.
 * Caches tokens per client_id and deduplicates concurrent authentication requests.
 *
 * Design decisions:
 * - Module-scope singleton (authManager) so the token cache survives across tool calls
 * - Promise deduplication (inFlight map) prevents thundering herd on concurrent requests
 * - Token refreshed 50 min before 24h expiry to avoid mid-request expiry
 *
 * @example
 * ```typescript
 * const auth = new AuthManager();
 * const token = await auth.getCloudToken({ xrayClientId: "id", xrayClientSecret: "secret", xrayRegion: "global" });
 * // Token is cached — subsequent calls return cached value until expiry
 * ```
 */
export class AuthManager {
  /** Cached tokens keyed by xrayClientId */
  private tokenCache = new Map<string, CachedToken>();

  /** In-flight auth requests keyed by xrayClientId — deduplicates concurrent calls */
  private inFlight = new Map<string, Promise<string>>();

  /** Refresh buffer: 50 minutes before expiry, trigger a new auth */
  private readonly REFRESH_BUFFER_MS = 50 * 60 * 1000;

  /** Maximum retries for rate-limited (429) responses */
  private readonly MAX_RETRIES = 3;

  /** Maximum backoff delay in milliseconds */
  private readonly MAX_BACKOFF_MS = 30_000;

  /**
   * Returns a valid JWT for the given credentials.
   * - Returns cached token if still fresh (more than 50 min before expiry)
   * - Deduplicates concurrent calls via in-flight promise map
   */
  async getCloudToken(creds: CloudCredentials): Promise<string> {
    const key = creds.xrayClientId;

    // Return cached token if still fresh
    const cached = this.tokenCache.get(key);
    if (cached && Date.now() < cached.expiresAt - this.REFRESH_BUFFER_MS) {
      return cached.token;
    }

    // Deduplicate concurrent requests — return existing in-flight promise
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    // Start new auth request and store in inFlight map
    const promise = this._fetchToken(creds).finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Fetches a new token from the Xray Cloud authenticate endpoint.
   * Implements exponential backoff retry for 429 responses (max 3 retries, 30s cap).
   */
  private async _fetchToken(creds: CloudCredentials): Promise<string> {
    const baseUrl = resolveBaseUrl(creds.xrayRegion);
    const url = `${baseUrl}/api/v2/authenticate`;

    let attempt = 0;

    while (true) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: creds.xrayClientId,
          client_secret: creds.xrayClientSecret,
        }),
      });

      if (response.status === 429) {
        if (attempt >= this.MAX_RETRIES) {
          throw new XrayHttpError(
            429,
            `ERR:RATE_LIMITED Auth rate limit exceeded after ${this.MAX_RETRIES} retries\n-> Rate limit exceeded, retry after 30s`,
          );
        }
        // Exponential backoff: 1s, 2s, 4s... capped at 30s
        const delay = Math.min(1000 * 2 ** attempt, this.MAX_BACKOFF_MS);
        await this._sleep(delay);
        attempt++;
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        throw new XrayAuthError(
          `ERR:AUTH_FAILED ${response.status} -> Check XRAY_CLIENT_ID and XRAY_CLIENT_SECRET are valid`,
        );
      }

      if (!response.ok) {
        throw new XrayHttpError(
          response.status,
          `ERR:HTTP_ERROR ${response.status} -> Unexpected error from Xray API`,
        );
      }

      // Xray returns a JSON-quoted string: "\"jwt-token-here\""
      const raw = await response.text();
      const token = raw.replace(/"/g, "");

      // Cache with 24h TTL
      this.tokenCache.set(creds.xrayClientId, {
        token,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });

      return token;
    }
  }

  /** Promisified sleep — extracted so tests can intercept via fake timers */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/** Module-scope singleton — cache survives request boundaries in both stdio and HTTP modes */
export const authManager = new AuthManager();
