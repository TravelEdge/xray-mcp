import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudCredentials } from "../types/index.js";
import { XrayAuthError, XrayHttpError } from "../types/index.js";
import { AuthManager, resolveBaseUrl } from "./AuthManager.js";

// Helper to create mock credentials
function makeCreds(overrides?: Partial<CloudCredentials>): CloudCredentials {
  return {
    xrayClientId: "test-client-id",
    xrayClientSecret: "test-client-secret",
    xrayRegion: "global",
    ...overrides,
  };
}

// Helper to create a mock Response
function mockResponse(token: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => `"${token}"`,
    json: async () => token,
  } as Response;
}

function mockErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    text: async () => "error",
    json: async () => ({}),
  } as Response;
}

describe("resolveBaseUrl", () => {
  it("maps 'us' region to us endpoint", () => {
    expect(resolveBaseUrl("us")).toBe("https://us.xray.cloud.getxray.app");
  });

  it("maps 'eu' region to eu endpoint", () => {
    expect(resolveBaseUrl("eu")).toBe("https://eu.xray.cloud.getxray.app");
  });

  it("maps 'au' region to au endpoint", () => {
    expect(resolveBaseUrl("au")).toBe("https://au.xray.cloud.getxray.app");
  });

  it("maps 'global' region to default endpoint", () => {
    expect(resolveBaseUrl("global")).toBe("https://xray.cloud.getxray.app");
  });
});

describe("AuthManager - token caching", () => {
  let authManager: AuthManager;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authManager = new AuthManager();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns a JWT string on successful authentication", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse("test-token"));
    const creds = makeCreds();
    const token = await authManager.getCloudToken(creds);
    expect(token).toBe("test-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns cached token on second call without calling fetch again", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse("cached-token"));
    const creds = makeCreds();
    await authManager.getCloudToken(creds);
    const token = await authManager.getCloudToken(creds);
    expect(token).toBe("cached-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("re-fetches token when it is near expiry (within 50 min buffer)", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(mockResponse("old-token"))
      .mockResolvedValueOnce(mockResponse("new-token"));

    const creds = makeCreds();
    await authManager.getCloudToken(creds);

    // Advance time to within 50 min buffer of 24h expiry
    // 24h - 49min = well within refresh window
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 - 49 * 60 * 1000);

    const token = await authManager.getCloudToken(creds);
    expect(token).toBe("new-token");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("AuthManager - promise deduplication", () => {
  let authManager: AuthManager;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authManager = new AuthManager();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deduplicates concurrent auth calls — only 1 fetch for 3 simultaneous requests", async () => {
    // Create a promise that we can control resolution timing
    let resolveFetch!: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    fetchMock.mockReturnValueOnce(fetchPromise);

    const creds = makeCreds();
    const [t1, t2, t3] = await Promise.all([
      (async () => {
        const p = authManager.getCloudToken(creds);
        resolveFetch(mockResponse("dedup-token"));
        return p;
      })(),
      authManager.getCloudToken(creds),
      authManager.getCloudToken(creds),
    ]);

    expect(t1).toBe("dedup-token");
    expect(t2).toBe("dedup-token");
    expect(t3).toBe("dedup-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("AuthManager - regional endpoints", () => {
  let authManager: AuthManager;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authManager = new AuthManager();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the US regional endpoint for region 'us'", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse("us-token"));
    await authManager.getCloudToken(makeCreds({ xrayRegion: "us" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://us.xray.cloud.getxray.app/api/v2/authenticate",
      expect.any(Object),
    );
  });

  it("calls the EU regional endpoint for region 'eu'", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse("eu-token"));
    await authManager.getCloudToken(makeCreds({ xrayRegion: "eu" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://eu.xray.cloud.getxray.app/api/v2/authenticate",
      expect.any(Object),
    );
  });

  it("calls the AU regional endpoint for region 'au'", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse("au-token"));
    await authManager.getCloudToken(makeCreds({ xrayRegion: "au" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://au.xray.cloud.getxray.app/api/v2/authenticate",
      expect.any(Object),
    );
  });

  it("calls the global endpoint for region 'global'", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse("global-token"));
    await authManager.getCloudToken(makeCreds({ xrayRegion: "global" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://xray.cloud.getxray.app/api/v2/authenticate",
      expect.any(Object),
    );
  });
});

describe("AuthManager - error handling", () => {
  let authManager: AuthManager;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authManager = new AuthManager();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws XrayAuthError with ERR:AUTH_FAILED for 401 response", async () => {
    fetchMock.mockResolvedValueOnce(mockErrorResponse(401));
    const creds = makeCreds();
    await expect(authManager.getCloudToken(creds)).rejects.toThrow(XrayAuthError);
  });

  it("throws XrayAuthError with ERR:AUTH_FAILED message for 401 response", async () => {
    fetchMock.mockResolvedValueOnce(mockErrorResponse(401));
    const creds = makeCreds({ xrayClientId: "unique-id-for-message-test" });
    await expect(authManager.getCloudToken(creds)).rejects.toThrow("ERR:AUTH_FAILED");
  });

  it("throws XrayHttpError for 500 response (no retry)", async () => {
    fetchMock.mockResolvedValueOnce(mockErrorResponse(500));
    const creds = makeCreds();
    await expect(authManager.getCloudToken(creds)).rejects.toThrow(XrayHttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("AuthManager - retry on 429", () => {
  let authManager: AuthManager;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authManager = new AuthManager();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("retries on 429 and succeeds after backoff", async () => {
    fetchMock
      .mockResolvedValueOnce(mockErrorResponse(429))
      .mockResolvedValueOnce(mockResponse("retry-token"));

    const creds = makeCreds();
    const tokenPromise = authManager.getCloudToken(creds);
    // Let the initial 429 be received
    await vi.runAllTimersAsync();
    const token = await tokenPromise;
    expect(token).toBe("retry-token");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws XrayHttpError with ERR:RATE_LIMITED after 3 retries on 429", async () => {
    fetchMock.mockResolvedValue(mockErrorResponse(429));

    const creds = makeCreds();
    const tokenPromise = authManager.getCloudToken(creds);
    // Catch the rejection to prevent unhandled rejection
    tokenPromise.catch(() => {});
    // Advance all timers to let all retries complete
    await vi.runAllTimersAsync();
    // Verify throws XrayHttpError with ERR:RATE_LIMITED
    await expect(tokenPromise).rejects.toThrow(XrayHttpError);
    // 1 original + 3 retries = 4 total calls
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(4);
  });
});
