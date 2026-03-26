// ---------------------------------------------------------------------------
// Test Run GraphQL queries and mutations
// Two query variants per operation: TOON (minimal fields) and FULL (all fields)
// GQL-05: Handler picks variant based on format parameter via selectQuery()
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// GET_RUN — by test issue + test execution issue keys
// ---------------------------------------------------------------------------

/** TOON variant: minimal fields for compact output.
 *  Resolver count: ~5 (getTestRun, status, comment, startedOn, finishedOn)
 */
export const GET_RUN_TOON = `
  query GetTestRunToon($testIssueId: String!, $testExecIssueId: String!) {
    getTestRun(testIssueId: $testIssueId, testExecIssueId: $testExecIssueId) {
      id
      status { name }
      comment
      startedOn
      finishedOn
    }
  }
`;

/** FULL variant: all fields for JSON format.
 *  Resolver count: ~14 (getTestRun, status, steps, steps.status,
 *    steps.evidence, steps.defects, customFields, executedById,
 *    assigneeId, startedOn, finishedOn, comment, test.jira, testExecution.jira)
 *  SAFE: 14 < 25 resolver limit
 */
export const GET_RUN_FULL = `
  query GetTestRunFull($testIssueId: String!, $testExecIssueId: String!) {
    getTestRun(testIssueId: $testIssueId, testExecIssueId: $testExecIssueId) {
      id
      status { name color }
      comment
      executedById
      assigneeId
      startedOn
      finishedOn
      steps {
        id
        status { name color }
        comment
        action
        result
        evidence { id filename mimeType size }
        defects { id summary status { name } }
      }
      customFields { id name value }
    }
  }
`;

// ---------------------------------------------------------------------------
// GET_RUN_BY_ID — by internal run ID
// ---------------------------------------------------------------------------

/** TOON variant: minimal fields for compact output.
 *  Resolver count: ~5 (getTestRunById, status, comment, startedOn, finishedOn)
 */
export const GET_RUN_BY_ID_TOON = `
  query GetTestRunByIdToon($id: String!) {
    getTestRunById(id: $id) {
      id
      status { name }
      comment
      startedOn
      finishedOn
    }
  }
`;

/** FULL variant: all fields for JSON format.
 *  Resolver count: ~14 (getTestRunById, status, steps, steps.status,
 *    steps.evidence, steps.defects, customFields, executedById,
 *    assigneeId, startedOn, finishedOn, comment, test.jira, testExecution.jira)
 *  SAFE: 14 < 25 resolver limit
 */
export const GET_RUN_BY_ID_FULL = `
  query GetTestRunByIdFull($id: String!) {
    getTestRunById(id: $id) {
      id
      status { name color }
      comment
      executedById
      assigneeId
      startedOn
      finishedOn
      steps {
        id
        status { name color }
        comment
        action
        result
        evidence { id filename mimeType size }
        defects { id summary status { name } }
      }
      customFields { id name value }
    }
  }
`;

// ---------------------------------------------------------------------------
// LIST_RUNS — all runs for a test issue (paginated)
// ---------------------------------------------------------------------------

/** TOON variant: minimal fields for compact output.
 *  Resolver count: ~7 (getTestRuns, total, results, results.id,
 *    results.status, results.comment, results.startedOn)
 */
export const LIST_RUNS_TOON = `
  query ListTestRunsToon($testIssueId: String!, $limit: Int!, $start: Int, $testEnvironments: [String]) {
    getTestRuns(testIssueId: $testIssueId, limit: $limit, start: $start, testEnvironments: $testEnvironments) {
      total
      results {
        id
        status { name }
        comment
        startedOn
        finishedOn
      }
    }
  }
`;

/** FULL variant: all fields for JSON format.
 *  Resolver count: ~15 (getTestRuns, total, results, results.id,
 *    results.status, results.steps, results.steps.status,
 *    results.customFields, results.executedById, results.assigneeId,
 *    results.startedOn, results.finishedOn, results.comment,
 *    results.evidence, results.defects)
 *  SAFE: 15 < 25 resolver limit
 */
export const LIST_RUNS_FULL = `
  query ListTestRunsFull($testIssueId: String!, $limit: Int!, $start: Int, $testEnvironments: [String]) {
    getTestRuns(testIssueId: $testIssueId, limit: $limit, start: $start, testEnvironments: $testEnvironments) {
      total
      results {
        id
        status { name color }
        comment
        executedById
        assigneeId
        startedOn
        finishedOn
        steps {
          id
          status { name color }
          comment
          action
          result
        }
        customFields { id name value }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// LIST_RUNS_BY_ID — array of runs by internal IDs
// ---------------------------------------------------------------------------

/** TOON variant: minimal fields for compact output.
 *  Resolver count: ~6 (getTestRunsById, id, status, comment, startedOn, finishedOn)
 */
export const LIST_RUNS_BY_ID_TOON = `
  query ListTestRunsByIdToon($ids: [String!]!) {
    getTestRunsById(ids: $ids) {
      id
      status { name }
      comment
      startedOn
      finishedOn
    }
  }
`;

/** FULL variant: all fields for JSON format.
 *  Resolver count: ~13 (getTestRunsById, id, status, steps, steps.status,
 *    steps.evidence, steps.defects, customFields, executedById,
 *    assigneeId, startedOn, finishedOn, comment)
 *  SAFE: 13 < 25 resolver limit
 */
export const LIST_RUNS_BY_ID_FULL = `
  query ListTestRunsByIdFull($ids: [String!]!) {
    getTestRunsById(ids: $ids) {
      id
      status { name color }
      comment
      executedById
      assigneeId
      startedOn
      finishedOn
      steps {
        id
        status { name color }
        comment
        action
        result
        evidence { id filename mimeType size }
        defects { id summary status { name } }
      }
      customFields { id name value }
    }
  }
`;

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Update the status of a test run. */
export const UPDATE_RUN_STATUS = `
  mutation UpdateTestRunStatus($id: String!, $status: String!) {
    updateTestRunStatus(id: $id, status: $status)
  }
`;

/** Update the comment of a test run. */
export const UPDATE_RUN_COMMENT = `
  mutation UpdateTestRunComment($id: String!, $comment: String!) {
    updateTestRunComment(id: $id, comment: $comment)
  }
`;

/** Full update of a test run (status, comment, assignee, custom fields). */
export const UPDATE_RUN = `
  mutation UpdateTestRun($id: String!, $status: String, $comment: String, $assignee: String, $customFields: [CustomFieldInput]) {
    updateTestRun(id: $id, status: $status, comment: $comment, assignee: $assignee, customFields: $customFields)
  }
`;

/** Reset a test run to its initial state, clearing all status and comments. */
export const RESET_RUN = `
  mutation ResetTestRun($id: String!) {
    resetTestRun(id: $id)
  }
`;

/** Update the status of a specific step within a test run. */
export const UPDATE_STEP_STATUS = `
  mutation UpdateStepStatus($runId: String!, $stepId: String!, $status: String!) {
    updateStepStatus(runId: $runId, stepId: $stepId, status: $status)
  }
`;

/** Update the comment of a specific step within a test run. */
export const UPDATE_STEP_COMMENT = `
  mutation UpdateStepComment($runId: String!, $stepId: String!, $comment: String!) {
    updateStepComment(runId: $runId, stepId: $stepId, comment: $comment)
  }
`;

/** Full update of a test run step (status, comment, evidence, defects). */
export const UPDATE_RUN_STEP = `
  mutation UpdateTestRunStep($runId: String!, $stepId: String!, $status: String, $comment: String, $evidence: [EvidenceInput], $defects: [String]) {
    updateTestRunStep(runId: $runId, stepId: $stepId, status: $status, comment: $comment, evidence: $evidence, defects: $defects)
  }
`;

/** Update the status of a specific example (data-driven/BDD test) within a test run. */
export const UPDATE_EXAMPLE_STATUS = `
  mutation UpdateExampleStatus($runId: String!, $exampleIndex: Int!, $status: String!) {
    updateExampleStatus(runId: $runId, exampleIndex: $exampleIndex, status: $status)
  }
`;

/** Update the status of a specific iteration (data-set test) within a test run. */
export const UPDATE_ITERATION_STATUS = `
  mutation UpdateIterationStatus($runId: String!, $iterationIndex: Int!, $status: String!) {
    updateIterationStatus(runId: $runId, iterationIndex: $iterationIndex, status: $status)
  }
`;

/** Start or stop the execution timer for a test run. */
export const SET_RUN_TIMER = `
  mutation SetTestRunTimer($id: String!, $action: String!) {
    setTestRunTimer(id: $id, action: $action)
  }
`;
