import { XrayAuthError, XrayHttpError } from "../types/index.js";

/**
 * HTTP client wrapper providing authenticated requests to Xray Cloud REST and GraphQL APIs.
 *
 * Features:
 * - Automatic retry with exponential backoff for 429 rate limit responses (max 3 retries, 30s cap)
 * - Throws XrayAuthError on 401/403 responses
 * - Throws XrayHttpError on other non-2xx responses
 * - Supports JSON, raw string, and text response modes
 */
export class HttpClient {
  private readonly maxRetries = 3;
  private readonly maxBackoffMs = 30_000;

  /** Private retry loop extracted to DRY up request, requestRaw, and requestText.
   *  Handles 429 rate limit retry with exponential backoff, 401/403 auth errors,
   *  and generic HTTP errors. Caller provides the fetch call and response handler.
   */
  private async _retryLoop<T>(
    fetchFn: () => Promise<Response>,
    handleResponse: (res: Response) => Promise<T>,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(1000 * 2 ** (attempt - 1), this.maxBackoffMs);
        await this._sleep(delay);
      }

      const res = await fetchFn();

      if (res.status === 429) {
        lastError = new XrayHttpError(
          429,
          `ERR:RATE_LIMITED 429 Too Many Requests (attempt ${attempt + 1}/${this.maxRetries + 1})\n-> Rate limit exceeded, retry after backoff`,
        );
        continue;
      }

      if (res.status === 401 || res.status === 403) {
        const text = await res.text().catch(() => "");
        throw new XrayAuthError(`ERR:AUTH_${res.status} ${res.statusText}: ${text}`);
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new XrayHttpError(res.status, `ERR:HTTP_${res.status} ${res.statusText}: ${text}`);
      }

      return handleResponse(res);
    }

    throw (
      lastError ??
      new XrayHttpError(
        429,
        "ERR:RATE_LIMITED 429 Too Many Requests\n-> Rate limit exceeded after all retries",
      )
    );
  }

  /**
   * Sends an authenticated HTTP request and parses the JSON response.
   *
   * @param url - Full URL to request.
   * @param options - Request options including method, bearer token, optional body and headers.
   * @returns Parsed JSON response body typed as T.
   * @throws {XrayAuthError} On 401/403 responses.
   * @throws {XrayHttpError} On non-2xx responses (excluding 429 which triggers retry).
   */
  async request<T>(
    url: string,
    options: {
      method: string;
      token: string;
      body?: unknown;
      headers?: Record<string, string>;
    },
  ): Promise<T> {
    return this._retryLoop(
      () =>
        fetch(url, {
          method: options.method,
          headers: {
            Authorization: `Bearer ${options.token}`,
            "Content-Type": "application/json",
            ...options.headers,
          },
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        }),
      (res) => res.json() as Promise<T>,
    );
  }

  /**
   * Sends an authenticated HTTP request with a raw string body and parses the JSON response.
   * Used by REST import tools (XML, multipart). Body type is string only — no FormData.
   * Multipart bodies are constructed via buildMultipartBody() helper.
   *
   * @param url - Full URL to request.
   * @param options - Request options including method, bearer token, raw body string, and content type.
   * @returns Parsed JSON response body typed as T.
   * @throws {XrayAuthError} On 401/403 responses.
   * @throws {XrayHttpError} On non-2xx responses.
   */
  async requestRaw<T>(
    url: string,
    options: {
      method: string;
      token: string;
      body: string;
      contentType: string;
      headers?: Record<string, string>;
    },
  ): Promise<T> {
    return this._retryLoop(
      () => {
        const fetchHeaders: Record<string, string> = {
          Authorization: `Bearer ${options.token}`,
          "Content-Type": options.contentType,
          ...options.headers,
        };
        return fetch(url, { method: options.method, headers: fetchHeaders, body: options.body });
      },
      (res) => res.json() as Promise<T>,
    );
  }

  /**
   * Sends an authenticated HTTP request and returns the raw text response body.
   * Used for Cucumber feature export (returns .feature file content as text).
   *
   * @param url - Full URL to request.
   * @param options - Request options including method, bearer token, and optional headers.
   * @returns Response body as a string.
   * @throws {XrayAuthError} On 401/403 responses.
   * @throws {XrayHttpError} On non-2xx responses.
   */
  async requestText(
    url: string,
    options: {
      method: string;
      token: string;
      headers?: Record<string, string>;
    },
  ): Promise<string> {
    return this._retryLoop(
      () =>
        fetch(url, {
          method: options.method,
          headers: { Authorization: `Bearer ${options.token}`, ...options.headers },
        }),
      (res) => res.text(),
    );
  }

  // Extracted for test mocking
  protected async _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
