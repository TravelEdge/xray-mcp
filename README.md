# @triparc/xray-mcp

[![CI](https://github.com/TravelEdge/xray-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/TravelEdge/xray-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@triparc/xray-mcp)](https://www.npmjs.com/package/@triparc/xray-mcp)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org/)

A production-grade MCP server for [Xray Cloud Test Management](https://www.getxray.app/) — 90 tools covering the complete API surface with token-optimized TOON responses.

## Features

- **90 tools across 10 domains** — tests, test runs, executions, test plans, test sets, preconditions, folders, evidence, imports, and administration
- **Token-Optimized Object Notation (TOON)** — default response format reduces LLM token consumption; switch to `json` or `summary` per call
- **Two transport modes** — `stdio` for local IDE use, Streamable HTTP for server deployments
- **Docker and Helm ready** — multi-stage Alpine image and production Helm chart included
- **Three credential modes** — `strict` (personal), `shared-reads` (team reads), `fully-shared` (internal server)
- **Four regional endpoints** — `global`, `us`, `eu`, `au` — select via `XRAY_REGION`
- **Per-request credential isolation** in HTTP mode — each `POST /mcp` resolves its own credentials from request headers
- **Org-wide connector mode** — built-in OAuth sign-in lets Claude.ai, ChatGPT and Copilot users connect with their *own* Xray API key; nothing stored server-side
- **Zero extra dependencies** — native Node.js 22 `fetch` for all HTTP; no `graphql-request`, no `axios`

## Prerequisites

- Node.js >= 22
- Xray Cloud API credentials — generate at **Xray Cloud > API Keys** (see [Xray authentication docs](https://docs.getxray.app/display/XRAYCLOUD/Authentication+-+REST+v2))

## Quickstart

```bash
export XRAY_CLIENT_ID=your-client-id
export XRAY_CLIENT_SECRET=your-client-secret
npx -y @triparc/xray-mcp
```

The server starts in stdio mode, ready for an MCP-capable IDE to connect.

## IDE Setup

### Claude Desktop

Config file: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

**stdio (recommended for personal use)**

```json
{
  "mcpServers": {
    "xray": {
      "command": "npx",
      "args": ["-y", "@triparc/xray-mcp"],
      "env": {
        "XRAY_CLIENT_ID": "your-client-id",
        "XRAY_CLIENT_SECRET": "your-client-secret"
      },
      "autoApprove": ["xray_get_*", "xray_list_*"]
    }
  }
}
```

> **Tip:** `autoApprove` skips the per-tool confirmation dialog for read-only tools. Remove it if you prefer manual approval for every call.

**HTTP (connect to a running server)**

```json
{
  "mcpServers": {
    "xray": {
      "transport": "http",
      "url": "http://your-server:3000/mcp",
      "headers": {
        "X-Xray-Client-Id": "your-client-id",
        "X-Xray-Client-Secret": "your-client-secret"
      }
    }
  }
}
```

### Cursor

Config file: `.cursor/mcp.json` in your project root, or `~/.cursor/mcp.json` for global config.

**stdio**

```json
{
  "mcpServers": {
    "xray": {
      "command": "npx",
      "args": ["-y", "@triparc/xray-mcp"],
      "env": {
        "XRAY_CLIENT_ID": "your-client-id",
        "XRAY_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

**HTTP**

```json
{
  "mcpServers": {
    "xray": {
      "transport": "http",
      "url": "http://your-server:3000/mcp",
      "headers": {
        "X-Xray-Client-Id": "your-client-id",
        "X-Xray-Client-Secret": "your-client-secret"
      }
    }
  }
}
```

### VS Code

Config file: `.vscode/mcp.json` in your workspace root.

**stdio**

```json
{
  "servers": {
    "xray": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@triparc/xray-mcp"],
      "env": {
        "XRAY_CLIENT_ID": "your-client-id",
        "XRAY_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

**HTTP**

```json
{
  "servers": {
    "xray": {
      "type": "http",
      "url": "http://your-server:3000/mcp",
      "headers": {
        "X-Xray-Client-Id": "your-client-id",
        "X-Xray-Client-Secret": "your-client-secret"
      }
    }
  }
}
```

> **Note on config key differences:** Claude Desktop and Cursor use `"mcpServers"` with `"transport": "http"`. VS Code uses `"servers"` with `"type": "http"`. These differences are enforced by each IDE's MCP client implementation.

## Docker Deployment

The Docker image runs in HTTP mode only (`TRANSPORT=http` is set in the image). Pass credentials via environment variables:

```bash
docker run -d \
  -e XRAY_CLIENT_ID=your-client-id \
  -e XRAY_CLIENT_SECRET=your-client-secret \
  -e XRAY_CREDENTIAL_MODE=fully-shared \
  -p 3000:3000 \
  ghcr.io/traveledge/xray-mcp:latest
```

Health and readiness endpoints:

| Endpoint | Purpose |
|----------|---------|
| `GET /healthz` | Liveness — always returns `{ "status": "ok" }` |
| `GET /readyz` | Readiness — attempts Xray token exchange to verify connectivity |

### Docker Compose

```yaml
services:
  xray-mcp:
    image: ghcr.io/traveledge/xray-mcp:latest
    ports:
      - "3000:3000"
    environment:
      XRAY_CLIENT_ID: your-client-id
      XRAY_CLIENT_SECRET: your-client-secret
      XRAY_CREDENTIAL_MODE: fully-shared
    restart: unless-stopped
```

### Building from source

```bash
docker build -t xray-mcp:local .

# Run local build
docker run -d \
  -e XRAY_CLIENT_ID=your-client-id \
  -e XRAY_CLIENT_SECRET=your-client-secret \
  -e XRAY_CREDENTIAL_MODE=fully-shared \
  -p 3000:3000 \
  xray-mcp:local
```

The Dockerfile uses a multi-stage build: `node:24-alpine` builder stage compiles TypeScript; the runtime stage copies only `dist/` and production `node_modules` for a minimal image (~50MB). Runs as non-root `node` user with `tini` as PID 1 for proper signal handling.

## Kubernetes / Helm Deployment

```bash
helm install xray-mcp ./helm \
  --set credentials.clientId=your-client-id \
  --set credentials.clientSecret=your-client-secret \
  --set xray.credentialMode=shared-reads
```

### Key Helm values

| Value | Default | Description |
|-------|---------|-------------|
| `replicaCount` | `1` | Number of pod replicas |
| `image.repository` | `ghcr.io/traveledge/xray-mcp` | Container image |
| `image.tag` | `""` (uses chart `appVersion`) | Image tag |
| `xray.region` | `global` | Xray API region: `global`, `us`, `eu`, `au` |
| `xray.credentialMode` | `strict` | Credential mode (see below) |
| `credentials.clientId` | `""` | Xray client ID (chart creates a Secret) |
| `credentials.clientSecret` | `""` | Xray client secret (chart creates a Secret) |
| `existingSecret` | `""` | Name of existing Secret (bypasses chart Secret creation) |
| `oauth.enabled` | `false` | Enable OAuth sign-in for connector clients (see [Connector mode](#connector-mode-claudeai-chatgpt-copilot)) |
| `oauth.publicUrl` | `""` | Public base URL of the server, e.g. `https://xray-mcp.yourcompany.com` |
| `oauth.encryptionKey` | `""` | 32 random bytes, base64 (`openssl rand -base64 32`); or put `OAUTH_ENCRYPTION_KEY` in `existingSecret` |
| `httpRoute.enabled` | `false` | Create a Gateway API `HTTPRoute` instead of an Ingress |
| `httpRoute.gateway.name` / `.namespace` | `""` | Existing Gateway to attach to |
| `httpRoute.hostnames` | `xray-mcp.example.com` | Route hostnames |
| `ingress.enabled` | `false` | Enable Kubernetes Ingress |
| `ingress.hosts` | `xray-mcp.example.com` | Ingress hostname |
| `autoscaling.enabled` | `false` | Enable HPA |
| `autoscaling.maxReplicas` | `5` | HPA max replicas |
| `resources.limits.cpu` | `500m` | CPU limit |
| `resources.limits.memory` | `512Mi` | Memory limit |
| `pdb.enabled` | `true` | Enable PodDisruptionBudget |

### Using an external secret (CSI Secret Store / External Secrets Operator)

Set `existingSecret` to the name of your pre-existing Secret. The chart will mount it rather than creating its own:

```bash
helm install xray-mcp ./helm \
  --set existingSecret=my-xray-credentials \
  --set xray.credentialMode=shared-reads
```

The Secret must contain keys `XRAY_CLIENT_ID` and `XRAY_CLIENT_SECRET`, plus `OAUTH_ENCRYPTION_KEY` when `oauth.enabled=true`.

### Production deployment with Ingress and TLS

```bash
helm install xray-mcp ./helm \
  --set existingSecret=my-xray-credentials \
  --set xray.credentialMode=shared-reads \
  --set xray.region=us \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set ingress.hosts[0].host=xray-mcp.yourcompany.com \
  --set ingress.hosts[0].paths[0].path=/ \
  --set ingress.hosts[0].paths[0].pathType=Prefix \
  --set ingress.tls[0].secretName=xray-mcp-tls \
  --set ingress.tls[0].hosts[0]=xray-mcp.yourcompany.com \
  --set autoscaling.enabled=true \
  --set autoscaling.maxReplicas=3
```

### Connecting MCP clients to Helm deployment

Once deployed, configure your MCP client to use the HTTP transport pointing to the Ingress URL:

```json
{
  "mcpServers": {
    "xray": {
      "transport": "http",
      "url": "https://xray-mcp.yourcompany.com/mcp",
      "headers": {
        "X-Xray-Client-Id": "your-client-id",
        "X-Xray-Client-Secret": "your-client-secret"
      },
      "autoApprove": ["xray_get_*", "xray_list_*"]
    }
  }
}
```

In `fully-shared` mode, the headers are optional — the server uses its own credentials for all operations.

## Connector mode (Claude.ai, ChatGPT, Copilot)

Hosted assistants add MCP servers as *connectors* and cannot send custom headers — they only speak OAuth. Connector mode makes the server its own OAuth 2.1 provider: the sign-in page asks each user for their **personal Xray API key pair**, validates it against Xray, and issues a token. Every Xray action is then attributed to that user.

Nothing is stored server-side: tokens are AES-256-GCM sealed blobs containing the user's credentials, so any replica can serve any token and restarts lose nothing. Dynamic client registration and PKCE are supported, so no per-client setup is needed.

Enable it with two settings:

```bash
helm upgrade --install xray-mcp ./helm \
  --set existingSecret=my-xray-credentials \
  --set oauth.enabled=true \
  --set oauth.publicUrl=https://xray-mcp.yourcompany.com
```

Then, in Claude (Owner/Admin → Settings → Connectors → Add custom connector), enter `https://xray-mcp.yourcompany.com/mcp` and enable it for the organization. Each user clicks *Connect*, enters their Xray Client ID/Secret once (a Jira admin generates these under Jira Settings → Apps → Xray → API Keys), and is done. With `xray.credentialMode=shared-reads` (or `fully-shared`) the page also offers *Continue with shared access* for users who only need to read — see [Credential Modes](#credential-modes).

Header-based clients (Claude Code, Cursor, VS Code) keep working unchanged when connector mode is on.

Revocation: delete the user's Xray API key (their token stops working immediately) or rotate `OAUTH_ENCRYPTION_KEY` (everyone signs in again).

## Environment Variables

### Server configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `XRAY_CLIENT_ID` | Yes (stdio) | — | Xray Cloud API client ID |
| `XRAY_CLIENT_SECRET` | Yes (stdio) | — | Xray Cloud API client secret |
| `XRAY_REGION` | No | `global` | API region: `global`, `us`, `eu`, `au` |
| `XRAY_CREDENTIAL_MODE` | No | `strict` | Credential mode: `strict`, `shared-reads`, `fully-shared` |
| `TRANSPORT` | No | `stdio` | Transport: `stdio` or `http` |
| `PORT` | No | `3000` | HTTP listen port (HTTP mode only) |
| `ALLOWED_HOSTS` | No | — | Comma-separated allowed hosts for DNS rebinding protection (HTTP mode only). Rejects any other `Host`, including Kubernetes probe traffic — leave unset behind a load balancer |
| `TRUST_PROXY` | No | `1` | Number of reverse-proxy hops to trust for the client IP (rate limiting). HTTP mode only |
| `PUBLIC_URL` | No | — | Public base URL of this server. With `OAUTH_ENCRYPTION_KEY`, enables connector mode (HTTP mode only) |
| `OAUTH_ENCRYPTION_KEY` | No | — | 32 random bytes, base64-encoded. Seals OAuth tokens; rotate to sign everyone out |

### HTTP request headers (HTTP mode only)

In `strict` and `shared-reads` modes, HTTP callers provide their Xray credentials per request:

| Header | Required | Description |
|--------|----------|-------------|
| `X-Xray-Client-Id` | Yes* | Per-request Xray client ID |
| `X-Xray-Client-Secret` | Yes* | Per-request Xray client secret |
| `Authorization: Bearer …` | Yes* | OAuth token issued in connector mode (used instead of the two headers above) |

\* One of: the header pair, a bearer token, or — in `fully-shared` mode only — nothing (the server's own `XRAY_CLIENT_ID` / `XRAY_CLIENT_SECRET` are used). Requests with none of these get `401`.

## Credential Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `strict` (default) | Every caller provides own credentials via env vars (stdio) or headers (HTTP) | Personal stdio use; multi-tenant HTTP where each user has their own Xray key |
| `shared-reads` | Server credentials used for read operations; caller credentials required for writes | Team server where everyone can read test data but only credentialed users can modify it |
| `fully-shared` | Single server credential set for all operations | Internal team server where all team members share one Xray account |

**stdio mode:** credentials come from `XRAY_CLIENT_ID` / `XRAY_CLIENT_SECRET` environment variables.

**HTTP mode:** each request resolves credentials in order — OAuth bearer token (connector mode) → `X-Xray-Client-Id` / `X-Xray-Client-Secret` headers → the server's own `XRAY_CLIENT_ID` / `XRAY_CLIENT_SECRET` when the mode allows it. In `shared-reads`, requests that fall back to the server's credentials can only call read tools; a write returns `ERR:AUTH_WRITE_DENIED` with a hint to supply a personal key. In `strict`, a request with no credentials gets `401`.

**Connector mode + `shared-reads`** is the usual org setup: the sign-in page offers *Continue with shared access (read-only)*, so anyone can browse test data without an Xray key, while people who need to create or modify tests sign in with their own key and are attributed in Xray. To move from shared to personal access, disconnect the connector and reconnect, choosing the key form.

## Tools

90 tools across 10 domains. All tools accept an optional `format` parameter:

- `format: "toon"` (default) — Token-Optimized Object Notation, minimal token usage
- `format: "json"` — raw JSON response from Xray API
- `format: "summary"` — single-line human-readable summary

| Domain | Tools | Access |
|--------|-------|--------|
| Tests | 13 | Read / Write |
| Test Runs | 14 | Read / Write |
| Test Executions | 8 | Read / Write |
| Test Plans | 8 | Read / Write |
| Test Sets | 6 | Read / Write |
| Preconditions | 7 | Read / Write |
| Folders | 9 | Read / Write |
| Evidence | 8 | Read / Write |
| Imports | 8 | Write |
| Administration | 9 | Read / Write |
| **Total** | **90** | |

See [TOOLS.md](TOOLS.md) for the complete tool reference with parameters, examples, and response formats.

## TOON Format

**Token-Optimized Object Notation (TOON)** is the default response format. It strips verbose JSON keys, compresses nested structures, and uses concise status icons — reducing token consumption by 40-70% compared to raw Xray API responses.

Example: a test execution with 50 runs returns ~800 tokens in TOON vs ~3,500 tokens in raw JSON.

**Switching formats per call:**

```
Use the listTestRuns tool with format: "json" to get full JSON output
```

```
Use the getTestDetails tool with format: "summary" for a one-line summary
```

TOON is opinionated for LLM consumption. If you need to pass Xray responses to other systems, use `format: "json"` for spec-compliant output.

## Development

### Local setup

```bash
# Requires Node.js >= 22 and pnpm
npm install -g pnpm
pnpm install
pnpm build
pnpm test
```

### Run in stdio mode

```bash
XRAY_CLIENT_ID=your-id XRAY_CLIENT_SECRET=your-secret node dist/index.js
```

### Run in HTTP mode

```bash
TRANSPORT=http XRAY_CLIENT_ID=your-id XRAY_CLIENT_SECRET=your-secret node dist/index.js
```

### Available scripts

| Script | Description |
|--------|-------------|
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm dev` | Watch mode — recompile on change |
| `pnpm test` | Run Vitest test suite |
| `pnpm test:coverage` | Run tests with V8 coverage report |
| `pnpm lint` | Run Biome linter and formatter check |
| `pnpm lint:fix` | Auto-fix lint and formatting issues |
| `pnpm introspect` | Introspect live Xray Cloud GraphQL schema (requires credentials) |
| `pnpm introspect:audit` | Audit all 90 tools against the live schema — reports mismatches |

## Schema Verification

The project includes an introspection script that validates all GraphQL queries against the live Xray Cloud API schema. This catches field renames, removed arguments, and type mismatches before they reach production.

```bash
# Requires XRAY_CLIENT_ID and XRAY_CLIENT_SECRET
export XRAY_CLIENT_ID=your-id
export XRAY_CLIENT_SECRET=your-secret

# Introspect schema and save to schema/ directory
pnpm introspect

# Audit all tools against the live schema
pnpm introspect:audit
```

The audit checks every query and mutation for:
- Root field existence (e.g., `getTest` exists on Query type)
- Argument names and types match the schema
- Deprecated fields

Results are written to `schema/audit-report.md`. The `schema/` directory is gitignored — each developer runs against their own Xray instance.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, commit conventions, and pull request guidelines before opening an issue or PR.

## License

[Apache License 2.0](LICENSE)
