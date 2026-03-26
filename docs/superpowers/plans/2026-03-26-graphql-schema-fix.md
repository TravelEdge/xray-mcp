# GraphQL Schema Mismatch Fix — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 70 GraphQL schema mismatches so every query and mutation matches the live Xray Cloud API, verified by `pnpm introspect:audit` returning 0 errors.

**Architecture:** Domain-by-domain sequential fixes. Each domain: fix `queries.ts` → fix handler files (Zod schemas + variable construction) → fix `fixtures.ts` → fix `*.test.ts`. Build check after each domain. Full test + audit run after all 9 domains. Single squashed commit.

**Tech Stack:** TypeScript, Zod, GraphQL (string queries), Vitest

**Spec:** `docs/superpowers/specs/2026-03-26-graphql-schema-fix-design.md`
**Schema reference:** `schema/xray-schema-summary.md`
**Audit errors:** `schema/audit-report.md`

---

## File Map

Each domain touches 3-5 files:

| Domain | queries.ts | Handlers | fixtures.ts | test file |
|--------|-----------|----------|-------------|-----------|
| tests | `src/tools/tests/queries.ts` | `createTest.ts`, `updateTestType.ts`, `updateGherkinDefinition.ts`, `updateUnstructuredDefinition.ts`, `addTestStep.ts`, `updateTestStep.ts`, `removeTestStep.ts`, `listTests.ts`, `listExpandedTests.ts` | `src/tools/tests/fixtures.ts` | `src/tools/tests/tests.test.ts` |
| runs | `src/tools/runs/queries.ts` | `updateTestRun.ts`, `updateTestRunStep.ts`, `setTestRunTimer.ts`, `updateExampleStatus.ts`, `updateIterationStatus.ts`, `updateStepComment.ts`, `updateStepStatus.ts`, `listTestRuns.ts` | `src/tools/runs/fixtures.ts` | `src/tools/runs/runs.test.ts` |
| evidence | `src/tools/evidence/queries.ts` | `addDefectsToRun.ts`, `removeDefectsFromRun.ts`, `addDefectsToStep.ts`, `removeDefectsFromStep.ts`, `addEvidenceToStep.ts`, `removeEvidenceFromStep.ts` | `src/tools/evidence/fixtures.ts` | `src/tools/evidence/evidence.test.ts` |
| executions | `src/tools/executions/queries.ts` | `createTestExecution.ts`, `addEnvironmentsToExecution.ts`, `removeEnvironmentsFromExecution.ts` | `src/tools/executions/fixtures.ts` | `src/tools/executions/executions.test.ts` |
| plans | `src/tools/plans/queries.ts` | `createTestPlan.ts`, `addExecutionsToPlan.ts`, `removeExecutionsFromPlan.ts` | `src/tools/plans/fixtures.ts` | `src/tools/plans/plans.test.ts` |
| preconditions | `src/tools/preconditions/queries.ts` | `createPrecondition.ts`, `updatePrecondition.ts` | `src/tools/preconditions/fixtures.ts` | `src/tools/preconditions/preconditions.test.ts` |
| sets | `src/tools/sets/queries.ts` | `createTestSet.ts` | `src/tools/sets/fixtures.ts` | `src/tools/sets/sets.test.ts` |
| folders | `src/tools/folders/queries.ts` | `createFolder.ts`, `removeTestsFromFolder.ts`, `removeIssuesFromFolder.ts` | `src/tools/folders/fixtures.ts` | `src/tools/folders/folders.test.ts` |
| admin | `src/tools/admin/queries.ts` | `getProjectSettings.ts`, `getDataset.ts`, `listDatasets.ts`, `listIssueLinkTypes.ts` | `src/tools/admin/fixtures.ts` | `src/tools/admin/admin.test.ts` |

---

### Task 1: Fix tests domain

**Files:**
- Modify: `src/tools/tests/queries.ts`
- Modify: `src/tools/tests/createTest.ts`
- Modify: `src/tools/tests/updateTestType.ts`
- Modify: `src/tools/tests/updateGherkinDefinition.ts`
- Modify: `src/tools/tests/updateUnstructuredDefinition.ts`
- Modify: `src/tools/tests/addTestStep.ts`
- Modify: `src/tools/tests/updateTestStep.ts`
- Modify: `src/tools/tests/removeTestStep.ts`
- Modify: `src/tools/tests/listTests.ts`
- Modify: `src/tools/tests/listExpandedTests.ts`
- Modify: `src/tools/tests/fixtures.ts`
- Modify: `src/tools/tests/tests.test.ts`

**Reference — correct schema signatures:**
```
createTest(testType: UpdateTestTypeInput, steps: CreateStepInput, unstructured: String, gherkin: String, preconditionIssueIds: String, folderPath: String, jira: JSON) → CreateTestResult
updateTestType(issueId: String, versionId: Int, testType: UpdateTestTypeInput) → Test
updateGherkinTestDefinition(issueId: String, versionId: Int, gherkin: String) → Test
updateUnstructuredTestDefinition(issueId: String, versionId: Int, unstructured: String) → Test
addTestStep(issueId: String, versionId: Int, step: CreateStepInput) → Step
updateTestStep(stepId: String, step: UpdateStepInput) → UpdateTestStepResult
removeTestStep(stepId: String) → String
getTests(jql: String, ..., folder: FolderSearchInput) → TestResults
```

- [ ] **Step 1: Read all affected files** — Read `queries.ts`, every handler listed above, `fixtures.ts`, and `tests.test.ts`. Also read `schema/xray-schema-summary.md` lines 46-54 (test mutations). Note exact current code for each query/handler.

- [ ] **Step 2: Fix queries.ts mutations** — Apply these changes:
  - `UPDATE_GHERKIN_DEFINITION`: rename mutation `updateGherkinDefinition` → `updateGherkinTestDefinition`
  - `UPDATE_UNSTRUCTURED_DEFINITION`: rename mutation `updateUnstructuredDefinition` → `updateUnstructuredTestDefinition`
  - `CREATE_TEST`: replace `$projectKey: String!, $summary: String!` with `$jira: JSON!`. Replace inline args with `jira: $jira`. Remove `$folder: String` variable — use `$folderPath: String` instead. Change `folder: { path: $folder }` to `folderPath: $folderPath`.
  - `UPDATE_TEST_TYPE`: change `testType: { name: $testType }` to `testType: $testType` (pass `UpdateTestTypeInput` directly)
  - `ADD_TEST_STEP`: change inline `$action, $data, $result` to `$step: CreateStepInput!`. Change `step: { action: $action, data: $data, result: $result }` to `step: $step`
  - `UPDATE_TEST_STEP`: remove `$issueId: String!`. Change inline `$action, $data, $result` to `$step: UpdateStepInput!`. Change args to `stepId: $stepId, step: $step`
  - `REMOVE_TEST_STEP`: remove `$issueId: String!` variable and `issueId: $issueId` arg. Keep only `$stepId: String!` / `stepId: $stepId`
  - `LIST_TESTS_TOON` and `LIST_TESTS_FULL`: change `$folder: String` to `$folder: FolderSearchInput`. Change `folder: { path: $folder }` to `folder: $folder`
  - Check `GET_EXPANDED_TEST_*` and `LIST_EXPANDED_TESTS_*` queries for the same `folder: { path: $folder }` pattern — if present, apply the same `FolderSearchInput` fix

- [ ] **Step 3: Fix handler files** — For each handler:
  - `createTest.ts`: Rewrite Zod schema to accept `jira` (JSON object), `testType` (object with `name`), `folderPath` (string), `steps`, `gherkin`, `preconditionIssueIds`. Update `executeGraphQL` variables.
  - `updateTestType.ts`: Change Zod `testType` from string to object `{ name: string }`. Update variables to pass object.
  - `updateGherkinDefinition.ts`: Update `executeGraphQL` response key from `updateGherkinDefinition` to `updateGherkinTestDefinition`
  - `updateUnstructuredDefinition.ts`: Update response key from `updateUnstructuredDefinition` to `updateUnstructuredTestDefinition`
  - `addTestStep.ts`: Change Zod schema from `action, data, result` to `step: { action, data, result }`. Update variables.
  - `updateTestStep.ts`: Remove `issueId` from Zod schema. Add `step` object. Update variables.
  - `removeTestStep.ts`: Remove `issueId` from Zod schema and variables. Keep only `stepId`.
  - `listTests.ts` and `listExpandedTests.ts`: Change `folder` variable from string path to `FolderSearchInput` object: `{ path: folderValue }`.

- [ ] **Step 4: Fix fixtures and tests** — Update mock response keys for renamed mutations. Update mock `executeGraphQL` expectations for changed variable shapes.

- [ ] **Step 5: Build check** — Run `pnpm build`. Fix any TypeScript errors. Do NOT run tests yet (other domains still broken).

---

### Task 2: Fix runs domain

**Files:**
- Modify: `src/tools/runs/queries.ts`
- Modify: `src/tools/runs/updateTestRun.ts`
- Modify: `src/tools/runs/updateTestRunStep.ts`
- Modify: `src/tools/runs/setTestRunTimer.ts`
- Modify: `src/tools/runs/updateExampleStatus.ts`
- Modify: `src/tools/runs/updateIterationStatus.ts`
- Modify: `src/tools/runs/updateStepComment.ts`
- Modify: `src/tools/runs/updateStepStatus.ts`
- Modify: `src/tools/runs/listTestRuns.ts`
- Modify: `src/tools/runs/fixtures.ts`
- Modify: `src/tools/runs/runs.test.ts`

**Reference — correct schema signatures:**
```
updateTestRun(id: String, comment: String, startedOn: String, finishedOn: String, assigneeId: String, executedById: String, customFields: CustomFieldInput) → UpdateTestRunResult
updateTestRunStep(testRunId: String, stepId: String, updateData: UpdateTestRunStepInput, iterationRank: String) → UpdateTestRunStepResult
updateTestRunStepComment(testRunId: String, stepId: String, comment: String, iterationRank: String) → String
updateTestRunStepStatus(testRunId: String, stepId: String, status: String, iterationRank: String) → UpdateTestRunStepStatusResult
updateTestRunExampleStatus(exampleId: String, status: String) → UpdateTestRunExampleStatusResult
updateIterationStatus(testRunId: String, iterationRank: String, status: String) → UpdateIterationStatusResult
setTestRunTimer(testRunId: String, running: Boolean, reset: Boolean) → String
getTestRuns(testIssueIds: String, testExecIssueIds: String, testRunAssignees: String, limit: Int, start: Int, modifiedSince: String) → TestRunResults
```

- [ ] **Step 1: Read all affected files** — Read `queries.ts`, all handlers, `fixtures.ts`, `runs.test.ts`.

- [ ] **Step 2: Fix queries.ts** — Apply:
  - `UPDATE_RUN`: remove `$status: String` and `status: $status`. Rename `$assignee` → `$assigneeId`. Add `$startedOn: String, $finishedOn: String, $executedById: String`.
  - `UPDATE_RUN_STEP`: rename `$runId` → `$testRunId`. Replace inline `$status, $comment, $evidence, $defects` with `$updateData: UpdateTestRunStepInput`. Add `$iterationRank: String`.
  - `UPDATE_STEP_COMMENT`: rename mutation `updateStepComment` → `updateTestRunStepComment`. Rename `$runId` → `$testRunId`. Add `$iterationRank: String`.
  - `UPDATE_STEP_STATUS`: rename mutation `updateStepStatus` → `updateTestRunStepStatus`. Rename `$runId` → `$testRunId`. Add `$iterationRank: String`.
  - `UPDATE_EXAMPLE_STATUS`: rename mutation `updateExampleStatus` → `updateTestRunExampleStatus`. Replace `$runId: String!, $exampleIndex: Int!` with `$exampleId: String!`. Replace args accordingly.
  - `UPDATE_ITERATION_STATUS`: rename `$runId` → `$testRunId`. Rename `$iterationIndex` → `$iterationRank: String!`.
  - `SET_RUN_TIMER`: rename `$id` → `$testRunId`. Replace `$action: String!` with `$running: Boolean, $reset: Boolean`.
  - `LIST_RUNS_TOON` and `LIST_RUNS_FULL`: remove `$testEnvironments` variable and arg.

- [ ] **Step 3: Fix handler files** — For each handler, update Zod schema and `executeGraphQL` variables to match the new query signatures. Key changes:
  - `updateTestRun.ts`: Remove `status` from Zod (status changes use the separate `updateTestRunStatus` mutation, which is already correct per audit). Rename `assignee` → `assigneeId`. Add `startedOn`, `finishedOn`, `executedById` as optional strings.
  - `updateTestRunStep.ts`: Accept `testRunId`, `stepId`, `updateData` object (with `status`, `comment`, `evidence`, `defects`), optional `iterationRank`.
  - `setTestRunTimer.ts`: Accept `testRunId`, optional `running: boolean`, optional `reset: boolean`. Remove `action` string.
  - `updateExampleStatus.ts`: Accept `exampleId` and `status`. Remove `runId` and `exampleIndex`.
  - `updateIterationStatus.ts`: Rename `runId` → `testRunId`, `iterationIndex` → `iterationRank`.
  - `updateStepComment.ts` and `updateStepStatus.ts`: Rename `runId` → `testRunId`. Add optional `iterationRank`.
  - `listTestRuns.ts`: Remove `testEnvironments` from Zod schema and variables.

- [ ] **Step 4: Fix fixtures and tests** — Update all mock expectations for renamed variables and restructured args.

- [ ] **Step 5: Build check** — Run `pnpm build`. Fix TypeScript errors.

---

### Task 3: Fix evidence domain

**Files:**
- Modify: `src/tools/evidence/queries.ts`
- Modify: `src/tools/evidence/addDefectsToRun.ts`
- Modify: `src/tools/evidence/removeDefectsFromRun.ts`
- Modify: `src/tools/evidence/addDefectsToStep.ts`
- Modify: `src/tools/evidence/removeDefectsFromStep.ts`
- Modify: `src/tools/evidence/addEvidenceToStep.ts`
- Modify: `src/tools/evidence/removeEvidenceFromStep.ts`
- Modify: `src/tools/evidence/fixtures.ts`
- Modify: `src/tools/evidence/evidence.test.ts`

**Reference — correct schema signatures:**
```
addDefectsToTestRun(id: String, issues: String) → AddDefectsResult
removeDefectsFromTestRun(id: String, issues: String) → String
addDefectsToTestRunStep(testRunId: String, stepId: String, issues: String, iterationRank: String) → AddDefectsResult
removeDefectsFromTestRunStep(testRunId: String, stepId: String, issues: String, iterationRank: String) → RemoveDefectsResult
addEvidenceToTestRunStep(testRunId: String, stepId: String, evidence: AttachmentDataInput, iterationRank: String) → AddEvidenceResult
removeEvidenceFromTestRunStep(testRunId: String, stepId: String, iterationRank: String, evidenceIds: String, evidenceFilenames: String) → RemoveEvidenceResult
```

- [ ] **Step 1: Read all affected files.**

- [ ] **Step 2: Fix queries.ts** — Apply:
  - `ADD_DEFECTS_TO_RUN`: rename `$issueIds` → `$issues`
  - `REMOVE_DEFECTS_FROM_RUN`: rename `$issueIds` → `$issues`
  - `ADD_DEFECTS_TO_STEP`: rename `$runId` → `$testRunId`, `$issueIds` → `$issues`
  - `REMOVE_DEFECTS_FROM_STEP`: rename `$runId` → `$testRunId`, `$issueIds` → `$issues`
  - `ADD_EVIDENCE_TO_STEP`: rename `$runId` → `$testRunId`
  - `REMOVE_EVIDENCE_FROM_STEP`: rename `$runId` → `$testRunId`. Keep `$evidenceIds` as-is (already correct per schema).

- [ ] **Step 3: Fix handlers** — Update Zod schemas and variable names in each handler to match.

- [ ] **Step 4: Fix fixtures and tests.**

- [ ] **Step 5: Build check** — Run `pnpm build`.

---

### Task 4: Fix executions domain

**Files:**
- Modify: `src/tools/executions/queries.ts`
- Modify: `src/tools/executions/createTestExecution.ts`
- Modify: `src/tools/executions/addEnvironmentsToExecution.ts`
- Modify: `src/tools/executions/removeEnvironmentsFromExecution.ts`
- Modify: `src/tools/executions/fixtures.ts`
- Modify: `src/tools/executions/executions.test.ts`

**Reference — correct schema signatures:**
```
createTestExecution(testIssueIds: String, tests: TestWithVersionInput, testEnvironments: String, jira: JSON) → CreateTestExecutionResult
addTestEnvironmentsToTestExecution(issueId: String, testEnvironments: String) → AddTestEnvironmentsResult
removeTestEnvironmentsFromTestExecution(issueId: String, testEnvironments: String) → String
```

- [ ] **Step 1: Read all affected files.**

- [ ] **Step 2: Fix queries.ts** — Apply:
  - `CREATE_EXECUTION`: replace `$testExecution: CreateTestExecutionInput!` with individual args `$testIssueIds: [String!], $tests: [TestWithVersionInput], $testEnvironments: [String!], $jira: JSON!`
  - `ADD_ENVIRONMENTS_TO_EXECUTION`: rename `$environments` → `$testEnvironments`
  - `REMOVE_ENVIRONMENTS_FROM_EXECUTION`: rename `$environments` → `$testEnvironments`

- [ ] **Step 3: Fix handlers** — `createTestExecution.ts`: rewrite Zod schema to accept `jira`, `testIssueIds`, `tests` (optional, for versioned test references), `testEnvironments` directly. Environment handlers: rename `environments` → `testEnvironments` in Zod and variables.

- [ ] **Step 4: Fix fixtures and tests.**

- [ ] **Step 5: Build check.**

---

### Task 5: Fix plans domain

**Files:**
- Modify: `src/tools/plans/queries.ts`
- Modify: `src/tools/plans/createTestPlan.ts`
- Modify: `src/tools/plans/addExecutionsToPlan.ts`
- Modify: `src/tools/plans/removeExecutionsFromPlan.ts`
- Modify: `src/tools/plans/fixtures.ts`
- Modify: `src/tools/plans/plans.test.ts`

**Reference — correct schema signatures:**
```
createTestPlan(savedFilter: String, testIssueIds: String, jira: JSON) → CreateTestPlanResult
addTestExecutionsToTestPlan(issueId: String, testExecIssueIds: String) → AddTestExecutionsResult
removeTestExecutionsFromTestPlan(issueId: String, testExecIssueIds: String) → String
```

- [ ] **Step 1: Read all affected files.**

- [ ] **Step 2: Fix queries.ts** — Apply:
  - `CREATE_PLAN`: replace `$projectKey, $summary` with `$jira: JSON!`. Add `$savedFilter: String`. Preserve existing `$testIssueIds: [String!]` — it is already correct.
  - `ADD_EXECUTIONS_TO_PLAN`: rename `$testExecutionIssueIds` → `$testExecIssueIds`
  - `REMOVE_EXECUTIONS_FROM_PLAN`: rename `$testExecutionIssueIds` → `$testExecIssueIds`

- [ ] **Step 3: Fix handlers.**
- [ ] **Step 4: Fix fixtures and tests.**
- [ ] **Step 5: Build check.**

---

### Task 6: Fix preconditions domain

**Files:**
- Modify: `src/tools/preconditions/queries.ts`
- Modify: `src/tools/preconditions/createPrecondition.ts`
- Modify: `src/tools/preconditions/updatePrecondition.ts`
- Modify: `src/tools/preconditions/fixtures.ts`
- Modify: `src/tools/preconditions/preconditions.test.ts`

**Reference — correct schema signatures:**
```
createPrecondition(preconditionType: UpdatePreconditionTypeInput, definition: String, testIssueIds: String, tests: TestWithVersionInput, folderPath: String, jira: JSON) → CreatePreconditionResult
updatePrecondition(issueId: String, data: UpdatePreconditionInput) → Precondition
```

- [ ] **Step 1: Read all affected files.** Note: `createPrecondition` has a partially broken attempt at `jira` inline — needs complete rewrite.

- [ ] **Step 2: Fix queries.ts** — Apply:
  - `CREATE_PRECONDITION`: rewrite completely. Replace `$projectKey, $summary, $fields` variables with `$jira: JSON!, $preconditionType: UpdatePreconditionTypeInput, $definition: String, $testIssueIds: [String!], $folderPath: String`.
  - `UPDATE_PRECONDITION`: replace individual `$preconditionType, $definition` with `$data: UpdatePreconditionInput!`.

- [ ] **Step 3: Fix handlers.** — `createPrecondition.ts`: Zod accepts `jira`, `preconditionType`, `definition`, `testIssueIds`, `folderPath`. `updatePrecondition.ts`: Zod accepts `issueId` and `data` object.

- [ ] **Step 4: Fix fixtures and tests.**
- [ ] **Step 5: Build check.**

---

### Task 7: Fix sets domain

**Files:**
- Modify: `src/tools/sets/queries.ts`
- Modify: `src/tools/sets/createTestSet.ts`
- Modify: `src/tools/sets/fixtures.ts`
- Modify: `src/tools/sets/sets.test.ts`

**Reference — correct schema signature:**
```
createTestSet(testIssueIds: String, jira: JSON) → CreateTestSetResult
```

- [ ] **Step 1: Read all affected files.**
- [ ] **Step 2: Fix queries.ts** — Replace `$projectKey, $summary` with `$jira: JSON!, $testIssueIds: [String!]`.
- [ ] **Step 3: Fix handler** — Zod accepts `jira` and `testIssueIds`.
- [ ] **Step 4: Fix fixtures and tests.**
- [ ] **Step 5: Build check.**

---

### Task 8: Fix folders domain

**Files:**
- Modify: `src/tools/folders/queries.ts`
- Modify: `src/tools/folders/createFolder.ts`
- Modify: `src/tools/folders/removeTestsFromFolder.ts`
- Modify: `src/tools/folders/removeIssuesFromFolder.ts`
- Modify: `src/tools/folders/fixtures.ts`
- Modify: `src/tools/folders/folders.test.ts`

**Reference — correct schema signatures:**
```
createFolder(projectId: String, testPlanId: String, path: String, testIssueIds: String, issueIds: String) → ActionFolderResult
removeTestsFromFolder(projectId: String, testPlanId: String, testIssueIds: String) → String
removeIssuesFromFolder(projectId: String, issueIds: String) → String
```

- [ ] **Step 1: Read all affected files.**

- [ ] **Step 2: Fix queries.ts** — Apply:
  - `CREATE_FOLDER`: remove `$name` variable. Path now includes folder name as last segment.
  - `REMOVE_TESTS_FROM_FOLDER`: remove `$path` variable/arg.
  - `REMOVE_ISSUES_FROM_FOLDER`: remove `$path` variable/arg.

- [ ] **Step 3: Fix handlers** — `createFolder.ts`: Remove `name` from Zod. Document that `path` must include the new folder name. `removeTestsFromFolder.ts` and `removeIssuesFromFolder.ts`: remove `path` from Zod and variables.

- [ ] **Step 4: Fix fixtures and tests.**
- [ ] **Step 5: Build check.**

---

### Task 9: Fix admin domain

**Files:**
- Modify: `src/tools/admin/queries.ts`
- Modify: `src/tools/admin/getProjectSettings.ts`
- Modify: `src/tools/admin/getDataset.ts`
- Modify: `src/tools/admin/listDatasets.ts`
- Modify: `src/tools/admin/listIssueLinkTypes.ts`
- Modify: `src/tools/admin/fixtures.ts`
- Modify: `src/tools/admin/admin.test.ts`

**Reference — correct schema signatures:**
```
getProjectSettings(projectIdOrKey: String) → ProjectSettings
getDataset(testIssueId: String, testExecIssueId: String, testPlanIssueId: String, callTestIssueId: String) → Dataset
getDatasets(testIssueIds: String, testExecIssueIds: String, testPlanIssueIds: String) → [Dataset]
getIssueLinkTypes() → [IssueLinkType]
```

- [ ] **Step 1: Read all affected files.** Fetch Xray web docs to verify `getIssueLinkTypes` response shape and `getDataset`/`getDatasets` field structures.

- [ ] **Step 2: Fix queries.ts** — Apply:
  - `GET_PROJECT_SETTINGS`: rename `$projectId` → `$projectIdOrKey`
  - `GET_DATASET_TOON` and `GET_DATASET_FULL`: replace `$id: String!` with `$testIssueId: String!, $testExecIssueId: String, $testPlanIssueId: String, $callTestIssueId: String`
  - `LIST_DATASETS_TOON` and `LIST_DATASETS_FULL`: replace `$projectId, $limit, $start` with `$testIssueIds: [String!], $testExecIssueIds: [String!], $testPlanIssueIds: [String!]`. Remove pagination — `getDatasets` returns `[Dataset]` directly.
  - `GET_ISSUE_LINK_TYPES`: verify query parses correctly. Fix if needed.

- [ ] **Step 3: Fix handlers** — `getProjectSettings.ts`: rename Zod `projectId` → `projectIdOrKey`. `getDataset.ts`: rewrite Zod to accept `testIssueId`, `testExecIssueId`, `testPlanIssueId`, `callTestIssueId`. `listDatasets.ts`: rewrite Zod to accept array IDs, remove pagination, change response parsing (no `total`/`results` wrapper). `listIssueLinkTypes.ts`: verify handler works.

- [ ] **Step 4: Fix fixtures and tests.**
- [ ] **Step 5: Build check.**

---

### Task 10: Full verification and squash commit

**Files:** None created — verification only.

- [ ] **Step 1: Run full test suite** — `pnpm test`. All 369+ tests must pass.

- [ ] **Step 2: Run introspection audit** — `pnpm introspect:audit`. Must return 0 errors. (Requires `XRAY_CLIENT_ID` and `XRAY_CLIENT_SECRET` env vars set.)

- [ ] **Step 3: If audit not possible** (no credentials in this session), verify manually:
  - `grep -r "as XrayCloudClient" src/tools/` returns 0 matches
  - Every mutation name in all `queries.ts` files matches a mutation listed in `schema/xray-schema-summary.md`
  - Every root query field in all `queries.ts` files matches a query listed in `schema/xray-schema-summary.md`

- [ ] **Step 4: Squash all changes into a single commit**
  ```bash
  git add -A
  git commit -m "fix: align all GraphQL queries and mutations with live Xray Cloud schema

  - Fix 70 schema mismatches found by introspection audit
  - Rename 5 mutations to match API (updateGherkinTestDefinition, etc.)
  - Fix ~25 argument name mismatches (runId→testRunId, issueIds→issues, etc.)
  - Restructure create mutations to use jira: JSON input
  - Restructure update mutations to use named input objects
  - Rewrite admin tools for correct getDataset/getDatasets signatures
  - Remove non-existent args (testEnvironments on getTestRuns, etc.)
  - Update all Zod schemas, handlers, fixtures, and tests"
  ```
