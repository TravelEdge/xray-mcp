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
        evidence { id filename downloadLink size createdOn }
        defects
      }
      customFields { id name values }
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
        evidence { id filename downloadLink size createdOn }
        defects
      }
      customFields { id name values }
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
  query ListTestRunsToon($testIssueIds: [String!]!, $limit: Int!, $start: Int) {
    getTestRuns(testIssueIds: $testIssueIds, limit: $limit, start: $start) {
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
  query ListTestRunsFull($testIssueIds: [String!]!, $limit: Int!, $start: Int) {
    getTestRuns(testIssueIds: $testIssueIds, limit: $limit, start: $start) {
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
        customFields { id name values }
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
  query ListTestRunsByIdToon($ids: [String!]!, $limit: Int!) {
    getTestRunsById(ids: $ids, limit: $limit) {
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
 *  Resolver count: ~13 (getTestRunsById, id, status, steps, steps.status,
 *    steps.evidence, steps.defects, customFields, executedById,
 *    assigneeId, startedOn, finishedOn, comment)
 *  SAFE: 13 < 25 resolver limit
 */
export const LIST_RUNS_BY_ID_FULL = `
  query ListTestRunsByIdFull($ids: [String!]!, $limit: Int!) {
    getTestRunsById(ids: $ids, limit: $limit) {
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
          evidence { id filename downloadLink size createdOn }
          defects
        }
        customFields { id name values }
      }
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

/** Full update of a test run (comment, assignee, dates, custom fields). */
export const UPDATE_RUN = `
  mutation UpdateTestRun($id: String!, $comment: String, $assigneeId: String, $startedOn: String, $finishedOn: String, $executedById: String, $customFields: [CustomFieldInput]) {
    updateTestRun(id: $id, comment: $comment, assigneeId: $assigneeId, startedOn: $startedOn, finishedOn: $finishedOn, executedById: $executedById, customFields: $customFields) {
      warnings
    }
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
  mutation UpdateTestRunStepStatus($testRunId: String!, $stepId: String!, $status: String!, $iterationRank: String) {
    updateTestRunStepStatus(testRunId: $testRunId, stepId: $stepId, status: $status, iterationRank: $iterationRank)
  }
`;

/** Update the comment of a specific step within a test run. */
export const UPDATE_STEP_COMMENT = `
  mutation UpdateTestRunStepComment($testRunId: String!, $stepId: String!, $comment: String!, $iterationRank: String) {
    updateTestRunStepComment(testRunId: $testRunId, stepId: $stepId, comment: $comment, iterationRank: $iterationRank)
  }
`;

/** Full update of a test run step via UpdateTestRunStepInput. */
export const UPDATE_RUN_STEP = `
  mutation UpdateTestRunStep($testRunId: String!, $stepId: String!, $updateData: UpdateTestRunStepInput!, $iterationRank: String) {
    updateTestRunStep(testRunId: $testRunId, stepId: $stepId, updateData: $updateData, iterationRank: $iterationRank) {
      addedDefects
      removedDefects
      addedEvidence
      removedEvidence
      warnings
    }
  }
`;

/** Update the status of a specific example (data-driven/BDD test) within a test run. */
export const UPDATE_EXAMPLE_STATUS = `
  mutation UpdateTestRunExampleStatus($exampleId: String!, $status: String!) {
    updateTestRunExampleStatus(exampleId: $exampleId, status: $status)
  }
`;

/** Update the status of a specific iteration (data-set test) within a test run. */
export const UPDATE_ITERATION_STATUS = `
  mutation UpdateIterationStatus($testRunId: String!, $iterationRank: String!, $status: String!) {
    updateIterationStatus(testRunId: $testRunId, iterationRank: $iterationRank, status: $status)
  }
`;

/** Start or stop the execution timer for a test run. */
export const SET_RUN_TIMER = `
  mutation SetTestRunTimer($testRunId: String!, $running: Boolean, $reset: Boolean) {
    setTestRunTimer(testRunId: $testRunId, running: $running, reset: $reset)
  }
`;
