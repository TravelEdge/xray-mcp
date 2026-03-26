# Roadmap: Xray MCP Server

## Overview

The project builds a production-grade MCP server wrapping the full Xray Cloud API surface into 83 typed tools with token-efficient TOON responses. The work naturally falls into four phases: a foundation layer (auth, clients, formatters, scaffold), a complete tool implementation layer covering all 83 read/write tools, a productionization layer (HTTP transport, Docker, CI/CD), and a publication layer (documentation and npm/Docker release). Each phase delivers a coherent, independently verifiable capability that unblocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Scaffold, auth, GraphQL/REST clients, TOON formatter, and stdio transport wired into a working but empty MCP server (completed 2026-03-23)
- [ ] **Phase 2: Full Tool Coverage** - All 83 read and write tools implemented with Zod schemas, TOON formatting, and WriteGuard enforcement
- [x] **Phase 3: Productionization** - HTTP transport, Docker image, Helm chart, CI/CD pipeline, and transport smoke tests (completed 2026-03-25)
- [ ] **Phase 4: Publication** - Complete documentation, inline code comments, and verified npm + Docker release readiness

## Phase Details

### Phase 1: Foundation
**Goal**: A working MCP server binary starts, authenticates with Xray Cloud, and can accept tool calls — even though no domain tools exist yet
**Depends on**: Nothing (first phase)
**Requirements**: SCAF-01, SCAF-02, SCAF-03, SCAF-04, SCAF-05, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, GQL-01, GQL-02, GQL-03, GQL-04, TOON-01, TOON-02, TOON-03, TOON-04, TOON-05, TOON-06, TOON-07, TRNS-01, TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. Running `npx @triparc/xray-mcp` starts a stdio MCP server without errors when valid XRAY_CLIENT_ID and XRAY_CLIENT_SECRET are set
  2. The server obtains and caches a Xray Cloud JWT — concurrent cold-start requests share one auth call and do not trigger duplicate authentication
  3. A tool call in strict mode fails with a clear credential error if no user credentials are supplied; in fully-shared mode the same call succeeds using shared credentials
  4. A GraphQL request with a malformed variable value is rejected at the client layer (parameterized variables, no string interpolation accepted)
  5. Formatter unit tests pass with 80%+ coverage for TOON entity templates, status icon mapping, and JSON fallback
**Plans:** 6/6 plans complete

Plans:
- [x] 01-01-PLAN.md — Scaffold project, configure toolchain, define domain types
- [x] 01-02-PLAN.md — AuthManager, CredentialStore, WriteGuard with tests
- [x] 01-03-PLAN.md — HttpClient and XrayCloudClient with parameterized GraphQL
- [x] 01-04-PLAN.md — ToonFormatter and JsonFormatter with entity templates
- [x] 01-05-PLAN.md — Wire createServer factory and stdio transport entry point

### Phase 2: Full Tool Coverage
**Goal**: All 90 Xray MCP tools are callable, return TOON-formatted responses, and a developer can drive a complete test management workflow entirely through the MCP server
**Depends on**: Phase 1
**Requirements**: GQL-05, REST-01, REST-02, REST-03, REST-04, READ-01, READ-02, READ-03, READ-04, READ-05, READ-06, READ-07, READ-08, READ-09, READ-10, READ-11, READ-12, READ-13, READ-14, READ-15, READ-16, READ-17, READ-18, READ-19, READ-20, READ-21, READ-22, READ-23, READ-24, READ-25, READ-26, WTEST-01, WTEST-02, WTEST-03, WTEST-04, WTEST-05, WTEST-06, WTEST-07, WTEST-08, WTEST-09, WEXEC-01, WEXEC-02, WEXEC-03, WEXEC-04, WEXEC-05, WEXEC-06, WPLAN-01, WPLAN-02, WPLAN-03, WPLAN-04, WPLAN-05, WPLAN-06, WSET-01, WSET-02, WSET-03, WSET-04, WRUN-01, WRUN-02, WRUN-03, WRUN-04, WRUN-05, WRUN-06, WRUN-07, WRUN-08, WRUN-09, WRUN-10, WPREC-01, WPREC-02, WPREC-03, WPREC-04, WPREC-05, WFOLD-01, WFOLD-02, WFOLD-03, WFOLD-04, WFOLD-05, WFOLD-06, WFOLD-07, WFOLD-08, WEVID-01, WEVID-02, WEVID-03, WEVID-04, WEVID-05, WEVID-06, WEVID-07, WEVID-08, WIMP-01, WIMP-02, WIMP-03, WIMP-04, WIMP-05, WIMP-06, WIMP-07, WIMP-08, QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. All 90 tools are discoverable in a connected MCP client (Claude Desktop / Cursor) with xray_ prefix and no name collision with Atlassian MCP tools
  2. A user can read test details, list executions, update a test run status to PASS, and attach evidence to a step — all within one MCP session — receiving TOON-formatted responses throughout
  3. Importing a JUnit XML result file and a Cucumber .feature file both succeed and return a TOON import result summary
  4. Every tool call that exceeds the rate limit automatically retries with exponential backoff and eventually succeeds or returns a structured ERR: response with an actionable hint
  5. All write tools refuse to execute in strict mode without user-provided credentials; the error message explicitly tells the user what credential is missing
**Plans:** 11/12 plans executed

Plans:
- [x] 02-01-PLAN.md — Shared infrastructure (format helpers, Zod fragments, barrel wiring, HttpClient raw-body support)
- [x] 02-02-PLAN.md — Test entity tools (4 read + 9 write = 13 tools)
- [x] 02-03-PLAN.md — Execution entity tools (2 read + 6 write = 8 tools)
- [x] 02-04-PLAN.md — Plan entity tools (2 read + 6 write = 8 tools)
- [x] 02-05-PLAN.md — Set entity tools (2 read + 4 write = 6 tools)
- [x] 02-06-PLAN.md — Run entity tools (4 read + 10 write = 14 tools)
- [ ] 02-07-PLAN.md — Precondition entity tools (2 read + 5 write = 7 tools)
- [x] 02-08-PLAN.md — Folder entity tools (1 read + 8 write = 9 tools)
- [x] 02-09-PLAN.md — Evidence and defect tools (8 write tools)
- [x] 02-10-PLAN.md — Import tools (8 write tools, REST endpoints)
- [x] 02-11-PLAN.md — Admin/settings/coverage tools (9 read tools)
- [x] 02-12-PLAN.md — Registry validation and integration test scaffold

### Phase 3: Productionization
**Goal**: The server runs as a multi-user HTTP service, ships as a minimal Docker image, has a Helm chart for Kubernetes, and the CI pipeline is green
**Depends on**: Phase 2
**Requirements**: TRNS-02, TRNS-03, TRNS-04, TRNS-05, TRNS-06, DEPL-01, DEPL-02, DEPL-03, DEPL-04, DEPL-05, CICD-01, CICD-02, CICD-03, TEST-06
**Success Criteria** (what must be TRUE):
  1. Setting TRANSPORT=http starts the server in Streamable HTTP mode; GET /healthz returns 200 and GET /readyz confirms Xray API connectivity
  2. Two concurrent HTTP requests with different credentials resolve independently — each uses its own credential context while sharing the module-level token cache
  3. `docker build` produces a working image; `docker run` starts the server as a non-root user with tini as PID 1
  4. `helm install` with a values override file deploys the server to a Kubernetes cluster with configurable replicas, resource limits, and TLS ingress
  5. A pull request to main triggers the GitHub Actions CI workflow and all lint, test, and build steps pass before merge
**Plans**: TBD

### Phase 4: Publication
**Goal**: The project is ready for open-source release — documentation covers every user scenario, code is self-explanatory, and the npm + Docker publish pipeline is verified
**Depends on**: Phase 3
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06, DOCS-07, DOCS-08
**Success Criteria** (what must be TRUE):
  1. A developer with no prior context can go from README to a working `npx @triparc/xray-mcp` Claude Desktop config in under 10 minutes using only the README
  2. A DevOps engineer can deploy the server to Kubernetes using the Helm instructions in the README without consulting any external documentation
  3. A contributor can set up a dev environment, run the test suite, and understand the architecture from CONTRIBUTING.md and ARCHITECTURE.md alone
  4. Every public function and class in src/ has a JSDoc comment explaining its contract and the reason for non-obvious design choices
**Plans**: TBD

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 6/6 | Complete   | 2026-03-23 |
| 2. Full Tool Coverage | 11/12 | In Progress|  |
| 3. Productionization | 4/4 | Complete   | 2026-03-25 |
| 4. Publication | 0/? | Not started | - |
