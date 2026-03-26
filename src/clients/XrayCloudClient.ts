import type { GraphQLResponse } from "../types/index.js";
import { XrayGqlError } from "../types/index.js";
import type { HttpClient } from "./HttpClient.js";
import type { XrayClient } from "./XrayClientInterface.js";

export class XrayCloudClient implements XrayClient {
  private readonly graphqlEndpoint: string;
  private readonly restBaseUrl: string;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly getToken: () => Promise<string>,
    baseUrl: string = "https://xray.cloud.getxray.app",
  ) {
    this.graphqlEndpoint = `${baseUrl}/api/v2/graphql`;
    this.restBaseUrl = `${baseUrl}/api/v2`;
  }

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

  // GQL-04: Validate connection limit (1-100, default 20)
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
