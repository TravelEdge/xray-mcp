import type { GraphQLResponse } from "../types/index.js";
import { XrayGqlError } from "../types/index.js";
import type { HttpClient } from "./HttpClient.js";
import type { XrayClient } from "./XrayClientInterface.js";

/**
 * Client for the Xray Cloud API supporting both GraphQL and REST v2 endpoints.
 *
 * All GraphQL queries MUST use parameterized variables (GQL-01) — never string interpolation.
 * Token acquisition is delegated to the injected `getToken` factory (typically `authManager.getCloudToken`).
 */
export class XrayCloudClient implements XrayClient {
  private readonly graphqlEndpoint: string;
  private readonly restBaseUrl: string;

  /**
   * @param httpClient - Underlying HTTP client with retry and auth error handling.
   * @param getToken - Factory function that returns a valid JWT for the current request.
   * @param baseUrl - Xray Cloud regional base URL (defaults to global endpoint).
   */
  constructor(
    private readonly httpClient: HttpClient,
    private readonly getToken: () => Promise<string>,
    baseUrl: string = "https://xray.cloud.getxray.app",
  ) {
    this.graphqlEndpoint = `${baseUrl}/api/v2/graphql`;
    this.restBaseUrl = `${baseUrl}/api/v2`;
  }

  /**
   * Executes a GraphQL query or mutation against the Xray Cloud GraphQL endpoint.
   * ALWAYS use parameterized variables — never interpolate user input into query strings (GQL-01).
   *
   * @param query - GraphQL query or mutation document string.
   * @param variables - Optional parameterized variables object.
   * @returns Parsed GraphQL data typed as T.
   * @throws {XrayGqlError} When the response contains errors without usable data.
   * @throws {XrayAuthError} On authentication failures.
   */
  async executeGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const token = await this.getToken();
    // GQL-01: ALWAYS parameterized variables — never string interpolation
    const body: { query: string; variables?: Record<string, unknown> } = { query };
    if (variables !== undefined) {
      body.variables = variables;
    }

    const response = await this.httpClient.request<GraphQLResponse<T>>(this.graphqlEndpoint, {
      method: "POST",
      token,
      body,
    });

    // GQL-03: Parse and surface GraphQL errors
    if (response.errors?.length) {
      if (!response.data) {
        // Full error — no usable data
        throw new XrayGqlError(response.errors);
      }
      // D-07: Partial success — return data even when errors are present
      // Callers can inspect the raw response if needed
    }

    if (!response.data) {
      throw new XrayGqlError([{ message: "GraphQL response contained no data" }]);
    }

    return response.data;
  }

  /**
   * Executes an authenticated REST v2 request with JSON body and response.
   *
   * @param method - HTTP method (GET, POST, PUT, DELETE, etc.).
   * @param path - API path relative to /api/v2 (e.g., "/tests/PROJ-1").
   * @param body - Optional request body (serialized as JSON).
   * @returns Parsed JSON response typed as T.
   * @throws {XrayAuthError} On authentication failures.
   * @throws {XrayHttpError} On non-2xx responses.
   */
  async executeRest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await this.getToken();
    return this.httpClient.request<T>(`${this.restBaseUrl}${path}`, { method, token, body });
  }

  /** Send a REST request with a raw string body (non-JSON) — used by import tools.
   *  contentType must be specified (e.g. "application/xml", "multipart/form-data; boundary=...").
   */
  async executeRestRaw<T>(
    method: string,
    path: string,
    body: string,
    contentType: string,
  ): Promise<T> {
    const token = await this.getToken();
    return this.httpClient.requestRaw<T>(`${this.restBaseUrl}${path}`, {
      method,
      token,
      body,
      contentType,
    });
  }

  /** Send a REST request and return the raw text response — used for Cucumber feature export. */
  async executeRestText(method: string, path: string): Promise<string> {
    const token = await this.getToken();
    return this.httpClient.requestText(`${this.restBaseUrl}${path}`, { method, token });
  }

  /**
   * Validates and normalizes a GraphQL connection limit.
   * Enforces Xray API constraint: 1-100 items per connection, default 20 (GQL-04).
   *
   * @param limit - Requested limit, or undefined to use the default of 20.
   * @returns Valid limit value (1-100).
   * @throws {Error} If limit is outside the 1-100 range.
   */
  static validateLimit(limit?: number): number {
    if (limit === undefined) return 20;
    if (limit < 1 || limit > 100) {
      throw new Error(
        "ERR:GQL_INVALID_LIMIT Limit must be between 1 and 100\n-> Xray API enforces max 100 items per connection",
      );
    }
    return limit;
  }
}
