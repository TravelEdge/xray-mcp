# Contributing to @triparc/xray-mcp

Thank you for your interest in contributing! This guide covers everything you need to set up a development environment, understand the code style, run tests, add tools, and submit a pull request.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Testing](#testing)
- [Adding a New Tool](#adding-a-new-tool)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

---

## Development Setup

### Prerequisites

- **Node.js** >= 22 (check with `node --version`)
- **pnpm** via Corepack (ships with Node.js 16.9+)

### Steps

```bash
# Clone the repository
git clone https://github.com/triparc/xray-mcp.git
cd xray-mcp

# Enable Corepack (activates pnpm without a global install)
corepack enable

# Install dependencies
pnpm install

# Build (compiles TypeScript to dist/)
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

### Verify the setup

After `pnpm build`, confirm the entry point exists:

```bash
node dist/index.js --help 2>&1 || echo "binary exists"
```

### Build hooks

The `pnpm build` command runs a `prebuild` hook before TypeScript compilation:

1. `prebuild` executes `tsx scripts/generate-tools-doc.ts`
2. This scans every registered tool in `TOOL_REGISTRY` and generates `TOOLS.md` at the repo root
3. Then `tsc` compiles TypeScript to `dist/`

**Important:** Do not edit `TOOLS.md` manually — it is auto-generated on every build. If you add, rename, or remove a tool, `TOOLS.md` will update automatically on the next `pnpm build`.

### Environment variables (for local runs)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `XRAY_CLIENT_ID` | Yes* | — | Xray Cloud client ID |
| `XRAY_CLIENT_SECRET` | Yes* | — | Xray Cloud client secret |
| `XRAY_REGION` | No | `global` | One of: `global`, `us`, `eu`, `au` |
| `XRAY_CREDENTIAL_MODE` | No | `strict` | One of: `strict`, `shared-reads`, `fully-shared` |
| `TRANSPORT` | No | stdio | Set to `http` to start the HTTP server |
| `PORT` | No | `3000` | HTTP port (only relevant when `TRANSPORT=http`) |

*Required for integration tests and live runs. Unit tests mock the API.

---

## Project Structure

```
src/
├── auth/              # Authentication: AuthManager, CredentialStore, WriteGuard
├── clients/           # API clients: HttpClient, XrayCloudClient
├── formatters/        # Response formatting: ToonFormatter, JsonFormatter
├── tools/             # 90 MCP tools grouped by domain
│   ├── admin/         # Project settings, statuses, coverage (read)
│   ├── evidence/      # Evidence attach/remove, defect link/unlink (write)
│   ├── executions/    # Test execution CRUD (read+write)
│   ├── folders/       # Folder management (read+write)
│   ├── imports/       # Result import (7 formats + feature files) (write)
│   ├── plans/         # Test plan CRUD (read+write)
│   ├── preconditions/ # Precondition CRUD (read+write)
│   ├── runs/          # Test run status/step updates (read+write)
│   ├── sets/          # Test set CRUD (read+write)
│   ├── tests/         # Test CRUD, step management (read+write)
│   ├── shared/        # Shared Zod fragments, format helpers
│   ├── registry.ts    # Central tool registry (TOOL_REGISTRY, registerTool)
│   └── index.ts       # Barrel import (triggers tool registration on load)
├── transport/         # Transport layer: stdio, HTTP (Streamable HTTP)
├── types/             # TypeScript type definitions
├── errors.ts          # Custom error classes
└── index.ts           # Entry point (transport selection via TRANSPORT env var)
```

Other notable files at the repo root:

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | Technical deep-dive: components, data flow, design decisions |
| `Dockerfile` | Multi-stage Docker build (HTTP transport only) |
| `helm/` | Kubernetes Helm chart |
| `.github/workflows/` | CI (lint, test, build) and publish (npm + Docker) workflows |
| `biome.json` | Linting and formatting configuration |
| `tsconfig.json` | TypeScript compiler options |
| `vitest.config.ts` | Test runner configuration |

---

## Code Style

This project uses **Biome** for linting and formatting — it replaces ESLint and Prettier with a single, faster tool.

### Run checks

```bash
# Check for lint and format issues
pnpm lint

# Auto-fix fixable issues
pnpm lint:fix

# Format only (no lint checks)
pnpm format
```

### Style rules

- **2-space indentation**, **100 character line width**
- Imports are organized automatically by Biome — do not manually order them
- **TypeScript strict mode** is enabled — avoid `any` unless there is no alternative
- Prefer `const` over `let`; avoid `var`
- All exported functions and classes require JSDoc comments
- GraphQL queries **must** use parameterized `variables` objects — never string interpolation (injection risk)

### Configuration

Biome is configured in `biome.json`. CI enforces these rules via `pnpm lint` — PRs that fail lint checks will not be merged.

---

## Testing

### Framework

Tests use **Vitest** with V8 coverage. Test files live alongside source files as `*.test.ts`.

### Commands

```bash
# Run all tests (single pass)
pnpm test

# Run with coverage report
pnpm test:coverage

# Watch mode (re-runs on file change)
pnpm test:watch
```

### Writing tests

- **Unit tests**: Mock `fetch` using `vi.fn()` or `vi.spyOn(globalThis, 'fetch')`. Do not make real HTTP calls in unit tests.
- **Tool handler tests**: Use `McpServer.prototype.tool` spy to capture handler callbacks for direct invocation without MCP protocol setup.
- **Registry isolation**: For tests that register tools, use `TOOL_REGISTRY.push()`/`TOOL_REGISTRY.pop()` to avoid polluting the shared registry.
- **Integration tests**: Gate behind `XRAY_INTEGRATION_TEST=true` environment variable. These require live Xray Cloud credentials and are excluded from CI by default.

### Coverage targets

Coverage is not yet enforced at a specific threshold, but the goal is >80% line coverage for `src/auth/`, `src/clients/`, and `src/formatters/`.

---

## Adding a New Tool

Tools are registered via the `registerTool()` function and auto-discovered through the barrel import chain.

### Step-by-step

1. **Identify the domain** — pick the matching directory under `src/tools/` (e.g., `tests/`, `plans/`, `runs/`).

2. **Create the handler file** — e.g., `src/tools/tests/xray_my_new_tool.ts`:

```typescript
import { z } from "zod";
import { FORMAT_PARAM } from "../shared/params.js";
import { registerTool } from "../registry.js";
import type { ToolContext } from "../../types/index.js";
import type { XrayClient } from "../../clients/XrayClientInterface.js";

registerTool({
  name: "xray_my_new_tool",
  description: "What this tool does and when to use it vs Atlassian MCP tools.",
  accessLevel: "read", // or "write"
  inputSchema: z.object({
    projectKey: z.string().describe("Jira project key (e.g. XTP)"),
    ...FORMAT_PARAM.shape,
  }),
  handler: async (args, ctx: ToolContext) => {
    const client = args._client as XrayClient;
    const result = await client.someMethod(args.projectKey as string);
    // Format and return
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  },
});
```

3. **Export from the domain barrel** — add to `src/tools/tests/index.ts`:

```typescript
import "./xray_my_new_tool.js";
```

4. **Tool naming convention**:
   - All tool names must have the `xray_` prefix to avoid collision with Atlassian MCP tools
   - Format: `xray_{verb}_{noun}` — e.g., `xray_create_test_plan`, `xray_get_test_run_status`
   - Verbs: `get`, `list`, `create`, `update`, `delete`, `add`, `remove`, `import`, `export`

5. **Access level**:
   - `"read"` — safe for `shared-reads` credential mode
   - `"write"` — requires user credentials in `shared-reads` mode; requires any credentials in `strict` mode

6. **No manual wiring needed** — `src/tools/index.ts` imports the domain barrel, which imports your handler file, which calls `registerTool()`. The tool is automatically available in `TOOL_REGISTRY`.

7. **Write tests** — create `src/tools/tests/xray_my_new_tool.test.ts` with unit tests mocking `XrayClient`.

---

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-tool-name
   ```

2. **Make your changes** following the code style and testing guidelines above.

3. **Ensure CI checks pass locally** before pushing:
   ```bash
   pnpm lint
   pnpm test
   pnpm build
   ```

4. **Push and open a PR** against the `main` branch.

5. **CI runs automatically** on every PR:
   - Lint check (`biome check .`)
   - Tests on Node.js 22 and 24
   - TypeScript build

6. **Commit message format** — use conventional commits:
   - `feat:` — new tool or feature
   - `fix:` — bug fix
   - `test:` — test-only changes
   - `refactor:` — code cleanup, no behavior change
   - `docs:` — documentation only
   - `chore:` — config, tooling, dependencies

7. **One feature or fix per PR** — keep PRs focused and easy to review.

8. **Respond to review feedback** — address comments, push updates to the same branch.

---

## Reporting Issues

Use [GitHub Issues](https://github.com/triparc/xray-mcp/issues) to report bugs or request features.

When reporting a bug, include:

- **Steps to reproduce** — exact commands or MCP tool calls
- **Expected behavior** — what should happen
- **Actual behavior** — what happened instead, including error messages
- **Node.js version** (`node --version`)
- **Transport mode** — `stdio` (default) or `http`
- **Xray region** — `global`, `us`, `eu`, or `au`

For security vulnerabilities, do **not** open a public issue — email the maintainers directly.
