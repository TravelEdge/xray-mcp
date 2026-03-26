import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { authManager, CredentialStore, resolveBaseUrl, WriteGuard } from "../auth/index.js";
import { HttpClient, XrayCloudClient } from "../clients/index.js";
import { TOOL_REGISTRY } from "../tools/registry.js";
import type { ToolContext } from "../types/index.js";

/**
 * Configuration options for the MCP server instance.
 * All fields are optional — defaults produce a working server with env-based credentials.
 */
export interface ServerConfig {
  /** MCP server name reported during protocol handshake. Defaults to "xray-mcp". */
  name?: string;
  /** MCP server version reported during protocol handshake. Defaults to "0.1.0". */
  version?: string;
  /** Pre-resolved credentials (HTTP mode). When set, skips env var resolution (D-33). */
  credentialOverride?: import("../types/index.js").AuthContext;
}

/**
 * Creates and configures an MCP server with all Xray tools registered.
 *
 * Per D-10: Lazy credential validation — credentials are only resolved
 * when the first tool call is made, not at server startup.
 *
 * Per D-11: Transport-specific code lives in src/transport/.
 *
 * @param config - Optional server configuration (name, version, credential override).
 * @returns Configured McpServer instance ready to connect to a transport.
 *
 * @example
 * ```typescript
 * const server = createServer();
 * const transport = new StdioServerTransport();
 * await server.connect(transport);
 * ```
 */
export function createServer(config: ServerConfig = {}): McpServer {
  const { name = "xray-mcp", version = "0.1.0", credentialOverride } = config;

  // D-10: Instantiate CredentialStore but do NOT call resolveFromEnv yet.
  // Credentials are validated lazily on the first tool call.
  const credentialStore = new CredentialStore();

  const server = new McpServer({ name, version });

  // Register all tools from the registry.
  // In Phase 1, TOOL_REGISTRY is empty — server starts with no tools.
  // Phase 2 tool imports populate the registry before createServer is called.
  for (const tool of TOOL_REGISTRY) {
    const schemaShape = tool.inputSchema.shape;

    server.tool(tool.name, tool.description, schemaShape, async (args: Record<string, unknown>) => {
      // D-10: Resolve credentials lazily on first tool call
      // HTTP mode passes pre-resolved credentials via credentialOverride (D-33)
      const auth = credentialOverride ?? credentialStore.resolveFromEnv();
      const mode = credentialStore.getCredentialMode();
      const writeGuard = new WriteGuard(mode);

      // Enforce credential mode access control
      writeGuard.checkAccess(tool.accessLevel, auth);

      // Build HTTP client and Xray Cloud client per call.
      // HttpClient is stateless; XrayCloudClient caches nothing itself —
      // token caching is in the module-scope authManager singleton.
      const httpClient = new HttpClient();
      const client = new XrayCloudClient(
        httpClient,
        () => authManager.getCloudToken(auth.credentials),
        resolveBaseUrl(auth.credentials.xrayRegion),
      );

      // Determine output format from args (default: "toon" per TOON-01)
      const format = (args.format as string) ?? "toon";

      const ctx: ToolContext = {
        auth,
        format: format as "toon" | "json" | "summary",
      };

      // Inject the constructed XrayCloudClient into args under the _client key.
      // Phase 2 tool handlers extract the client via: const client = args._client as XrayCloudClient
      // This avoids extending ToolContext with a typed client dependency.
      return tool.handler({ ...args, _client: client }, ctx);
    });
  }

  return server;
}
