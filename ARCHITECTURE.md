# Architecture

This document is the technical reference for contributors. It covers the component model, data flow through the system, key design decisions, authentication lifecycle, tool registration pattern, response formatting, and error handling.

## Architecture Overview

`@triparc/xray-mcp` is a Model Context Protocol (MCP) server that wraps the complete Xray Cloud Test Management API — both GraphQL and REST v2 — behind 90 unified MCP tools. It supports two transports: **stdio** for personal use with Claude Desktop/Cursor/VS Code, and **Streamable HTTP** for team deployments where multiple users share one server. Responses default to TOON format (Token-Optimized Object Notation) to minimize token consumption when used by LLMs.

---

## Components

The server is organized into five layers, each with a single responsibility:

```
┌──────────────────────────────────────────────────────┐
│                    MCP Client                         │
│       (Claude Desktop / Cursor / VS Code)             │
└────────────────────┬─────────────────────────────────┘
                     │ MCP protocol (JSON-RPC)
          ┌──────────┴──────────┐
          │   stdio transport   │   HTTP transport
          │  (StdioServer-      │  (Express +
          │   Transport)        │   StreamableHTTP-
          │                     │   ServerTransport)
          └──────────┬──────────┘
                     │
          ┌──────────┴──────────┐
          │     McpServer        │  ← one per process (stdio)
          │  (tool dispatch)     │    or per request (HTTP)
          └──────────┬──────────┘
                     │
          ┌──────────┴──────────┐
          │   Tool Handlers      │  ← 90 tools, 10 domains
          │   (registry.ts)      │
          └──────────┬──────────┘
                     │
          ┌──────────┴──────────┐
          │  XrayCloudClient     │  ← GraphQL + REST v2
          │  HttpClient          │  ← fetch, retry, rate limit
          └──────────┬──────────┘
                     │
          ┌──────────┴──────────┐
          │   AuthManager        │  ← JWT cache, deduplication
          │   CredentialStore    │  ← env vars / HTTP headers
          │   WriteGuard         │  ← access level enforcement
          └─────────────────────┘
```

### Component responsibilities

| Component | File | Responsibility |
|-----------|------|----------------|
| `McpServer` | `@modelcontextprotocol/sdk` | MCP protocol handler, tool dispatch |
| `createServer()` | `src/transport/createServer.ts` | Factory — wires all layers into a McpServer |
| `startHttpServer()` | `src/transport/http.ts` | Express app, per-request server instances, health endpoints |
| `AuthManager` | `src/auth/AuthManager.ts` | JWT acquisition, 24h cache, request deduplication, retry on 429 |
| `CredentialStore` | `src/auth/CredentialStore.ts` | Resolves credentials from env vars or HTTP headers |
| `WriteGuard` | `src/auth/WriteGuard.ts` | Enforces credential mode access control at dispatch time |
| `HttpClient` | `src/clients/HttpClient.ts` | Fetch wrapper with retry logic and rate limit handling |
| `XrayCloudClient` | `src/clients/XrayCloudClient.ts` | All GraphQL queries and REST v2 calls to Xray Cloud |
| `ToonFormatter` | `src/formatters/ToonFormatter.ts` | Entity templates, status icons, compact notation |
| `JsonFormatter` | `src/formatters/JsonFormatter.ts` | Raw JSON passthrough |
| `TOOL_REGISTRY` | `src/tools/registry.ts` | Shared array of all registered tools |
| `registerTool()` | `src/tools/registry.ts` | Side-effect registration — populates TOOL_REGISTRY |

---

## Data Flow

### Stdio flow

Used for personal setups (Claude Desktop, Cursor, VS Code). Single long-lived process.

```
1. src/index.ts: TRANSPORT env var is unset → create McpServer via createServer()
2. StdioServerTransport connects McpServer to stdin/stdout
3. MCP client sends tool_call JSON-RPC message
4. McpServer dispatches to the matching handler
5. Handler:
   a. CredentialStore.resolveFromEnv() → reads XRAY_CLIENT_ID / XRAY_CLIENT_SECRET
   b. WriteGuard.checkAccess(accessLevel, auth) → enforces credential mode
   c. XrayCloudClient calls Xray API (GraphQL or REST v2)
   d. AuthManager.getCloudToken() → returns cached JWT or fetches a new one
   e. Response formatted via ToonFormatter (default) or JsonFormatter
6. Formatted response returned to MCP client as tool result
```

### HTTP flow

Used for team deployments. Multiple users share one Express server; each HTTP request is isolated.

```
1. src/index.ts: TRANSPORT=http → dynamic import of src/transport/http.ts
2. Express app listens on PORT (default 3000)
3. POST /mcp arrives from MCP client
4. Per-request credential extraction:
   - X-Xray-Client-Id header → clientId
   - X-Xray-Client-Secret header → clientSecret
   - CredentialStore.resolveFromHeaders() builds AuthContext
5. NEW McpServer instance created via createServer({ credentialOverride: auth })
   → per-request isolation: each request has its own credential context
6. StreamableHTTPServerTransport processes the MCP JSON-RPC body
7. Tool dispatch follows the same path as stdio from step 5 onward
8. AuthManager is a MODULE-SCOPE SINGLETON → token cache shared across requests
   → prevents redundant auth calls when multiple users share the same client_id
9. Response close handler: transport.close() + server.close() → no resource leaks
```

### Health endpoints (HTTP mode only)

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /healthz` | Liveness probe | `{ status: "ok", transport: "http" }` |
| `GET /readyz` | Readiness probe — validates Xray API connectivity | `{ status: "ready", xray: "reachable" }` or `503` |
| `GET /mcp` | Not allowed in stateless mode | `405 Method Not Allowed` |
| `DELETE /mcp` | Not allowed in stateless mode | `405 Method Not Allowed` |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Module-scoped `AuthManager` singleton | Token cache survives HTTP request boundaries; prevents redundant Xray auth calls when multiple requests share the same `client_id` |
| Per-request `McpServer` (HTTP mode) | Credential isolation — each request has its own credential context; prevents credential bleed between users |
| Native `fetch` — no `graphql-request` | Zero dependency; Node.js 22 ships stable `fetch`; GraphQL is just `POST` with a JSON body — no client library needed |
| Parameterized GraphQL `variables` | String interpolation of user input into GraphQL queries is injection-vulnerable; all queries must use `{ query, variables }` — this is enforced by convention and code review |
| TOON as default format | Token-Optimized Object Notation reduces LLM token consumption by ~40-60% vs raw JSON; opt out with `format: "json"` |
| Side-effect tool registration | Barrel imports in `src/tools/index.ts` trigger `registerTool()` calls; no manual wiring in `createServer()` — add a tool, export it, done |
| `_client` injection key | `XrayCloudClient` passed via `args._client` in tool handlers; decouples `ToolContext` from the client type; enables clean unit testing by substituting a mock |
| `WriteGuard` at dispatch time | Access level checked before the handler runs; write operations cannot proceed without proper credentials regardless of which tool is called |
| `tini` as PID 1 in Docker | Proper SIGTERM/SIGINT signal handling in Alpine containers; prevents zombie processes on `docker stop` |
| Dynamic HTTP import | `src/index.ts` dynamically imports `./transport/http.js` only when `TRANSPORT=http`; avoids loading Express when the process runs in stdio mode |
| Stateless HTTP transport | `sessionIdGenerator: undefined` in `StreamableHTTPServerTransport`; each POST `/mcp` is fully independent — no session state to manage or expire |

---

## Authentication Flow

Xray Cloud uses JWT tokens (24h TTL) obtained by exchanging a client_id + client_secret pair.

```
1. CredentialStore.resolve*() extracts client_id + client_secret
   → from XRAY_CLIENT_ID / XRAY_CLIENT_SECRET env vars (stdio)
   → from X-Xray-Client-Id / X-Xray-Client-Secret headers (HTTP)

2. AuthManager.getCloudToken(credentials) is called before every API request:

   ┌─ Is token in cache and not near expiry? (< 24h - 50min)
   │  YES → return cached token immediately
   │
   ├─ Is there an in-flight auth request for the same client_id?
   │  YES → return the existing Promise (deduplication — prevents thundering herd)
   │
   └─ NO → start new auth request:
         POST https://xray.cloud.getxray.app/api/v2/authenticate
         (or regional endpoint for us/eu/au)
         body: { client_id, client_secret }

         → 200: parse JWT, cache with 24h TTL, return token
         → 429: exponential backoff (1s, 2s, 4s... max 30s), retry up to 3 times
         → 401/403: throw XrayAuthError (actionable message)
         → other: throw XrayHttpError

3. HttpClient attaches Authorization: Bearer <jwt> to all outbound API requests

4. 401/403 on API calls throw XrayAuthError (distinct from XrayHttpError)
   → MCP client receives an error response with actionable hint
```

### Regional endpoints

| Region | Base URL |
|--------|---------|
| `global` (default) | `https://xray.cloud.getxray.app` |
| `us` | `https://us.xray.cloud.getxray.app` |
| `eu` | `https://eu.xray.cloud.getxray.app` |
| `au` | `https://au.xray.cloud.getxray.app` |

Set via `XRAY_REGION` env var. Region is server-wide in HTTP mode (per-request region override is not supported).

---

## Tool Registration

Tools self-register via side effects when their module is imported.

```
src/tools/index.ts
  └─ import "./tests/index.js"          ← domain barrel
       └─ import "./xray_get_test.js"   ← handler file
            └─ registerTool({...})      ← side effect: pushes to TOOL_REGISTRY

createServer()
  └─ for (const tool of TOOL_REGISTRY)
       server.tool(tool.name, tool.description, schema, handler)
```

**CRITICAL**: `import "./tools/index.js"` in `src/index.ts` must execute BEFORE `createServer()` is called. If the import runs after, `TOOL_REGISTRY` is empty and the server starts with no tools.

### Tool definition shape

```typescript
interface ToolDefinition {
  name: string;          // "xray_" prefix required (e.g., "xray_get_test")
  description: string;   // Explains what the tool does and when to prefer it
  accessLevel: "read" | "write";
  inputSchema: z.ZodObject<...>;  // Zod schema — validated by McpServer
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
}
```

### Access levels and credential modes

| Credential mode | `read` tools | `write` tools |
|-----------------|-------------|---------------|
| `strict` (default) | Require user credentials | Require user credentials |
| `shared-reads` | Use server credentials | Require user credentials |
| `fully-shared` | Use server credentials | Use server credentials |

`WriteGuard.checkAccess()` is called at dispatch time before the handler runs.

### Current tool count

- Total: **90 tools**
- Domains: admin, evidence, executions, folders, imports, plans, preconditions, runs, sets, tests

---

## Response Formatting

Every tool handler receives a `format` argument (defaults to `"toon"` per TOON-01):

| Format | Class | Description |
|--------|-------|-------------|
| `toon` (default) | `ToonFormatter` | Entity-specific templates with status icons, abbreviated keys, compact notation. ~40-60% token reduction vs JSON. |
| `json` | `JsonFormatter` | Raw JSON passthrough — full fidelity, higher token cost. |
| `summary` | `ToonFormatter` | Single-line entity representation — useful for list operations. |

### TOON format

TOON uses entity-specific templates. Example test entity:

```
TEST XTP-123 [✔ PASS] "My test title" (manual)
steps: 3 | precond: 1
```

### Status icons

| Icon | Statuses |
|------|---------|
| `✔` | PASS, PASSED, *PASS* |
| `✘` | FAIL, FAILED, *FAIL* |
| `○` | TODO, NOT_RUN, *TODO*, *NOT_RUN* |
| `●` | EXECUTING, *EXECUT* |
| `∅` | ABORTED, CANCELLED, *ABORT*, *CANCEL* |
| `?` | Any unknown status (explicit fallback — never silent empty) |

Matching is exact first, then fuzzy substring. Custom Xray status names with `PASS` substring get `✔`, etc.

### Error format

```
ERR:<CODE> <message>
-> <actionable hint>
```

Examples:
- `ERR:AUTH_MISSING_CRED No client ID\n-> Set XRAY_CLIENT_ID environment variable`
- `ERR:RATE_LIMITED Auth rate limit exceeded after 3 retries\n-> Rate limit exceeded, retry after 30s`

---

## Error Handling

The project defines a hierarchy of custom error classes:

| Class | When thrown | HTTP status trigger |
|-------|-------------|---------------------|
| `XrayAuthError` | Missing credentials, 401/403 from Xray API, invalid credential mode | 401, 403 |
| `XrayHttpError` | Non-2xx responses from Xray API (except 401/403) | 4xx, 5xx |
| `XrayGqlError` | GraphQL-level errors (errors array present, no data) | 200 with `errors` |

All errors carry an actionable message formatted as `ERR:<CODE> <message>\n-> <hint>`.

### Partial GraphQL responses

If a GraphQL response contains both `data` and `errors`, the data is returned (not thrown). Only a response with `errors` and no `data` throws `XrayGqlError`. This matches Xray's partial response behavior for some queries.

### Rate limiting

`HttpClient` handles 429 responses with exponential backoff:
- Attempts: up to 3 retries
- Delays: 1s → 2s → 4s (capped at 30s)
- After max retries: throws `XrayHttpError` with `ERR:RATE_LIMITED`

---

## Source References

| Concept | Primary file |
|---------|-------------|
| Entry point and transport selection | `src/index.ts` |
| Server factory | `src/transport/createServer.ts` |
| HTTP transport + health endpoints | `src/transport/http.ts` |
| JWT lifecycle | `src/auth/AuthManager.ts` |
| Credential resolution | `src/auth/CredentialStore.ts` |
| Access control | `src/auth/WriteGuard.ts` |
| HTTP client + retry | `src/clients/HttpClient.ts` |
| Xray API calls | `src/clients/XrayCloudClient.ts` |
| Tool registry | `src/tools/registry.ts` |
| TOON formatting | `src/formatters/ToonFormatter.ts` |
| Domain types | `src/types/index.ts` |
