import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { XrayHttpError } from "../types/index.js";
import { HttpClient } from "./HttpClient.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeResponse(status: number, body: unknown, ok?: boolean): Response {
  const isOk = ok ?? (status >= 200 && status < 300);
  return {
    status,
    statusText: status === 200 ? "OK" : status === 429 ? "Too Many Requests" : "Error",
    ok: isOk,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe("HttpClient", () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient();
    mockFetch.mockReset();
    // Suppress sleep delays in tests
    vi.spyOn(
      client as unknown as { _sleep: (ms: number) => Promise<void> },
      "_sleep",
    ).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("successful GET request returns parsed JSON body", async () => {
    const responseData = { id: 1, name: "test" };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    const result = await client.request<typeof responseData>("https://api.example.com/resource", {
      method: "GET",
      token: "my-token",
    });

    expect(result).toEqual(responseData);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("successful POST request sends body as JSON and returns parsed response", async () => {
    const requestBody = { query: "{ tests }", variables: {} };
    const responseData = { data: { tests: [] } };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    const result = await client.request<typeof responseData>("https://api.example.com/graphql", {
      method: "POST",
      token: "my-token",
      body: requestBody,
    });

    expect(result).toEqual(responseData);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/graphql",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(requestBody),
      }),
    );
  });

  it("Authorization header is set with Bearer token", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, {}));

    await client.request("https://api.example.com/resource", {
      method: "GET",
      token: "secret-token-123",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret-token-123",
        }),
      }),
    );
  });

  it("Content-Type header is set to application/json", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, {}));

    await client.request("https://api.example.com/resource", {
      method: "GET",
      token: "my-token",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("429 response triggers retry — second attempt succeeds (verify 2 fetch calls)", async () => {
    const successData = { data: "success" };
    mockFetch
      .mockResolvedValueOnce(makeResponse(429, "Too Many Requests"))
      .mockResolvedValueOnce(makeResponse(200, successData));

    const result = await client.request<typeof successData>("https://api.example.com/resource", {
      method: "GET",
      token: "my-token",
    });

    expect(result).toEqual(successData);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("429 retry uses exponential backoff — delays increase (1s, 2s, 4s) capped at 30s", async () => {
    const successData = { data: "success" };
    // Need 3 429s then a success to observe 3 delays
    mockFetch
      .mockResolvedValueOnce(makeResponse(429, "Rate limited"))
      .mockResolvedValueOnce(makeResponse(429, "Rate limited"))
      .mockResolvedValueOnce(makeResponse(429, "Rate limited"))
      .mockResolvedValueOnce(makeResponse(200, successData));

    const sleepSpy = vi
      .spyOn(client as unknown as { _sleep: (ms: number) => Promise<void> }, "_sleep")
      .mockResolvedValue(undefined);

    await client.request<typeof successData>("https://api.example.com/resource", {
      method: "GET",
      token: "my-token",
    });

    // Delays should be: 1000ms (2^0), 2000ms (2^1), 4000ms (2^2)
    expect(sleepSpy).toHaveBeenCalledTimes(3);
    expect(sleepSpy).toHaveBeenNthCalledWith(1, 1000);
    expect(sleepSpy).toHaveBeenNthCalledWith(2, 2000);
    expect(sleepSpy).toHaveBeenNthCalledWith(3, 4000);
  });

  it("429 after 3 retries throws XrayHttpError with status 429 and ERR:RATE_LIMITED message", async () => {
    // 1 initial + 3 retries = 4 429s total
    mockFetch
      .mockResolvedValueOnce(makeResponse(429, "Rate limited"))
      .mockResolvedValueOnce(makeResponse(429, "Rate limited"))
      .mockResolvedValueOnce(makeResponse(429, "Rate limited"))
      .mockResolvedValueOnce(makeResponse(429, "Rate limited"));

    let thrown: unknown;
    try {
      await client.request("https://api.example.com/resource", {
        method: "GET",
        token: "my-token",
      });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(XrayHttpError);
    expect(thrown).toMatchObject({
      statusCode: 429,
      message: expect.stringContaining("ERR:RATE_LIMITED"),
    });
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it("400 response throws XrayHttpError with status 400 (no retry)", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(400, "Bad Request", false));

    await expect(
      client.request("https://api.example.com/resource", {
        method: "GET",
        token: "my-token",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("500 response throws XrayHttpError with status 500 (no retry)", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(500, "Internal Server Error", false));

    await expect(
      client.request("https://api.example.com/resource", {
        method: "GET",
        token: "my-token",
      }),
    ).rejects.toMatchObject({
      statusCode: 500,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("non-JSON response body is captured in error message", async () => {
    const errorHtml = "<html><body>Service Unavailable</body></html>";
    mockFetch.mockResolvedValueOnce({
      status: 503,
      statusText: "Service Unavailable",
      ok: false,
      text: () => Promise.resolve(errorHtml),
    } as unknown as Response);

    await expect(
      client.request("https://api.example.com/resource", {
        method: "GET",
        token: "my-token",
      }),
    ).rejects.toMatchObject({
      statusCode: 503,
      message: expect.stringContaining("Service Unavailable"),
    });
  });
});
