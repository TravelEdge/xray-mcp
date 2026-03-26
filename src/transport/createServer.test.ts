import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createServer } from "./createServer.js";

const mockResolveFromEnv = vi.fn().mockReturnValue({
  credentials: {
    xrayClientId: "test-id",
    xrayClientSecret: "test-secret",
    xrayRegion: "global",
  },
  source: "env",
});

const mockGetCredentialMode = vi.fn().mockReturnValue("strict");
const mockCheckAccess = vi.fn();

// Mock the entire auth module
vi.mock("../auth/index.js", () => {
  function MockCredentialStore() {
    return {
      resolveFromEnv: mockResolveFromEnv,
      getCredentialMode: mockGetCredentialMode,
    };
  }
  function MockWriteGuard() {
    return {
      checkAccess: mockCheckAccess,
    };
  }
  return {
    authManager: {
      getCloudToken: vi.fn().mockResolvedValue("mock-token"),
    },
    CredentialStore: MockCredentialStore,
    WriteGuard: MockWriteGuard,
    resolveBaseUrl: vi.fn().mockReturnValue("https://xray.cloud.getxray.app"),
  };
});

vi.mock("../clients/index.js", () => {
  function MockHttpClient() {
    return {};
  }
  function MockXrayCloudClient() {
    return {
      query: vi.fn(),
      mutate: vi.fn(),
    };
  }
  return {
    HttpClient: MockHttpClient,
    XrayCloudClient: MockXrayCloudClient,
  };
});

// Keep TOOL_REGISTRY empty for Phase 1 — will be overridden in "createServer with tools"
vi.mock("../tools/registry.js", () => ({
  TOOL_REGISTRY: [],
}));

describe("createServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore mock return values after clearAllMocks
    mockResolveFromEnv.mockReturnValue({
      credentials: {
        xrayClientId: "test-id",
        xrayClientSecret: "test-secret",
        xrayRegion: "global",
      },
      source: "env",
    });
    mockGetCredentialMode.mockReturnValue("strict");
  });

  it("returns an McpServer instance", () => {
    const server = createServer();
    expect(server).toBeInstanceOf(McpServer);
  });

  it("returns a server with .tool method", () => {
    const server = createServer();
    expect(typeof server.tool).toBe("function");
  });

  it("uses default name and version when no config provided", () => {
    const server = createServer();
    expect(server).toBeDefined();
  });

  it("accepts custom name and version config", () => {
    const server = createServer({ name: "test-server", version: "9.9.9" });
    expect(server).toBeInstanceOf(McpServer);
  });

  it("does NOT call CredentialStore.resolveFromEnv at server creation (D-10 lazy validation)", () => {
    createServer();
    // resolveFromEnv must NOT be called during server creation —
    // it is called lazily only when a tool handler is invoked.
    expect(mockResolveFromEnv).not.toHaveBeenCalled();
  });

  it("creates server successfully with empty TOOL_REGISTRY (Phase 1 baseline)", () => {
    // With an empty registry the server should still be created successfully
    const server = createServer();
    expect(server).toBeInstanceOf(McpServer);
  });
});

// ---------------------------------------------------------------------------
// Tool handler closure coverage tests
// These tests exercise the async handler closure at createServer.ts lines 40-72
// by injecting a mock tool into TOOL_REGISTRY and capturing the registered callback.
// ---------------------------------------------------------------------------
describe("createServer with tools", () => {
  const mockToolHandler = vi.fn().mockResolvedValue({
    content: [{ type: "text" as const, text: "ok" }],
  });

  const mockTool = {
    name: "xray_test_tool",
    description: "Test tool for coverage",
    accessLevel: "read" as const,
    inputSchema: z.object({
      format: z.string().optional(),
    }),
    handler: mockToolHandler,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveFromEnv.mockReturnValue({
      credentials: {
        xrayClientId: "test-id",
        xrayClientSecret: "test-secret",
        xrayRegion: "global",
      },
      source: "env",
    });
    mockGetCredentialMode.mockReturnValue("strict");
    mockToolHandler.mockResolvedValue({
      content: [{ type: "text" as const, text: "ok" }],
    });
  });

  it("registers tool and handler invokes credential resolution", async () => {
    const toolSpy = vi.spyOn(McpServer.prototype, "tool");

    // Inject mock tool into the registry for this test
    const { TOOL_REGISTRY } = await import("../tools/registry.js");
    (TOOL_REGISTRY as (typeof mockTool)[]).push(mockTool);

    createServer();

    // server.tool() was called with name, description, schema, callback
    expect(toolSpy).toHaveBeenCalledWith(
      "xray_test_tool",
      "Test tool for coverage",
      expect.any(Object),
      expect.any(Function),
    );

    // Extract and invoke the callback to exercise the closure
    const calls = toolSpy.mock.calls;
    const lastCall = calls[calls.length - 1];
    const callback = lastCall[3] as (args: Record<string, unknown>) => Promise<unknown>;
    await callback({ format: "toon" });

    // Verify lazy credential resolution happened
    expect(mockResolveFromEnv).toHaveBeenCalled();
    expect(mockGetCredentialMode).toHaveBeenCalled();
    expect(mockCheckAccess).toHaveBeenCalled();
    expect(mockToolHandler).toHaveBeenCalled();

    // Cleanup
    (TOOL_REGISTRY as (typeof mockTool)[]).pop();
    toolSpy.mockRestore();
  });

  it("tool handler defaults format to toon when not provided", async () => {
    const toolSpy = vi.spyOn(McpServer.prototype, "tool");

    const { TOOL_REGISTRY } = await import("../tools/registry.js");
    (TOOL_REGISTRY as (typeof mockTool)[]).push(mockTool);

    createServer();

    const calls = toolSpy.mock.calls;
    const lastCall = calls[calls.length - 1];
    const callback = lastCall[3] as (args: Record<string, unknown>) => Promise<unknown>;
    await callback({});

    // Verify the handler was called with ctx.format === "toon"
    expect(mockToolHandler).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ format: "toon" }),
    );

    (TOOL_REGISTRY as (typeof mockTool)[]).pop();
    toolSpy.mockRestore();
  });

  it("tool handler passes provided format through", async () => {
    const toolSpy = vi.spyOn(McpServer.prototype, "tool");

    const { TOOL_REGISTRY } = await import("../tools/registry.js");
    (TOOL_REGISTRY as (typeof mockTool)[]).push(mockTool);

    createServer();

    const calls = toolSpy.mock.calls;
    const lastCall = calls[calls.length - 1];
    const callback = lastCall[3] as (args: Record<string, unknown>) => Promise<unknown>;
    await callback({ format: "json" });

    expect(mockToolHandler).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ format: "json" }),
    );

    (TOOL_REGISTRY as (typeof mockTool)[]).pop();
    toolSpy.mockRestore();
  });
});
