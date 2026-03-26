# Requirements: Xray MCP Server

**Defined:** 2026-03-22
**Core Value:** LLM-powered tools can read, create, and manage Xray test management data through a single MCP server with token-efficient responses

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Scaffold

- [x] **SCAF-01**: Project uses single-package structure with flat src/ directory
- [x] **SCAF-02**: TypeScript strict mode with ES2022 target, Node16 module resolution
- [x] **SCAF-03**: Biome configured for linting and formatting (2-space indent, 100 char width)
- [x] **SCAF-04**: Vitest configured as test runner with coverage reporting
- [x] **SCAF-05**: Package published as @triparc/xray-mcp with bin entry for npx usage

### Authentication

- [x] **AUTH-01**: User can authenticate with Xray Cloud using client_id and client_secret
- [x] **AUTH-02**: JWT tokens are cached per client_id and auto-refreshed before 24h expiry
- [x] **AUTH-03**: Token acquisition is deduplicated (concurrent requests share one auth call)
- [x] **AUTH-04**: User can target regional endpoints (global, US, EU, AU)
- [x] **AUTH-05**: Rate-limited responses (429) trigger exponential backoff retry (max 3 retries, 30s cap)
- [x] **AUTH-06**: Credential mode is configurable: strict (default), shared-reads, fully-shared
- [x] **AUTH-07**: In strict mode, every tool call requires user-provided credentials
- [x] **AUTH-08**: In shared-reads mode, reads use shared creds, writes require user creds
- [x] **AUTH-09**: In fully-shared mode, one credential set serves all operations
- [x] **AUTH-10**: Credentials resolve from environment variables (stdio) or request headers (HTTP)

### GraphQL Client

- [x] **GQL-01**: All GraphQL queries use parameterized variables (not string interpolation)
- [x] **GQL-02**: Client uses native fetch (no graphql-request dependency)
- [x] **GQL-03**: GraphQL errors are parsed and surfaced with path and message details
- [x] **GQL-04**: Connection limit enforced (1-100 per query) per Xray API constraints
- [x] **GQL-05**: Field selection adapts to requested format (TOON requests fewer fields)

### REST Client

- [x] **REST-01**: Import endpoints support all 7 formats: Xray JSON, JUnit, Cucumber, TestNG, NUnit, Robot, Behave
- [x] **REST-02**: Import supports both simple and multipart modes (multipart includes test execution fields)
- [x] **REST-03**: Feature file import supported with project key parameter
- [x] **REST-04**: Cucumber feature export returns file content (single or zip for multiple)

### TOON Formatter

- [x] **TOON-01**: TOON is the default response format for all tools
- [x] **TOON-02**: Entity-specific templates exist for: test, test_list, test_execution, test_plan, test_set, test_run, precondition, folder, coverage, dataset, import_result, statuses, settings
- [x] **TOON-03**: Status icons map known statuses (PASS->check, FAIL->x, TODO->circle, EXECUTING->bullet, ABORTED->null)
- [x] **TOON-04**: Custom/unknown Xray statuses display with a fallback icon rather than no icon
- [x] **TOON-05**: JSON format available as fallback on every tool via format parameter
- [x] **TOON-06**: Summary format returns single-line representation of any entity
- [x] **TOON-07**: Error responses use TOON format: ERR:<code> <message> with optional hint

### Read Tools (30)

- [x] **READ-01**: User can get test details with steps, type, status, and relations
- [x] **READ-02**: User can get expanded test with resolved call-test steps
- [x] **READ-03**: User can list tests with JQL filter, folder path, and pagination
- [x] **READ-04**: User can list expanded tests
- [x] **READ-05**: User can get test execution with runs, environments, and plan link
- [x] **READ-06**: User can list test executions with JQL filter
- [x] **READ-07**: User can get test plan with tests and executions
- [x] **READ-08**: User can list test plans with JQL filter
- [x] **READ-09**: User can get test set with associated tests
- [x] **READ-10**: User can list test sets with JQL filter
- [x] **READ-11**: User can get test run by test+execution keys
- [x] **READ-12**: User can get test run by internal ID
- [x] **READ-13**: User can list test runs for a test with environment filter
- [x] **READ-14**: User can list test runs by IDs
- [x] **READ-15**: User can get precondition with linked tests
- [x] **READ-16**: User can list preconditions with JQL filter
- [x] **READ-17**: User can get folder with contents, subfolders, and test count
- [x] **READ-18**: User can get coverable issue with test coverage status
- [x] **READ-19**: User can list coverable issues with coverage info
- [x] **READ-20**: User can get dataset with rows and parameters
- [x] **READ-21**: User can list datasets
- [x] **READ-22**: User can export Cucumber feature files by issue keys
- [x] **READ-23**: User can get Xray project settings
- [x] **READ-24**: User can list test statuses with colors
- [x] **READ-25**: User can list test step statuses
- [x] **READ-26**: User can list available issue link types

### Write Tools — Tests (12)

- [x] **WTEST-01**: User can create a manual/cucumber/generic test with steps, folder, preconditions
- [x] **WTEST-02**: User can delete a test
- [x] **WTEST-03**: User can change test type (Manual/Cucumber/Generic)
- [x] **WTEST-04**: User can update Cucumber scenario definition
- [x] **WTEST-05**: User can update Generic test definition
- [x] **WTEST-06**: User can add a step to a manual test
- [x] **WTEST-07**: User can update a test step (action/data/expected result)
- [x] **WTEST-08**: User can remove a single test step
- [x] **WTEST-09**: User can remove all test steps from a test

### Write Tools — Test Executions (6)

- [x] **WEXEC-01**: User can create a test execution with tests, environments, and plan
- [x] **WEXEC-02**: User can delete a test execution
- [x] **WEXEC-03**: User can add tests to an existing execution
- [x] **WEXEC-04**: User can remove tests from an execution
- [x] **WEXEC-05**: User can add test environments to an execution
- [x] **WEXEC-06**: User can remove test environments from an execution

### Write Tools — Test Plans (6)

- [x] **WPLAN-01**: User can create a test plan with tests
- [x] **WPLAN-02**: User can delete a test plan
- [x] **WPLAN-03**: User can add tests to a plan
- [x] **WPLAN-04**: User can remove tests from a plan
- [x] **WPLAN-05**: User can add executions to a plan
- [x] **WPLAN-06**: User can remove executions from a plan

### Write Tools — Test Sets (4)

- [x] **WSET-01**: User can create a test set
- [x] **WSET-02**: User can delete a test set
- [x] **WSET-03**: User can add tests to a set
- [x] **WSET-04**: User can remove tests from a set

### Write Tools — Test Runs (11)

- [x] **WRUN-01**: User can update test run status (PASS/FAIL/TODO/EXECUTING/ABORTED)
- [x] **WRUN-02**: User can update test run comment
- [x] **WRUN-03**: User can do full test run update (status, comment, custom fields, assignee)
- [x] **WRUN-04**: User can reset test run to initial state
- [x] **WRUN-05**: User can update step-level status
- [x] **WRUN-06**: User can update step-level comment
- [x] **WRUN-07**: User can update full test run step (status, comment, evidence, defects)
- [x] **WRUN-08**: User can update Cucumber example status
- [x] **WRUN-09**: User can update data-driven iteration status
- [x] **WRUN-10**: User can start/stop test run execution timer

### Write Tools — Preconditions (5)

- [x] **WPREC-01**: User can create a precondition
- [x] **WPREC-02**: User can update precondition type/definition
- [x] **WPREC-03**: User can delete a precondition
- [x] **WPREC-04**: User can link tests to a precondition
- [x] **WPREC-05**: User can unlink tests from a precondition

### Write Tools — Folders (8)

- [x] **WFOLD-01**: User can create a folder in the test repository
- [x] **WFOLD-02**: User can delete a folder
- [x] **WFOLD-03**: User can rename a folder
- [x] **WFOLD-04**: User can move a folder to a new parent
- [x] **WFOLD-05**: User can add tests to a folder
- [x] **WFOLD-06**: User can remove tests from a folder
- [x] **WFOLD-07**: User can add issues (preconditions) to a folder
- [x] **WFOLD-08**: User can remove issues from a folder

### Write Tools — Evidence & Defects (8)

- [x] **WEVID-01**: User can attach evidence to a test run
- [x] **WEVID-02**: User can remove evidence from a test run
- [x] **WEVID-03**: User can link defects to a test run
- [x] **WEVID-04**: User can unlink defects from a test run
- [x] **WEVID-05**: User can attach evidence to a test run step
- [x] **WEVID-06**: User can remove evidence from a test run step
- [x] **WEVID-07**: User can link defects to a test run step
- [x] **WEVID-08**: User can unlink defects from a test run step

### Write Tools — Import (8)

- [x] **WIMP-01**: User can import Xray JSON format results
- [x] **WIMP-02**: User can import JUnit XML results
- [x] **WIMP-03**: User can import Cucumber JSON results
- [x] **WIMP-04**: User can import TestNG XML results
- [x] **WIMP-05**: User can import NUnit XML results
- [x] **WIMP-06**: User can import Robot Framework XML results
- [x] **WIMP-07**: User can import Behave JSON results
- [x] **WIMP-08**: User can import Cucumber .feature files

### Transport

- [x] **TRNS-01**: Server runs in stdio mode by default (for Claude Desktop, Cursor, VS Code)
- [x] **TRNS-02**: Server runs in Streamable HTTP mode when TRANSPORT=http is set
- [x] **TRNS-03**: HTTP mode creates per-request server instances for credential isolation
- [x] **TRNS-04**: AuthManager (token cache) is shared across HTTP requests for efficiency
- [x] **TRNS-05**: Health check endpoint at /healthz returns server status
- [x] **TRNS-06**: Readiness endpoint at /readyz verifies Xray API connectivity

### Deployment

- [x] **DEPL-01**: Multi-stage Dockerfile produces minimal production image on node:22-alpine
- [x] **DEPL-02**: Docker image runs as non-root user with tini as PID 1
- [x] **DEPL-03**: Helm chart supports configurable replicas, resources, env vars, secrets
- [x] **DEPL-04**: Helm chart includes HPA for CPU-based autoscaling
- [x] **DEPL-05**: Helm chart supports ingress configuration with TLS

### CI/CD

- [x] **CICD-01**: GitHub Actions CI runs lint, test, build on every PR
- [x] **CICD-02**: GitHub Actions publish workflow triggers on git tag (npm + Docker)
- [x] **CICD-03**: npm publish uses OIDC provenance (no stored tokens)

### Documentation

- [ ] **DOCS-01**: README includes project overview, features list, and quickstart
- [ ] **DOCS-02**: README includes setup guides for Claude Desktop, Cursor, VS Code
- [ ] **DOCS-03**: README includes Docker and Helm deployment instructions
- [ ] **DOCS-04**: README includes environment variable reference
- [ ] **DOCS-05**: README includes credential mode configuration guide
- [ ] **DOCS-06**: Contributing guide covers dev setup, code style, testing, and PR process
- [ ] **DOCS-07**: Architecture doc explains component diagram, data flow, and design decisions
- [ ] **DOCS-08**: Code includes comprehensive inline documentation (JSDoc on public APIs)

### Tool Quality

- [x] **QUAL-01**: All 83 tools have xray_ prefix to avoid Atlassian MCP collision
- [x] **QUAL-02**: All tools have Zod input schemas with descriptive field annotations
- [x] **QUAL-03**: Tool descriptions explicitly reference Atlassian MCP where relevant
- [x] **QUAL-04**: All tools tagged with access level (read/write) for WriteGuard enforcement
- [x] **QUAL-05**: Every tool returns consistent error format with actionable hints

### Testing

- [x] **TEST-01**: Unit tests cover formatters (TOON + JSON) with 80%+ coverage
- [x] **TEST-02**: Unit tests cover auth (token caching, deduplication, credential modes)
- [x] **TEST-03**: Unit tests cover WriteGuard (access level enforcement)
- [x] **TEST-04**: API client tests use mocked fetch for all GraphQL queries and mutations
- [x] **TEST-05**: Integration test structure exists (gated behind XRAY_INTEGRATION_TEST=true)
- [x] **TEST-06**: Transport smoke tests verify stdio and HTTP startup

## v2 Requirements

### Server/DC Support

- **SRVR-01**: XrayServerClient implements XrayClient interface using REST-only
- **SRVR-02**: Server/DC authentication via PAT or basic auth
- **SRVR-03**: Automatic deployment detection from configuration

### Advanced Features

- **ADV-01**: MCP Resources for Xray project configuration
- **ADV-02**: MCP Prompts for common test management workflows
- **ADV-03**: Webhook support for real-time test status notifications

## Out of Scope

| Feature | Reason |
|---------|--------|
| Xray Server/DC support | Cloud-only for v1; can be added via adapter pattern later |
| Private/internal deployment package | Dockerfile + Helm chart covers AKS needs |
| Azure Key Vault as code | Handled at K8s level with CSI Secret Store driver |
| Audit logging middleware | Can be added as optional middleware or handled externally |
| Bulk/batch operations | Correctness concerns; use individual tool calls |
| MCP Resources/Prompts | Not needed for v1; tools are the primary interface |
| Response caching | Stale data risk; Xray API is fast enough |
| Direct Jira operations | Covered by Atlassian MCP |
| API reference docs | Can be auto-generated from tool schemas later |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCAF-01 | Phase 1 | Complete |
| SCAF-02 | Phase 1 | Complete |
| SCAF-03 | Phase 1 | Complete |
| SCAF-04 | Phase 1 | Complete |
| SCAF-05 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| AUTH-07 | Phase 1 | Complete |
| AUTH-08 | Phase 1 | Complete |
| AUTH-09 | Phase 1 | Complete |
| AUTH-10 | Phase 1 | Complete |
| GQL-01 | Phase 1 | Complete |
| GQL-02 | Phase 1 | Complete |
| GQL-03 | Phase 1 | Complete |
| GQL-04 | Phase 1 | Complete |
| GQL-05 | Phase 1 | Complete |
| REST-01 | Phase 2 | Pending |
| REST-02 | Phase 2 | Pending |
| REST-03 | Phase 2 | Pending |
| REST-04 | Phase 2 | Pending |
| TOON-01 | Phase 1 | Complete |
| TOON-02 | Phase 1 | Complete |
| TOON-03 | Phase 1 | Complete |
| TOON-04 | Phase 1 | Complete |
| TOON-05 | Phase 1 | Complete |
| TOON-06 | Phase 1 | Complete |
| TOON-07 | Phase 1 | Complete |
| READ-01 | Phase 2 | Pending |
| READ-02 | Phase 2 | Pending |
| READ-03 | Phase 2 | Pending |
| READ-04 | Phase 2 | Pending |
| READ-05 | Phase 2 | Pending |
| READ-06 | Phase 2 | Pending |
| READ-07 | Phase 2 | Pending |
| READ-08 | Phase 2 | Pending |
| READ-09 | Phase 2 | Pending |
| READ-10 | Phase 2 | Pending |
| READ-11 | Phase 2 | Pending |
| READ-12 | Phase 2 | Pending |
| READ-13 | Phase 2 | Pending |
| READ-14 | Phase 2 | Pending |
| READ-15 | Phase 2 | Pending |
| READ-16 | Phase 2 | Pending |
| READ-17 | Phase 2 | Pending |
| READ-18 | Phase 2 | Pending |
| READ-19 | Phase 2 | Pending |
| READ-20 | Phase 2 | Pending |
| READ-21 | Phase 2 | Pending |
| READ-22 | Phase 2 | Pending |
| READ-23 | Phase 2 | Pending |
| READ-24 | Phase 2 | Pending |
| READ-25 | Phase 2 | Pending |
| READ-26 | Phase 2 | Pending |
| WTEST-01 | Phase 2 | Pending |
| WTEST-02 | Phase 2 | Pending |
| WTEST-03 | Phase 2 | Pending |
| WTEST-04 | Phase 2 | Pending |
| WTEST-05 | Phase 2 | Pending |
| WTEST-06 | Phase 2 | Pending |
| WTEST-07 | Phase 2 | Pending |
| WTEST-08 | Phase 2 | Pending |
| WTEST-09 | Phase 2 | Pending |
| WEXEC-01 | Phase 2 | Pending |
| WEXEC-02 | Phase 2 | Pending |
| WEXEC-03 | Phase 2 | Pending |
| WEXEC-04 | Phase 2 | Pending |
| WEXEC-05 | Phase 2 | Pending |
| WEXEC-06 | Phase 2 | Pending |
| WPLAN-01 | Phase 2 | Pending |
| WPLAN-02 | Phase 2 | Pending |
| WPLAN-03 | Phase 2 | Pending |
| WPLAN-04 | Phase 2 | Pending |
| WPLAN-05 | Phase 2 | Pending |
| WPLAN-06 | Phase 2 | Pending |
| WSET-01 | Phase 2 | Pending |
| WSET-02 | Phase 2 | Pending |
| WSET-03 | Phase 2 | Pending |
| WSET-04 | Phase 2 | Pending |
| WRUN-01 | Phase 2 | Pending |
| WRUN-02 | Phase 2 | Pending |
| WRUN-03 | Phase 2 | Pending |
| WRUN-04 | Phase 2 | Pending |
| WRUN-05 | Phase 2 | Pending |
| WRUN-06 | Phase 2 | Pending |
| WRUN-07 | Phase 2 | Pending |
| WRUN-08 | Phase 2 | Pending |
| WRUN-09 | Phase 2 | Pending |
| WRUN-10 | Phase 2 | Pending |
| WPREC-01 | Phase 2 | Pending |
| WPREC-02 | Phase 2 | Pending |
| WPREC-03 | Phase 2 | Pending |
| WPREC-04 | Phase 2 | Pending |
| WPREC-05 | Phase 2 | Pending |
| WFOLD-01 | Phase 2 | Pending |
| WFOLD-02 | Phase 2 | Pending |
| WFOLD-03 | Phase 2 | Pending |
| WFOLD-04 | Phase 2 | Pending |
| WFOLD-05 | Phase 2 | Pending |
| WFOLD-06 | Phase 2 | Pending |
| WFOLD-07 | Phase 2 | Pending |
| WFOLD-08 | Phase 2 | Pending |
| WEVID-01 | Phase 2 | Complete |
| WEVID-02 | Phase 2 | Complete |
| WEVID-03 | Phase 2 | Complete |
| WEVID-04 | Phase 2 | Complete |
| WEVID-05 | Phase 2 | Complete |
| WEVID-06 | Phase 2 | Complete |
| WEVID-07 | Phase 2 | Complete |
| WEVID-08 | Phase 2 | Complete |
| WIMP-01 | Phase 2 | Pending |
| WIMP-02 | Phase 2 | Pending |
| WIMP-03 | Phase 2 | Pending |
| WIMP-04 | Phase 2 | Pending |
| WIMP-05 | Phase 2 | Pending |
| WIMP-06 | Phase 2 | Pending |
| WIMP-07 | Phase 2 | Pending |
| WIMP-08 | Phase 2 | Pending |
| TRNS-01 | Phase 1 | Complete |
| TRNS-02 | Phase 3 | Complete |
| TRNS-03 | Phase 3 | Complete |
| TRNS-04 | Phase 3 | Complete |
| TRNS-05 | Phase 3 | Complete |
| TRNS-06 | Phase 3 | Complete |
| DEPL-01 | Phase 3 | Complete |
| DEPL-02 | Phase 3 | Complete |
| DEPL-03 | Phase 3 | Complete |
| DEPL-04 | Phase 3 | Complete |
| DEPL-05 | Phase 3 | Complete |
| CICD-01 | Phase 3 | Complete |
| CICD-02 | Phase 3 | Complete |
| CICD-03 | Phase 3 | Complete |
| DOCS-01 | Phase 4 | Pending |
| DOCS-02 | Phase 4 | Pending |
| DOCS-03 | Phase 4 | Pending |
| DOCS-04 | Phase 4 | Pending |
| DOCS-05 | Phase 4 | Pending |
| DOCS-06 | Phase 4 | Pending |
| DOCS-07 | Phase 4 | Pending |
| DOCS-08 | Phase 4 | Pending |
| QUAL-01 | Phase 2 | Complete |
| QUAL-02 | Phase 2 | Complete |
| QUAL-03 | Phase 2 | Complete |
| QUAL-04 | Phase 2 | Complete |
| QUAL-05 | Phase 2 | Complete |
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 1 | Complete |
| TEST-03 | Phase 1 | Complete |
| TEST-04 | Phase 2 | Complete |
| TEST-05 | Phase 2 | Complete |
| TEST-06 | Phase 3 | Complete |

**Coverage:**
- v1 requirements: 154 total
- Mapped to phases: 154
- Unmapped: 0

---
*Requirements defined: 2026-03-22*
*Last updated: 2026-03-22 after initial definition*
