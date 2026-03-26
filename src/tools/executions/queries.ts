// GraphQL queries and mutations for test execution entity (D-22, D-23, GQL-05)

// ─── Read Queries ───────────────────────────────────────────────────────────

/** TOON variant — minimal fields for compact output.
 *  Resolver count: ~7 — well within limit
 */
export const GET_EXECUTION_TOON = `
  query GetTestExecutionToon($issueId: String!) {
    getTestExecution(issueId: $issueId) {
      issueId
      jira(fields: ["key", "summary"])
      testRuns(limit: 100) {
        total
        nodes {
          id
          status { name }
        }
      }
      testEnvironments
    }
  }
`;

/** FULL variant — all fields for json format.
 *  Resolver count: ~14 — within 25 limit
 */
export const GET_EXECUTION_FULL = `
  query GetTestExecutionFull($issueId: String!) {
    getTestExecution(issueId: $issueId) {
      issueId
      jira(fields: ["key", "summary", "status", "priority", "assignee"])
      testRuns(limit: 100) {
        total
        nodes {
          id
          status { name color }
          comment
          executedById
          startedOn
          finishedOn
          steps {
            id
            status { name }
            comment
            action
            result
          }
        }
      }
      testEnvironments
      testPlans(limit: 100) {
        total
        results {
          issueId
          jira(fields: ["key", "summary"])
        }
      }
    }
  }
`;

/** TOON variant for listing test executions. */
export const LIST_EXECUTIONS_TOON = `
  query ListTestExecutionsToon($jql: String, $limit: Int!, $start: Int) {
    getTestExecutions(jql: $jql, limit: $limit, start: $start) {
      total
      results {
        issueId
        jira(fields: ["key", "summary"])
        testEnvironments
      }
    }
  }
`;

/** FULL variant for listing test executions.
 *  Resolver count: ~10 — within 25 limit
 */
export const LIST_EXECUTIONS_FULL = `
  query ListTestExecutionsFull($jql: String, $limit: Int!, $start: Int) {
    getTestExecutions(jql: $jql, limit: $limit, start: $start) {
      total
      results {
        issueId
        jira(fields: ["key", "summary", "status", "priority", "assignee"])
        testRuns(limit: 100) {
          total
          results {
            id
            status { name color }
          }
        }
        testEnvironments
      }
    }
  }
`;

// ─── Mutations ───────────────────────────────────────────────────────────────

export const CREATE_EXECUTION = `
  mutation CreateTestExecution($testExecution: CreateTestExecutionInput!) {
    createTestExecution(testExecution: $testExecution) {
      testExecution {
        issueId
        jira(fields: ["key", "summary"])
      }
      warnings
    }
  }
`;

export const DELETE_EXECUTION = `
  mutation DeleteTestExecution($issueId: String!) {
    deleteTestExecution(issueId: $issueId)
  }
`;

export const ADD_TESTS_TO_EXECUTION = `
  mutation AddTestsToTestExecution($issueId: String!, $testIssueIds: [String!]!) {
    addTestsToTestExecution(issueId: $issueId, testIssueIds: $testIssueIds) {
      addedTests
      warning
    }
  }
`;

export const REMOVE_TESTS_FROM_EXECUTION = `
  mutation RemoveTestsFromTestExecution($issueId: String!, $testIssueIds: [String!]!) {
    removeTestsFromTestExecution(issueId: $issueId, testIssueIds: $testIssueIds)
  }
`;

export const ADD_ENVIRONMENTS_TO_EXECUTION = `
  mutation AddTestEnvironmentsToTestExecution($issueId: String!, $environments: [String!]!) {
    addTestEnvironmentsToTestExecution(issueId: $issueId, environments: $environments) {
      issueId
      testEnvironments
    }
  }
`;

export const REMOVE_ENVIRONMENTS_FROM_EXECUTION = `
  mutation RemoveTestEnvironmentsFromTestExecution($issueId: String!, $environments: [String!]!) {
    removeTestEnvironmentsFromTestExecution(issueId: $issueId, environments: $environments) {
      issueId
      testEnvironments
    }
  }
`;
