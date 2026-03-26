export interface XrayClient {
  executeGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
  executeRest<T>(method: string, path: string, body?: unknown): Promise<T>;
  executeRestRaw<T>(method: string, path: string, body: string, contentType: string): Promise<T>;
  executeRestText(method: string, path: string): Promise<string>;
}

export interface QueryOptions {
  format: "toon" | "json" | "summary";
  limit?: number;
  start?: number;
}
