---
phase: 03-productionization
plan: 01
subsystem: transport
tags: [express, http, streamable-http, mcp-sdk, health-check, readiness, credential-isolation]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: CredentialStore, AuthManager, createServer, TRANSPORT env var routing
  - phase: 02-full-tool-coverage
    provides: 90 registered tools in TOOL_REGISTRY used by per-request McpServer
provides:
  - Streamable HTTP transport for multi-user Docker/Kubernetes deployments
  - Per-request credential isolation via X-Xray-Client-Id / X-Xray-Client-Secret headers
  - GET /healthz liveness endpoint returning {"status":"ok","transport":"http"}
  - GET /readyz readiness endpoint verifying Xray API connectivity
  - POST /mcp stateless MCP endpoint with per-request McpServer instances
  - 405 responses for GET and DELETE on /mcp per MCP spec
  - CredentialStore.resolveFromHeaders for header-based credential extraction
  - createServer credentialOverride support for bypassing env-var resolution in HTTP mode
affects:
  - 03-02 (Dockerfile needs HTTP transport working)
  - 03-03 (Helm chart targets HTTP transport)
  - 03-04 (GitHub Actions CI tests HTTP startup)

# Tech tracking
tech-stack:
  added:
    - express@5.2.1 (HTTP server framework)
    - "@types/express@5.0.6" (TypeScript types)
  patterns:
    - Dynamic import of HTTP transport to avoid loading Express in stdio mode
    - Per-request McpServer instantiation for credential isolation
    - res.on("close") cleanup prevents transport/server resource leaks
    - Module-scoped authManager shared across HTTP requests (token cache persists)
    - createMcpExpressApp from MCP SDK for built-in DNS rebinding protection

key-files:
  created:
    - src/transport/http.ts
    - src/transport/http.test.ts
  modified:
    - src/auth/CredentialStore.ts
    - src/transport/createServer.ts
    - src/index.ts
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Express 5.2.1 used explicitly — matches MCP SDK peer dependency, avoids transitive-only resolution"
  - "Dynamic import of http.ts in index.ts — avoids loading Express when stdio mode is active"
  - "sessionIdGenerator: undefined — stateless mode; no session state between requests (D-33)"
  - "ALLOWED_HOSTS env var maps to createMcpExpressApp allowedHosts — runtime DNS rebinding control"
  - "GET /readyz returns 200 with xray=not-configured when no server creds (lazy validation D-10 preserved)"

patterns-established:
  - "Pattern: Per-request McpServer with credentialOverride for HTTP credential isolation"
  - "Pattern: Dynamic transport import — only load http.ts when TRANSPORT=http"
  - "Pattern: Shared module-scoped authManager for token cache across HTTP requests"

requirements-completed: [TRNS-02, TRNS-03, TRNS-04, TRNS-05, TRNS-06, TEST-06]

# Metrics
duration: 20min
completed: 2026-03-24
---

# Phase 3 Plan 1: Streamable HTTP Transport Summary

**Express 5 HTTP transport with per-request McpServer credential isolation, liveness/readiness probes, and 6 passing smoke tests**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-24T23:30:00Z
- **Completed:** 2026-03-24T23:52:00Z
- **Tasks:** 2 of 2
- **Files modified:** 7

## Accomplishments

- Implemented full Streamable HTTP transport at `src/transport/http.ts` using MCP SDK's `createMcpExpressApp` and `StreamableHTTPServerTransport`
- Added `resolveFromHeaders` to `CredentialStore` and `credentialOverride` to `ServerConfig` — enables per-request credential injection without changing stdio path
- Wired HTTP transport into entry point via dynamic import; wrote 6 smoke tests covering healthz, readyz, 405 on GET/DELETE /mcp, and app factory shape

## Task Commits

1. **Task 1: Extend CredentialStore and createServer for HTTP mode** - `62eee63` (feat)
2. **Task 2: Create HTTP transport, wire entry point, add smoke tests, install express** - `844f19b` (feat)
3. **Formatting fix: Biome auto-format HTTP transport files** - `d567e2a` (chore)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/transport/http.ts` - Express HTTP app factory with /mcp, /healthz, /readyz routes and startHttpServer
- `src/transport/http.test.ts` - 6 smoke tests for HTTP transport routes (all passing)
- `src/auth/CredentialStore.ts` - Added resolveFromHeaders method for per-request credential extraction
- `src/transport/createServer.ts` - Added credentialOverride to ServerConfig; tool handler uses override when provided
- `src/index.ts` - HTTP branch now uses dynamic import of startHttpServer instead of error exit
- `package.json` - Added express@^5.2.1 as dependency, @types/express as devDependency
- `pnpm-lock.yaml` - Updated with new dependencies

## Decisions Made

- **Express 5.2.1 explicitly declared**: The MCP SDK has express as a direct dependency, but declaring it explicitly in package.json makes the dependency graph clear and ensures TypeScript type resolution with @types/express.
- **Dynamic import**: `import("./transport/http.js")` is loaded only when TRANSPORT=http, keeping the stdio mode startup path free of Express overhead.
- **Stateless mode (`sessionIdGenerator: undefined`)**: No session tracking between requests; each POST /mcp is fully independent with its own McpServer instance.
- **readyz returns 200 with `xray: "not-configured"` when no server creds**: Preserves the lazy validation principle (D-10) — server can start without credentials; /readyz reflects whether server-level creds are configured.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Applied Biome formatting to new files**
- **Found during:** Post-task verification (lint check)
- **Issue:** New files had line-length and import ordering violations per Biome config
- **Fix:** Ran `biome check --write` on modified files; auto-formatted import ordering and ternary expression wrapping
- **Files modified:** src/transport/http.ts, src/transport/http.test.ts
- **Verification:** `biome check` on all 4 modified files exits 0
- **Committed in:** d567e2a (chore commit)

---

**Total deviations:** 1 auto-fixed (formatting — Biome)
**Impact on plan:** Formatting-only fix; no behavior change. No scope creep.

## Issues Encountered

- Express was not installed (not hoisted from MCP SDK's node_modules), required explicit `pnpm add express@^5.2.1`. The MCP SDK declares express as a direct dependency, but pnpm's strict isolation means it was not available in the root package without explicit declaration.

## Known Stubs

None — all routes are fully implemented and tested.

## User Setup Required

None — no external service configuration required for HTTP transport. Users set `TRANSPORT=http` and optionally `PORT` (default 3000), `ALLOWED_HOSTS`, and `XRAY_REGION`.

## Next Phase Readiness

- HTTP transport fully operational — ready for Docker packaging (03-02)
- Health and readiness endpoints match expected K8s liveness/readiness probe patterns
- No blockers for Helm chart (03-03) or CI pipeline (03-04)

---
*Phase: 03-productionization*
*Completed: 2026-03-24*

## Self-Check: PASSED

- FOUND: src/transport/http.ts
- FOUND: src/transport/http.test.ts
- FOUND: src/auth/CredentialStore.ts
- FOUND: .planning/phases/03-productionization/03-01-SUMMARY.md
- FOUND commit: 62eee63 (feat: extend CredentialStore and createServer)
- FOUND commit: 844f19b (feat: HTTP transport with health/readiness endpoints)
- FOUND commit: d567e2a (chore: Biome formatting)
