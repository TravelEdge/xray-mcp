# GraphQL Schema Mismatch Fix

## Problem

Introspection audit against the live Xray Cloud GraphQL API found **70 errors** across 9 tool domains. Queries were built from LLM training data, not the live schema. Wrong mutation names, wrong argument names, wrong argument structures.

## Source of Truth

1. `schema/xray-schema.json` — live introspected schema (authoritative)
2. `schema/xray-schema-summary.md` — human-readable reference
3. Xray Cloud web docs — for opaque input types (`CreateStepInput`, `jira: JSON` shape, etc.)
4. `schema/audit-report.md` — error list driving the work

## Decision: Pass-Through API Shape

Tool Zod schemas mirror the GraphQL arguments exactly. No adapter layer — the tool isn't live yet, so there are no consumers to protect. This means:

- `createTest` accepts `jira: JSON` object, not `projectKey` + `summary`
- `updatePrecondition` accepts `data: UpdatePreconditionInput`, not flat fields
- Simpler code, one-to-one mapping, fewer bug surfaces

## Scope

### What changes per domain

- `queries.ts` — mutation names, argument names, variable types
- Handler `.ts` files — Zod input schemas, variable construction in `executeGraphQL` calls
- `fixtures.ts` — mock response shapes where return types changed
- `*.test.ts` — mock expectations for new variable names

### What does NOT change

- `XrayCloudClient.ts`, `HttpClient.ts`, `AuthManager.ts` — transport layer is correct
- REST import/export tools (9 tools) — endpoint check passed
- `ToonFormatter.ts` — already fixed in this session

## Error Categories

### Pattern 1: Mutation Renamed (5 occurrences)

| Our Name | Correct Name |
|----------|-------------|
| `updateGherkinDefinition` | `updateGherkinTestDefinition` |
| `updateUnstructuredDefinition` | `updateUnstructuredTestDefinition` |
| `updateStepComment` | `updateTestRunStepComment` |
| `updateStepStatus` | `updateTestRunStepStatus` |
| `updateExampleStatus` | `updateTestRunExampleStatus` |

Fix: rename in `queries.ts`. Handler and test updates only if the response type key also changed.

### Pattern 2: Argument Renamed (~25 occurrences)

Examples:
- `runId` → `testRunId` (evidence/step mutations)
- `issueIds` → `issues` (defect mutations)
- `environments` → `testEnvironments` (execution mutations)
- `testExecutionIssueIds` → `testExecIssueIds` (plan mutations)
- `projectId` → `projectIdOrKey` (admin)
- `iterationIndex` → `iterationRank` (runs)
- `assignee` → `assigneeId` (runs)

Fix: rename in `queries.ts` variable declarations AND handler `executeGraphQL` variables object. Update Zod schema parameter names to match.

### Pattern 3: Flat Args → `jira: JSON` (~4 create mutations)

Affected: `createTest`, `createTestPlan`, `createTestSet`, `createPrecondition`

Before: `createTest(projectKey: "PROJ", summary: "...")`
After: `createTest(jira: { fields: { project: { key: "PROJ" }, summary: "..." } })`

Fix: Rewrite Zod schema to accept `jira` object (use `z.record(z.unknown())` or structured `z.object`). Rewrite query to declare `$jira: JSON`. Update handler.

**Note on `createPrecondition`:** The current code has a partially-broken attempt at this pattern — it declares `$projectKey` and `$summary` as top-level GraphQL variables and embeds them inside an inline `jira: { fields: { project: { key: $projectKey } } }` literal. GraphQL does not allow `$variable` references inside inline object literals. This must be completely rewritten to pass `$jira: JSON` as a single variable.

### Pattern 4: Flat Args → Named Input Object (~3 update mutations)

Affected: `updatePrecondition`, `updateTestRun`, `updateTestRunStep`

Before: `updatePrecondition(issueId, preconditionType, definition)`
After: `updatePrecondition(issueId, data: { preconditionType, definition })`

Fix: Rewrite Zod schema. Wrap args into input object in handler.

### Pattern 5: Completely Different API Shape

**`updateTestRun`** — `status` argument removed entirely; use `updateTestRunStatus` for status changes instead. Correct args: `id, comment, startedOn, finishedOn, assigneeId, executedById, customFields`. Handler must drop `status`, rename `assignee` → `assigneeId`, and add `startedOn`, `finishedOn`, `executedById` as new optional parameters.

**`updateTestRunExampleStatus`** — renamed from `updateExampleStatus`, AND argument shape completely changed: `runId` + `exampleIndex` replaced by single `exampleId: String`. Handler must accept `exampleId` instead of two separate params.

**`setTestRunTimer`** — `id` → `testRunId`, AND `action: String` replaced by two booleans: `running: Boolean` and `reset: Boolean`. Complete rewrite of Zod schema and handler.

**`createFolder`** — no separate `name` argument. The `path` argument encodes the full path including the new folder name as the last segment (e.g., `/parent/newFolder`). Handler must merge folder name into path.

**`getDataset`** — takes `testIssueId, testExecIssueId, testPlanIssueId, callTestIssueId` (not `id`). Complete query + handler rewrite.

**`getDatasets`** — takes `testIssueIds, testExecIssueIds, testPlanIssueIds` (not `projectId, limit, start`). Returns `[Dataset]` NOT a paginated result set. Handler must drop pagination and change response parsing.

**`getProjectSettings`** — `projectId` → `projectIdOrKey`.

**`getIssueLinkTypes`** — takes no arguments. Parser failed on this query; needs manual verification against web docs.

### Pattern 6: Removed Args

- `getTestRuns` does NOT accept `testEnvironments` — remove from query, Zod schema, and handler
- `removeTestStep` takes only `stepId`, not `issueId` — remove `issueId` from query and handler
- `updateIterationStatus` uses `iterationRank` (not `iterationIndex`) — rename in query, Zod schema, and handler

### Pattern 7: `listTests` Folder Variable

`getTests` accepts `folder: FolderSearchInput`. Current code uses inline `folder: { path: $folder }` which embeds a variable inside an object literal. Fix: declare `$folder: FolderSearchInput` as the variable type and pass it directly.

## Opaque Input Types Requiring Web Doc Verification

The introspected schema shows type names but not internal fields for these input types. Must verify against Xray web docs before implementation:

- `CreateStepInput` — fields for `addTestStep`
- `UpdateStepInput` — fields for `updateTestStep`
- `UpdateTestRunStepInput` — fields for `updateTestRunStep` (`updateData` arg)
- `UpdatePreconditionInput` — fields for `updatePrecondition` (`data` arg)
- `UpdateTestTypeInput` — fields for `updateTestType`, `createTest`
- `UpdatePreconditionTypeInput` — fields for `createPrecondition`
- `CustomFieldInput` — fields for `updateTestRun`
- `AttachmentDataInput` — fields for evidence mutations
- `FolderSearchInput` — fields for `getTests` folder filter
- `TestWithVersionInput` — fields for mutations that accept versioned test references

## Optional Parameters Not Currently Exposed

These are NOT errors but gaps the design acknowledges for future consideration:

- `testPlanId` on folder mutations — allows folder operations scoped to a test plan
- `versionId` on test mutations — allows operating on specific test versions
- `evidenceFilenames` on `removeEvidenceFromTestRun` and `removeEvidenceFromTestRunStep`

Decision: Do not add these in this fix. They can be added later as feature enhancements.

## Domain Fix Order

| # | Domain | Errors | Key Issues |
|---|--------|--------|------------|
| 1 | tests | 15 | `jira: JSON` create, mutation renames, step arg restructuring, folder variable type |
| 2 | runs | 14 | `updateTestRun` dropped `status`, `setTestRunTimer` booleans, `updateTestRunExampleStatus` new arg shape, mutation renames |
| 3 | evidence | 8 | `runId` → `testRunId`, `issueIds` → `issues` |
| 4 | executions | 4 | `createTestExecution` flat args, `environments` → `testEnvironments` |
| 5 | plans | 4 | `jira: JSON`, `testExecIssueIds` |
| 6 | preconditions | 4 | `jira: JSON` (broken inline attempt), `data: UpdatePreconditionInput` |
| 7 | sets | 2 | `jira: JSON` |
| 8 | folders | 3 | `createFolder` path semantics, remove `path` from remove mutations |
| 9 | admin | 6 | `getDataset` completely different, `getDatasets` non-paginated, `projectIdOrKey`, `getIssueLinkTypes` manual verify |

## Execution Strategy

1. Fix each domain sequentially (queries → handlers → Zod schemas → fixtures → tests)
2. Run `pnpm build` after each domain to catch type errors early
3. For `jira: JSON` Zod schemas: use `z.object({ fields: z.record(z.unknown()) })` or a more specific shape if web docs reveal the structure
4. For input objects: define matching Zod shapes that mirror the GraphQL input type fields
5. After all 9 domains: run `pnpm test` and `pnpm introspect:audit`
6. Verify audit shows 0 errors
7. Squash all changes into a single commit

## Verification

- `pnpm build` passes (TypeScript compilation)
- `pnpm test` passes (all existing tests updated and green)
- `pnpm introspect:audit` returns 0 errors, regenerating `schema/audit-report.md`
- Manual spot-check of admin tools against web docs
- Verify all opaque input types have correct field structures per web docs
