# Xray MCP Tools Reference

> Auto-generated from tool registry. Do not edit manually.
> Regenerate with `pnpm generate:tools-doc`.

**Total tools: 90**

## Contents

- [Tests](#tests) (13 tools)
- [Test Executions](#test-executions) (8 tools)
- [Test Plans](#test-plans) (8 tools)
- [Test Sets](#test-sets) (6 tools)
- [Test Runs](#test-runs) (14 tools)
- [Preconditions](#preconditions) (7 tools)
- [Folders](#folders) (9 tools)
- [Evidence & Defects](#evidence-defects) (8 tools)
- [Imports](#imports) (8 tools)
- [Admin & Settings](#admin-settings) (9 tools)

## Tests

| Tool | Access | Description |
|------|--------|-------------|
| `xray_get_test_details` | read | Get full details of an Xray test by issue ID, including steps, type, status, and relations. For Jira issue fields (assignee, components, etc.), use the Atlassian MCP server instead. |
| `xray_get_expanded_test` | read | Get an Xray test with call-test steps resolved (nested step expansion). For Jira issue fields, use the Atlassian MCP server instead. |
| `xray_list_tests` | read | List Xray tests with optional JQL filter and folder path. Supports pagination with limit/start parameters. |
| `xray_list_expanded_tests` | read | List Xray tests with expanded (nested) step data. Defaults to limit 10 (not 50) because nested step resolution is expensive. Supports pagination with limit/start parameters. |
| `xray_create_test` | write | Create a new Xray test (Manual, Cucumber, or Generic). Returns a confirmation with the new test issue ID. |
| `xray_delete_test` | write | Delete an Xray test by issue ID. Returns a deletion confirmation. |
| `xray_update_test_type` | write | Change the test type of an Xray test (Manual, Cucumber, Generic). |
| `xray_update_gherkin_definition` | write | Update the Gherkin (BDD) definition of a Cucumber-type Xray test. |
| `xray_update_unstructured_definition` | write | Update the definition text of a Generic (unstructured) Xray test. |
| `xray_add_test_step` | write | Add a new step to a Manual Xray test. |
| `xray_update_test_step` | write | Update an existing step in a Manual Xray test. |
| `xray_remove_test_step` | write | Remove a specific step from a Manual Xray test by step ID. |
| `xray_remove_all_test_steps` | write | WARNING: This permanently removes ALL steps from the test. This action cannot be undone. Use xray_remove_test_step to remove individual steps safely. |

### `xray_get_test_details`

**Parameters:**

- `issueId` — The Jira issue ID of the test (e.g. PROJ-123)

### `xray_get_expanded_test`

**Parameters:**

- `issueId` — The Jira issue ID of the test (e.g. PROJ-123)

### `xray_list_tests`

**Parameters:**

- `jql` *(optional)* — JQL query to filter results (e.g. 'project = PROJ AND status = TODO')
- `folder` *(optional)* — Filter by folder path (e.g. /Regression/Login)
- `limit` *(optional)* — Number of results per page (1-100, default 50)
- `start` *(optional)* — Offset for pagination (0-based)

### `xray_list_expanded_tests`

**Parameters:**

- `jql` *(optional)* — JQL query to filter results (e.g. 'project = PROJ AND status = TODO')
- `folder` *(optional)* — Filter by folder path (e.g. /Regression/Login)
- `limit` *(optional)* — Number of results per page (1-100, default 10 — lower default due to expensive nested step resolution)
- `start` *(optional)* — Offset for pagination (0-based)

### `xray_create_test`

**Parameters:**

- `jira` — Jira issue fields as JSON (e.g. { "fields": { "project": { "key": "PROJ" }, "summary": "Test name" } })
- `testType` *(optional)* — Test type (e.g. { "name": "Manual" })
- `folderPath` *(optional)* — Folder path to place the test in (e.g. /Regression)
- `steps` *(optional)* — Initial steps for Manual tests
- `gherkin` *(optional)* — Full Gherkin scenario text (for Cucumber tests)
- `preconditionIssueIds` *(optional)* — Precondition issue IDs to associate with this test

### `xray_delete_test`

**Parameters:**

- `issueId` — The Jira issue ID of the test to delete (e.g. PROJ-123)

### `xray_update_test_type`

**Parameters:**

- `issueId` — The Jira issue ID of the test (e.g. PROJ-123)
- `testType` — New test type (e.g. { "name": "Manual" })

### `xray_update_gherkin_definition`

**Parameters:**

- `issueId` — The Jira issue ID of the test (e.g. PROJ-123)
- `gherkin` — Full Gherkin scenario text (Feature/Scenario/Given/When/Then)

### `xray_update_unstructured_definition`

**Parameters:**

- `issueId` — The Jira issue ID of the test (e.g. PROJ-123)
- `unstructured` — New definition text for the Generic test

### `xray_add_test_step`

**Parameters:**

- `issueId` — The Jira issue ID of the test (e.g. PROJ-123)
- `step` — Step data to add

### `xray_update_test_step`

**Parameters:**

- `stepId` — The ID of the step to update
- `step` — Step fields to update

### `xray_remove_test_step`

**Parameters:**

- `stepId` — The ID of the step to remove

### `xray_remove_all_test_steps`

**Parameters:**

- `issueId` — The Jira issue ID of the test (e.g. PROJ-123)

## Test Executions

| Tool | Access | Description |
|------|--------|-------------|
| `xray_get_test_execution` | read | Get test execution details including runs, environments, and linked test plan. For Jira issue fields, use the Atlassian MCP server instead. |
| `xray_list_test_executions` | read | List test executions with optional JQL filter and pagination. For Jira issue fields, use the Atlassian MCP server instead. |
| `xray_create_test_execution` | write | Create a new test execution, optionally linking tests and environments. Returns the new execution key. |
| `xray_delete_test_execution` | write | Delete a test execution by issue key. This action cannot be undone. |
| `xray_add_tests_to_execution` | write | Add one or more tests to an existing test execution. |
| `xray_remove_tests_from_execution` | write | Remove one or more tests from a test execution. |
| `xray_add_environments_to_execution` | write | Add test environments to an existing test execution. |
| `xray_remove_environments_from_execution` | write | Remove test environments from a test execution. |

### `xray_get_test_execution`

**Parameters:**

- `issueId` — Test execution issue key, e.g. PROJ-456

### `xray_list_test_executions`

**Parameters:**

- `jql` *(optional)* — JQL query to filter results (e.g. 'project = PROJ AND status = TODO')
- `limit` *(optional)* — Number of results per page (1-100, default 50)
- `start` *(optional)* — Offset for pagination (0-based)

### `xray_create_test_execution`

**Parameters:**

- `jira` — Jira fields JSON object, e.g. { "fields": { "summary": "...", "project": { "key": "PROJ" } } }
- `testIssueIds` *(optional)* — Issue keys of tests to add to this execution
- `tests` *(optional)* — Tests with version info to add to this execution
- `testEnvironments` *(optional)* — Test environment names, e.g. ['Chrome', 'Firefox']

### `xray_delete_test_execution`

**Parameters:**

- `issueId` — Test execution issue key to delete, e.g. PROJ-456

### `xray_add_tests_to_execution`

**Parameters:**

- `issueId` — Test execution issue key, e.g. PROJ-456
- `testIssueIds` — Issue keys of tests to add, e.g. ['PROJ-1', 'PROJ-2']

### `xray_remove_tests_from_execution`

**Parameters:**

- `issueId` — Test execution issue key, e.g. PROJ-456
- `testIssueIds` — Issue keys of tests to remove, e.g. ['PROJ-1', 'PROJ-2']

### `xray_add_environments_to_execution`

**Parameters:**

- `issueId` — Test execution issue key, e.g. PROJ-456
- `testEnvironments` — Environment names to add, e.g. ['Chrome', 'Firefox']

### `xray_remove_environments_from_execution`

**Parameters:**

- `issueId` — Test execution issue key, e.g. PROJ-456
- `testEnvironments` — Environment names to remove, e.g. ['Chrome']

## Test Plans

| Tool | Access | Description |
|------|--------|-------------|
| `xray_get_test_plan` | read | Get a single Xray test plan by issue ID, including its tests and test executions. Returns plan details in TOON (compact) or JSON format. |
| `xray_list_test_plans` | read | List Xray test plans with optional JQL filter and pagination. Returns paginated plan list with test and execution counts. |
| `xray_create_test_plan` | write | Create a new Xray test plan via Jira JSON payload. Optionally add tests immediately on creation. |
| `xray_delete_test_plan` | write | Delete an Xray test plan by issue ID. This action is irreversible. |
| `xray_add_tests_to_plan` | write | Add one or more tests to an existing Xray test plan. |
| `xray_remove_tests_from_plan` | write | Remove one or more tests from an existing Xray test plan. |
| `xray_add_executions_to_plan` | write | Add one or more test executions to an existing Xray test plan. |
| `xray_remove_executions_from_plan` | write | Remove one or more test executions from an existing Xray test plan. |

### `xray_get_test_plan`

**Parameters:**

- `issueId` — Jira issue ID of the test plan (e.g. '12345')

### `xray_list_test_plans`

**Parameters:**

- `jql` *(optional)* — JQL query to filter results (e.g. 'project = PROJ AND status = TODO')
- `limit` *(optional)* — Number of results per page (1-100, default 50)
- `start` *(optional)* — Offset for pagination (0-based)

### `xray_create_test_plan`

**Parameters:**

- `jira` — Jira field payload (JSON object) — must include at minimum the project key and summary, e.g. {"fields":{"project":{"key":"PROJ"},"summary":"My Plan"}}
- `savedFilter` *(optional)* — Optional saved filter ID to associate with the test plan
- `testIssueIds` *(optional)* — Optional list of test issue IDs to add to the plan immediately

### `xray_delete_test_plan`

**Parameters:**

- `issueId` — Jira issue ID of the test plan to delete

### `xray_add_tests_to_plan`

**Parameters:**

- `issueId` — Jira issue ID of the test plan
- `testIssueIds` — List of test issue IDs to add to the plan

### `xray_remove_tests_from_plan`

**Parameters:**

- `issueId` — Jira issue ID of the test plan
- `testIssueIds` — List of test issue IDs to remove from the plan

### `xray_add_executions_to_plan`

**Parameters:**

- `issueId` — Jira issue ID of the test plan
- `testExecIssueIds` — List of test execution issue IDs to add to the plan

### `xray_remove_executions_from_plan`

**Parameters:**

- `issueId` — Jira issue ID of the test plan
- `testExecIssueIds` — List of test execution issue IDs to remove from the plan

## Test Sets

| Tool | Access | Description |
|------|--------|-------------|
| `xray_get_test_set` | read | Get a test set with its associated tests. Test sets group tests for reuse across executions. |
| `xray_list_test_sets` | read | List test sets with optional JQL filter and pagination. Returns sets with associated test counts. |
| `xray_create_test_set` | write | Create a new test set in a Jira project. Optionally include initial tests. |
| `xray_delete_test_set` | write | Delete a test set by its Jira issue ID. This removes the test set issue from Jira. |
| `xray_add_tests_to_set` | write | Add tests to an existing test set. Tests are referenced by their Jira issue IDs. |
| `xray_remove_tests_from_set` | write | Remove tests from a test set. Tests are referenced by their Jira issue IDs. |

### `xray_get_test_set`

**Parameters:**

- `issueId` — Jira issue ID of the test set (e.g. '10042')

### `xray_list_test_sets`

**Parameters:**

- `jql` *(optional)* — JQL query to filter results (e.g. 'project = PROJ AND status = TODO')
- `limit` *(optional)* — Number of results per page (1-100, default 50)
- `start` *(optional)* — Offset for pagination (0-based)

### `xray_create_test_set`

**Parameters:**

- `jira` — Jira fields JSON object (must include project key and summary, e.g. { "fields": { "project": { "key": "PROJ" }, "summary": "My set" } })
- `testIssueIds` *(optional)* — Optional array of test issue IDs to add to the set

### `xray_delete_test_set`

**Parameters:**

- `issueId` — Jira issue ID of the test set to delete (e.g. '10042')

### `xray_add_tests_to_set`

**Parameters:**

- `issueId` — Jira issue ID of the test set (e.g. '10042')
- `testIssueIds` — Array of test issue IDs to add to the set

### `xray_remove_tests_from_set`

**Parameters:**

- `issueId` — Jira issue ID of the test set (e.g. '10042')
- `testIssueIds` — Array of test issue IDs to remove from the set

## Test Runs

| Tool | Access | Description |
|------|--------|-------------|
| `xray_get_test_run` | read | Get a test run by test issue key and test execution issue key. Returns the run status, comment, and timing. |
| `xray_get_test_run_by_id` | read | Get a test run by its internal Xray run ID. Use xray_get_test_run if you have test+execution keys instead. |
| `xray_list_test_runs` | read | List all test runs for a given test issue, with pagination. |
| `xray_list_test_runs_by_id` | read | Get multiple test runs by their internal Xray run IDs in a single request. |
| `xray_update_test_run_status` | write | Update the status of a test run. |
| `xray_update_test_run_comment` | write | Update the comment on a test run. |
| `xray_update_test_run` | write | Perform a full update of a test run: comment, assignee, dates, executedBy, and custom fields in one call. |
| `xray_reset_test_run` | write | WARNING: Resets test run to initial state, clearing all status, comments, and step results. This action cannot be undone. |
| `xray_update_step_status` | write | Update the status of a specific step within a test run. |
| `xray_update_step_comment` | write | Update the comment on a specific step within a test run. |
| `xray_update_test_run_step` | write | Perform a full update of a test run step via UpdateTestRunStepInput: status, comment, evidence, and defects in one call. |
| `xray_update_example_status` | write | Update the status of a specific example (BDD/data-driven test row) within a test run. |
| `xray_update_iteration_status` | write | Update the status of a specific iteration (data-set test row) within a test run. |
| `xray_set_test_run_timer` | write | Control the execution timer for a test run. Set running=true to start, running=false to stop, reset=true to reset. |

### `xray_get_test_run`

**Parameters:**

- `testIssueId` — The Jira issue key of the test (e.g. 'PROJ-123')
- `testExecIssueId` — The Jira issue key of the test execution (e.g. 'PROJ-456')

### `xray_get_test_run_by_id`

**Parameters:**

- `id` — The internal Xray test run ID (e.g. 'run-42')

### `xray_list_test_runs`

**Parameters:**

- `testIssueId` — The Jira issue key of the test (e.g. 'PROJ-123')
- `limit` *(optional)* — Number of results per page (1-100, default 50)
- `start` *(optional)* — Offset for pagination (0-based)

### `xray_list_test_runs_by_id`

**Parameters:**

- `ids` — Array of internal Xray test run IDs

### `xray_update_test_run_status`

**Parameters:**

- `id` — The internal Xray test run ID
- `status` — New status for the test run

### `xray_update_test_run_comment`

**Parameters:**

- `id` — The internal Xray test run ID
- `comment` — New comment text for the test run

### `xray_update_test_run`

**Parameters:**

- `id` — The internal Xray test run ID
- `comment` *(optional)* — New comment text
- `assigneeId` *(optional)* — Assignee user account ID
- `startedOn` *(optional)* — Start date/time in ISO 8601 format
- `finishedOn` *(optional)* — Finish date/time in ISO 8601 format
- `executedById` *(optional)* — Executed-by user account ID
- `customFields` *(optional)* — Custom field values as key-value pairs

### `xray_reset_test_run`

**Parameters:**

- `id` — The internal Xray test run ID to reset

### `xray_update_step_status`

**Parameters:**

- `testRunId` — The internal Xray test run ID
- `stepId` — The internal Xray step ID within the run
- `status` — New status for the step
- `iterationRank` *(optional)* — Rank of the iteration to update (for parameterized tests)

### `xray_update_step_comment`

**Parameters:**

- `testRunId` — The internal Xray test run ID
- `stepId` — The internal Xray step ID within the run
- `comment` — New comment text for the step
- `iterationRank` *(optional)* — Rank of the iteration to update (for parameterized tests)

### `xray_update_test_run_step`

**Parameters:**

- `testRunId` — The internal Xray test run ID
- `stepId` — The internal Xray step ID within the run
- `updateData` *(optional)* — Update data for the step (status, comment, evidence, defects)
- `iterationRank` *(optional)* — Rank of the iteration to update (for parameterized tests)

### `xray_update_example_status`

**Parameters:**

- `exampleId` — The internal Xray example ID
- `status` — New status for the example

### `xray_update_iteration_status`

**Parameters:**

- `testRunId` — The internal Xray test run ID
- `iterationRank` — Rank of the iteration in the test run
- `status` — New status for the iteration

### `xray_set_test_run_timer`

**Parameters:**

- `testRunId` — The internal Xray test run ID
- `running` *(optional)* — Set to true to start the timer, false to stop it
- `reset` *(optional)* — Set to true to reset the timer

## Preconditions

| Tool | Access | Description |
|------|--------|-------------|
| `xray_get_precondition` | read | Get an Xray precondition by issue ID, including precondition type, definition, and linked tests. For Jira issue fields (reporter, priority, labels) use the Atlassian MCP server. |
| `xray_list_preconditions` | read | List Xray preconditions with optional JQL filter and pagination. Preconditions define setup conditions that must be met before tests execute. |
| `xray_create_precondition` | write | Create a new Xray precondition issue. Preconditions define setup requirements (e.g. user logged in, database seeded) that must be satisfied before tests can execute. |
| `xray_update_precondition` | write | Update an existing Xray precondition's type and/or definition. At least one of preconditionType or definition must be provided. |
| `xray_delete_precondition` | write | Delete an Xray precondition permanently. This also unlinks it from all associated tests. This action cannot be undone. |
| `xray_add_tests_to_precondition` | write | Link one or more tests to an Xray precondition. The precondition will appear as a setup requirement for the linked tests. |
| `xray_remove_tests_from_precondition` | write | Unlink one or more tests from an Xray precondition. The precondition will no longer appear as a setup requirement for the unlinked tests. |

### `xray_get_precondition`

**Parameters:**

- `issueId` — Precondition issue key, e.g. PROJ-123

### `xray_list_preconditions`

**Parameters:**

- `jql` *(optional)* — JQL query to filter results (e.g. 'project = PROJ AND status = TODO')
- `limit` *(optional)* — Number of results per page (1-100, default 50)
- `start` *(optional)* — Offset for pagination (0-based)

### `xray_create_precondition`

**Parameters:**

- `jira` — Jira fields JSON, e.g. { "fields": { "project": { "key": "PROJ" }, "summary": "My precondition" } }
- `preconditionType` *(optional)* — Precondition type, e.g. { "name": "Manual" }
- `definition` *(optional)* — Precondition definition/steps text
- `testIssueIds` *(optional)* — Issue IDs of tests to link to this precondition
- `folderPath` *(optional)* — Folder path for the precondition

### `xray_update_precondition`

**Parameters:**

- `issueId` — Precondition issue key, e.g. PROJ-123
- `data` — Fields to update on the precondition

### `xray_delete_precondition`

**Parameters:**

- `issueId` — Precondition issue key to delete, e.g. PROJ-123

### `xray_add_tests_to_precondition`

**Parameters:**

- `issueId` — Precondition issue key, e.g. PROJ-123
- `testIssueIds` — Issue keys of tests to link to this precondition

### `xray_remove_tests_from_precondition`

**Parameters:**

- `issueId` — Precondition issue key, e.g. PROJ-123
- `testIssueIds` — Issue keys of tests to unlink from this precondition

## Folders

| Tool | Access | Description |
|------|--------|-------------|
| `xray_get_folder` | read | Get a folder in the Xray repository hierarchy by project and path. Returns folder name, path, test count, and immediate subfolders. |
| `xray_create_folder` | write | Create a new folder in the Xray repository hierarchy. |
| `xray_delete_folder` | write | WARNING: Deleting a folder may affect tests contained within it. Delete a folder from the Xray repository hierarchy by project and path. |
| `xray_rename_folder` | write | Rename a folder in the Xray repository hierarchy. |
| `xray_move_folder` | write | Move a folder to a new location in the Xray repository hierarchy. |
| `xray_add_tests_to_folder` | write | Add tests to a folder in the Xray repository hierarchy. |
| `xray_remove_tests_from_folder` | write | Remove tests from a folder in the Xray repository hierarchy. |
| `xray_add_issues_to_folder` | write | Add issues (preconditions) to a folder in the Xray repository hierarchy. |
| `xray_remove_issues_from_folder` | write | Remove issues (preconditions) from a folder in the Xray repository hierarchy. |

### `xray_get_folder`

**Parameters:**

- `projectId` — Jira project ID, e.g. '10000'
- `path` — Folder path, e.g. '/Regression/Login'

### `xray_create_folder`

**Parameters:**

- `projectId` — Jira project ID, e.g. '10000'
- `path` — Full folder path including the new folder name as the last segment, e.g. '/Regression/Login'

### `xray_delete_folder`

**Parameters:**

- `projectId` — Jira project ID, e.g. '10000'
- `path` — Folder path to delete, e.g. '/Regression/Login'

### `xray_rename_folder`

**Parameters:**

- `projectId` — Jira project ID, e.g. '10000'
- `path` — Current folder path, e.g. '/Regression/Login'
- `newName` — New name for the folder

### `xray_move_folder`

**Parameters:**

- `projectId` — Jira project ID, e.g. '10000'
- `path` — Current folder path, e.g. '/Regression/Login'
- `destinationPath` — Destination parent path, e.g. '/Smoke' to move folder under Smoke

### `xray_add_tests_to_folder`

**Parameters:**

- `projectId` — Jira project ID, e.g. '10000'
- `path` — Folder path, e.g. '/Regression/Login'
- `testIssueIds` — Array of test issue IDs to add to the folder

### `xray_remove_tests_from_folder`

**Parameters:**

- `projectId` — Jira project ID, e.g. '10000'
- `testIssueIds` — Array of test issue IDs to remove from the folder

### `xray_add_issues_to_folder`

**Parameters:**

- `projectId` — Jira project ID, e.g. '10000'
- `path` — Folder path, e.g. '/Regression/Login'
- `issueIds` — Array of issue IDs (preconditions) to add to the folder

### `xray_remove_issues_from_folder`

**Parameters:**

- `projectId` — Jira project ID, e.g. '10000'
- `issueIds` — Array of issue IDs (preconditions) to remove from the folder

## Evidence & Defects

| Tool | Access | Description |
|------|--------|-------------|
| `xray_add_evidence_to_run` | write | Attach evidence to a test run. Pass base64-encoded file content with filename and mimeType. Evidence can be screenshots, PDFs, or log files. Use the Read tool or user attachment to obtain base64 content before calling this tool. |
| `xray_remove_evidence_from_run` | write | Remove evidence attachments from a test run by their evidence IDs. |
| `xray_add_defects_to_run` | write | Link Jira issues as defects to a test run. Pass an array of Jira issue keys (e.g. PROJ-123). For Jira issue fields, use the Atlassian MCP server instead. |
| `xray_remove_defects_from_run` | write | Unlink Jira issues (defects) from a test run. |
| `xray_add_evidence_to_step` | write | Attach evidence to a specific step within a test run. Pass base64-encoded file content with filename and mimeType. Use the Read tool or user attachment to obtain base64 content before calling this tool. |
| `xray_remove_evidence_from_step` | write | Remove evidence attachments from a specific step within a test run. |
| `xray_add_defects_to_step` | write | Link Jira issues as defects to a specific step within a test run. For Jira issue fields, use the Atlassian MCP server instead. |
| `xray_remove_defects_from_step` | write | Unlink Jira issues (defects) from a specific step within a test run. |

### `xray_add_evidence_to_run`

**Parameters:**

- `id` — Test run internal ID
- `content` — Base64-encoded file content (screenshot, PDF, log). Max ~7.5MB decoded.
- `filename` — Filename with extension, e.g. screenshot.png
- `mimeType` — MIME type, e.g. image/png, application/pdf, text/plain

### `xray_remove_evidence_from_run`

**Parameters:**

- `id` — Test run internal ID
- `evidenceIds` — Evidence IDs to remove from the test run

### `xray_add_defects_to_run`

**Parameters:**

- `id` — Test run internal ID
- `issues` — Jira issue keys to link as defects, e.g. ['PROJ-123']

### `xray_remove_defects_from_run`

**Parameters:**

- `id` — Test run internal ID
- `issues` — Jira issue keys to unlink as defects

### `xray_add_evidence_to_step`

**Parameters:**

- `testRunId` — Test run internal ID
- `stepId` — Test run step internal ID
- `content` — Base64-encoded file content (screenshot, PDF, log). Max ~7.5MB decoded.
- `filename` — Filename with extension, e.g. screenshot.png
- `mimeType` — MIME type, e.g. image/png, application/pdf, text/plain

### `xray_remove_evidence_from_step`

**Parameters:**

- `testRunId` — Test run internal ID
- `stepId` — Test run step internal ID
- `evidenceIds` — Evidence IDs to remove from the step

### `xray_add_defects_to_step`

**Parameters:**

- `testRunId` — Test run internal ID
- `stepId` — Test run step internal ID
- `issues` — Jira issue keys to link as defects, e.g. ['PROJ-123']

### `xray_remove_defects_from_step`

**Parameters:**

- `testRunId` — Test run internal ID
- `stepId` — Test run step internal ID
- `issues` — Jira issue keys to unlink as defects

## Imports

| Tool | Access | Description |
|------|--------|-------------|
| `xray_import_xray_json` | write | Import test results in Xray JSON format. Pass the full JSON content as a string. Supports optional testExecInfo for execution-level metadata (summary, description, version). Use this tool to push Xray-native JSON test results into Xray Cloud. |
| `xray_import_junit` | write | Import JUnit XML test results. Read the XML file via your Read tool and pass the full content here. Optionally provide testExecInfo for execution-level metadata (summary, description, version). Use this tool to push JUnit test results from Java/Maven/Gradle builds into Xray Cloud. |
| `xray_import_cucumber` | write | Import Cucumber JSON test results. Read the Cucumber JSON output file and pass the full content here. Note: Cucumber import does not support multipart mode — execution metadata is embedded in the Cucumber JSON format. Use this tool to push Cucumber BDD test results into Xray Cloud. |
| `xray_import_testng` | write | Import TestNG XML test results. Read the TestNG XML output file and pass the full content here. Optionally provide testExecInfo for execution-level metadata (summary, description, version). Use this tool to push TestNG test results from Java projects into Xray Cloud. |
| `xray_import_nunit` | write | Import NUnit XML test results. Read the NUnit XML output file and pass the full content here. Optionally provide testExecInfo for execution-level metadata (summary, description, version). Use this tool to push NUnit test results from .NET projects into Xray Cloud. |
| `xray_import_robot` | write | Import Robot Framework XML test results. Read the Robot Framework output.xml file and pass the full content here. Optionally provide testExecInfo for execution-level metadata (summary, description, version). Use this tool to push Robot Framework test results into Xray Cloud. |
| `xray_import_behave` | write | Import Behave JSON test results. Read the Behave JSON output file and pass the full content here. Note: Behave import does not support multipart mode — execution metadata is embedded in the Behave JSON format. Use this tool to push Python Behave BDD test results into Xray Cloud. |
| `xray_import_feature_files` | write | Import Cucumber .feature files into Xray Cloud to create or update test cases. Read the .feature file via your Read tool and pass the full content as a string. The projectKey parameter is required to specify which Jira project to import tests into. Note: If text/plain content type fails, the fallback is multipart/form-data wrapping. |

### `xray_import_xray_json`

**Parameters:**

- `content` — Xray JSON format test results as a string. Pass the complete JSON content.
- `projectKey` *(optional)* — Jira project key
- `testExecKey` *(optional)* — Existing test execution key to update
- `testPlanKey` *(optional)* — Test plan key to associate results with
- `testExecInfo` *(optional)* — Test execution metadata for multipart mode. When provided, import uses multipart/form-data to include execution-level fields (summary, description, version, etc.) that are not available in simple mode.

### `xray_import_junit`

**Parameters:**

- `content` — JUnit XML content as a string
- `projectKey` *(optional)* — Jira project key
- `testExecKey` *(optional)* — Existing test execution key to update
- `testPlanKey` *(optional)* — Test plan key to associate results with
- `testExecInfo` *(optional)* — Test execution metadata for multipart mode. When provided, import uses multipart/form-data to include execution-level fields (summary, description, version, etc.) that are not available in simple mode.

### `xray_import_cucumber`

**Parameters:**

- `content` — Cucumber JSON results as a string
- `projectKey` *(optional)* — Jira project key

### `xray_import_testng`

**Parameters:**

- `content` — TestNG XML content as a string
- `projectKey` *(optional)* — Jira project key
- `testExecKey` *(optional)* — Existing test execution key to update
- `testPlanKey` *(optional)* — Test plan key to associate results with
- `testExecInfo` *(optional)* — Test execution metadata for multipart mode. When provided, import uses multipart/form-data to include execution-level fields (summary, description, version, etc.) that are not available in simple mode.

### `xray_import_nunit`

**Parameters:**

- `content` — NUnit XML content as a string
- `projectKey` *(optional)* — Jira project key
- `testExecKey` *(optional)* — Existing test execution key to update
- `testPlanKey` *(optional)* — Test plan key to associate results with
- `testExecInfo` *(optional)* — Test execution metadata for multipart mode. When provided, import uses multipart/form-data to include execution-level fields (summary, description, version, etc.) that are not available in simple mode.

### `xray_import_robot`

**Parameters:**

- `content` — Robot Framework XML content as a string
- `projectKey` *(optional)* — Jira project key
- `testExecKey` *(optional)* — Existing test execution key to update
- `testPlanKey` *(optional)* — Test plan key to associate results with
- `testExecInfo` *(optional)* — Test execution metadata for multipart mode. When provided, import uses multipart/form-data to include execution-level fields (summary, description, version, etc.) that are not available in simple mode.

### `xray_import_behave`

**Parameters:**

- `content` — Behave JSON results as a string
- `projectKey` *(optional)* — Jira project key

### `xray_import_feature_files`

**Parameters:**

- `content` — Cucumber .feature file content as a string
- `projectKey` — Jira project key (required)

## Admin & Settings

| Tool | Access | Description |
|------|--------|-------------|
| `xray_get_coverable_issue` | read | Get test coverage status for a Jira issue (story, bug, etc.). Returns whether the issue is covered by tests and the coverage percentage. For Jira issue details, use the Atlassian MCP server instead. |
| `xray_list_coverable_issues` | read | List Jira issues that can have test coverage (stories, bugs, etc.) with their current coverage status. For Jira issue fields, use the Atlassian MCP server instead. |
| `xray_get_dataset` | read | Get a test dataset by test issue ID, including its parameters (columns) and rows of test data. |
| `xray_list_datasets` | read | List test datasets, optionally filtered by test, execution, or plan issue IDs. |
| `xray_export_cucumber_features` | read | Export Cucumber feature files for the given test issue keys. Returns the feature file content inline. For multiple tests, feature files are separated by '--- FILE: {key}.feature ---' headers. |
| `xray_get_project_settings` | read | Get Xray configuration for a Jira project, including test types, test statuses, and step statuses. |
| `xray_list_test_statuses` | read | List available test statuses in Xray. Optionally scope to a specific project to get project-specific statuses. |
| `xray_list_step_statuses` | read | List available test step statuses in Xray. Optionally scope to a specific project to get project-specific step statuses. |
| `xray_list_issue_link_types` | read | List available issue link types in Xray. Note: For Jira's native link types, use the Atlassian MCP server instead. This returns Xray-specific link types used for test-to-requirement coverage. |

### `xray_get_coverable_issue`

**Parameters:**

- `issueId` — Jira issue ID or key (story, bug, etc.) to get coverage for

### `xray_list_coverable_issues`

**Parameters:**

- `jql` *(optional)* — JQL query to filter results (e.g. 'project = PROJ AND status = TODO')
- `limit` *(optional)* — Number of results per page (1-100, default 50)
- `start` *(optional)* — Offset for pagination (0-based)

### `xray_get_dataset`

**Parameters:**

- `testIssueId` — Test issue ID to retrieve the dataset for
- `testExecIssueId` *(optional)* — Test execution issue ID (optional context filter)
- `testPlanIssueId` *(optional)* — Test plan issue ID (optional context filter)
- `callTestIssueId` *(optional)* — Call test issue ID (optional context filter)

### `xray_list_datasets`

**Parameters:**

- `testIssueIds` *(optional)* — Filter by test issue IDs
- `testExecIssueIds` *(optional)* — Filter by test execution issue IDs
- `testPlanIssueIds` *(optional)* — Filter by test plan issue IDs

### `xray_export_cucumber_features`

**Parameters:**

- `issueKeys` — Test issue keys to export, e.g. ['PROJ-1', 'PROJ-2']

### `xray_get_project_settings`

**Parameters:**

- `projectIdOrKey` — Jira project ID or key to get settings for

### `xray_list_test_statuses`

**Parameters:**

- `projectId` *(optional)* — Project ID to get project-specific statuses. Omit for global statuses.

### `xray_list_step_statuses`

**Parameters:**

- `projectId` *(optional)* — Project ID to get project-specific step statuses. Omit for global statuses.
