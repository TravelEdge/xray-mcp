import { beforeEach, describe, expect, it, vi } from "vitest";
import { XrayGqlError } from "../types/index.js";
import type { HttpClient } from "./HttpClient.js";
import { XrayCloudClient } from "./XrayCloudClient.js";

// Mock HttpClient
function makeMockHttpClient(): HttpClient {
  return {
    request: vi.fn(),
    _sleep: vi.fn(),
  } as unknown as HttpClient;
}

describe("XrayCloudClient", () => {
  let httpClient: HttpClient;
  let getToken: ReturnType<typeof vi.fn<() => Promise<string>>>;
  let client: XrayCloudClient;

  beforeEach(() => {
    httpClient = makeMockHttpClient();
    getToken = vi.fn<() => Promise<string>>().mockResolvedValue("test-token-abc");
    client = new XrayCloudClient(httpClient, getToken);
  });

  describe("executeGraphQL", () => {
    it("sends POST to /api/v2/graphql with { query, variables } body", async () => {
      const mockRequest = vi.mocked(httpClient.request);
      mockRequest.mockResolvedValueOnce({ data: { tests: [] } });

      await client.executeGraphQL("{ tests { issueId } }", { limit: 10 });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/graphql"),
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            query: "{ tests { issueId } }",
            variables: { limit: 10 },
          }),
        }),
      );
    });

    it("executeGraphQL with no variables sends { query } (no variables key)", async () => {
      const mockRequest = vi.mocked(httpClient.request);
      mockRequest.mockResolvedValueOnce({ data: { test: { issueId: "1" } } });

      await client.executeGraphQL("{ test { issueId } }");

      const callArgs = mockRequest.mock.calls[0];
      const body = (callArgs[1] as { body: Record<string, unknown> }).body;
      expect(body).toHaveProperty("query");
      expect(body).not.toHaveProperty("variables");
    });

    it("returns data field from response", async () => {
      const mockRequest = vi.mocked(httpClient.request);
      const testData = { test: { issueId: "ABC-123" } };
      mockRequest.mockResolvedValueOnce({ data: testData });

      const result = await client.executeGraphQL<typeof testData>("{ test { issueId } }");

      expect(result).toEqual(testData);
    });

    it("executeGraphQL with errors and no data throws XrayGqlError containing all error messages", async () => {
      const mockRequest = vi.mocked(httpClient.request);
      const errorResponse = {
        errors: [
          { message: "Field 'unknown' not found", path: ["test"] },
          { message: "Resolver limit exceeded" },
        ],
      };
      // Two calls = two mock responses
      mockRequest.mockResolvedValueOnce(errorResponse).mockResolvedValueOnce(errorResponse);

      await expect(client.executeGraphQL("{ test { unknown } }")).rejects.toThrow(XrayGqlError);

      await expect(client.executeGraphQL("{ test { unknown } }")).rejects.toMatchObject({
        message: expect.stringContaining("Field 'unknown' not found"),
      });
    });

    it("executeGraphQL with both data and errors returns data (partial success per D-07)", async () => {
      const mockRequest = vi.mocked(httpClient.request);
      const partialData = { tests: [{ issueId: "1" }] };
      mockRequest.mockResolvedValueOnce({
        data: partialData,
        errors: [{ message: "Some tests could not be loaded", path: ["tests", "1"] }],
      });

      const result = await client.executeGraphQL<typeof partialData>("{ tests { issueId } }");

      // D-07: returns data even when errors present
      expect(result).toEqual(partialData);
    });

    it("GraphQL endpoint URL includes correct region-based base", async () => {
      const mockRequest = vi.mocked(httpClient.request);
      mockRequest.mockResolvedValueOnce({ data: {} });

      const customClient = new XrayCloudClient(
        httpClient,
        getToken,
        "https://custom.xray.example.com",
      );
      await customClient.executeGraphQL("{ test }");

      expect(mockRequest).toHaveBeenCalledWith(
        "https://custom.xray.example.com/api/v2/graphql",
        expect.any(Object),
      );
    });
  });

  describe("validateLimit", () => {
    it("validateLimit accepts 1 and returns 1", () => {
      expect(XrayCloudClient.validateLimit(1)).toBe(1);
    });

    it("validateLimit accepts 100 and returns 100", () => {
      expect(XrayCloudClient.validateLimit(100)).toBe(100);
    });

    it("validateLimit rejects 0 with error", () => {
      expect(() => XrayCloudClient.validateLimit(0)).toThrow();
      expect(() => XrayCloudClient.validateLimit(0)).toThrow(/ERR:GQL_INVALID_LIMIT/);
    });

    it("validateLimit rejects 101 with error", () => {
      expect(() => XrayCloudClient.validateLimit(101)).toThrow();
      expect(() => XrayCloudClient.validateLimit(101)).toThrow(/ERR:GQL_INVALID_LIMIT/);
    });

    it("validateLimit defaults undefined to 20", () => {
      expect(XrayCloudClient.validateLimit(undefined)).toBe(20);
    });
  });

  describe("executeRest", () => {
    it("executeRest sends correct method and path to HttpClient", async () => {
      const mockRequest = vi.mocked(httpClient.request);
      const responseData = { id: "1", status: "active" };
      mockRequest.mockResolvedValueOnce(responseData);

      const result = await client.executeRest<typeof responseData>("GET", "/tests/ABC-123");

      expect(result).toEqual(responseData);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/tests/ABC-123"),
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("executeRest passes body to HttpClient for POST requests", async () => {
      const mockRequest = vi.mocked(httpClient.request);
      mockRequest.mockResolvedValueOnce({ created: true });

      const body = { summary: "New test", testType: "Manual" };
      await client.executeRest("POST", "/tests", body);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          body,
        }),
      );
    });
  });
});
