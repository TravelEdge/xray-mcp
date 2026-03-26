// GraphQL queries for Test Plan domain (D-22, D-23).
// Two variants per operation: TOON (minimal fields) and FULL (all fields, GQL-05).
// FULL queries include resolver count comments to track against the 25-resolver limit.

// ---------------------------------------------------------------------------
// GET_PLAN_TOON — ~8 resolvers (well within limit)
// Resolvers: getTestPlan, jira, jira.fields(2), tests, tests.results,
//            testExecutions, testExecutions.results
// ---------------------------------------------------------------------------
export const GET_PLAN_TOON = /* GraphQL */ `
  query GetTestPlanToon($issueId: String!) {
    getTestPlan(issueId: $issueId) {
      issueId
      jira(fields: ["key", "summary"])
      tests(limit: 100) {
        total
        results {
          issueId
        }
      }
      testExecutions(limit: 100) {
        total
        results {
          issueId
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// GET_PLAN_FULL — ~16 resolvers (SAFE: 16 < 25 resolver limit)
// Resolvers: getTestPlan, jira, jira.fields(4),
//   tests, tests.results, tests.results.jira, tests.results.jira.fields(3),
//   testExecutions, testExecutions.results, testExecutions.results.jira,
//   testExecutions.results.jira.fields(3), folder, status
// ---------------------------------------------------------------------------
export const GET_PLAN_FULL = /* GraphQL */ `
  query GetTestPlanFull($issueId: String!) {
    getTestPlan(issueId: $issueId) {
      issueId
      jira(fields: ["key", "summary", "status", "priority"])
      tests(limit: 100) {
        total
        results {
          issueId
          jira(fields: ["key", "summary", "status"])
        }
      }
      testExecutions(limit: 100) {
        total
        results {
          issueId
          jira(fields: ["key", "summary", "status"])
        }
      }
      folder {
        path
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// LIST_PLANS_TOON — ~6 resolvers
// Resolvers: getTestPlans, getTestPlans.results,
//            results.issueId, results.jira, results.jira.fields(2),
//            tests.total, testExecutions.total
// ---------------------------------------------------------------------------
export const LIST_PLANS_TOON = /* GraphQL */ `
  query ListPlansToon($jql: String, $limit: Int!, $start: Int) {
    getTestPlans(jql: $jql, limit: $limit, start: $start) {
      total
      results {
        issueId
        jira(fields: ["key", "summary"])
        tests(limit: 1) {
          total
        }
        testExecutions(limit: 1) {
          total
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// LIST_PLANS_FULL — ~12 resolvers (SAFE: 12 < 25 resolver limit)
// Resolvers: getTestPlans, total, results, results.issueId,
//   results.jira, results.jira.fields(4),
//   results.tests, results.tests.total,
//   results.testExecutions, results.testExecutions.total,
//   results.folder, results.folder.path
// ---------------------------------------------------------------------------
export const LIST_PLANS_FULL = /* GraphQL */ `
  query ListPlansFull($jql: String, $limit: Int!, $start: Int) {
    getTestPlans(jql: $jql, limit: $limit, start: $start) {
      total
      results {
        issueId
        jira(fields: ["key", "summary", "status", "priority"])
        tests(limit: 1) {
          total
        }
        testExecutions(limit: 1) {
          total
        }
        folder {
          path
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const CREATE_PLAN = /* GraphQL */ `
  mutation CreateTestPlan($projectKey: String!, $summary: String!, $testIssueIds: [String]) {
    createTestPlan(
      projectKey: $projectKey
      summary: $summary
      testIssueIds: $testIssueIds
    ) {
      testPlan {
        issueId
        jira(fields: ["key"])
      }
    }
  }
`;

export const DELETE_PLAN = /* GraphQL */ `
  mutation DeleteTestPlan($issueId: String!) {
    deleteTestPlan(issueId: $issueId) {
      issueId
    }
  }
`;

export const ADD_TESTS_TO_PLAN = /* GraphQL */ `
  mutation AddTestsToPlan($issueId: String!, $testIssueIds: [String]!) {
    addTestsToTestPlan(issueId: $issueId, testIssueIds: $testIssueIds) {
      addedTests
      warning
    }
  }
`;

export const REMOVE_TESTS_FROM_PLAN = /* GraphQL */ `
  mutation RemoveTestsFromPlan($issueId: String!, $testIssueIds: [String]!) {
    removeTestsFromTestPlan(issueId: $issueId, testIssueIds: $testIssueIds) {
      removedTests
      warning
    }
  }
`;

export const ADD_EXECUTIONS_TO_PLAN = /* GraphQL */ `
  mutation AddExecutionsToPlan($issueId: String!, $executionIssueIds: [String]!) {
    addTestExecutionsToTestPlan(issueId: $issueId, testExecutionIssueIds: $executionIssueIds) {
      addedTestExecutions
      warning
    }
  }
`;

export const REMOVE_EXECUTIONS_FROM_PLAN = /* GraphQL */ `
  mutation RemoveExecutionsFromPlan($issueId: String!, $executionIssueIds: [String]!) {
    removeTestExecutionsFromTestPlan(
      issueId: $issueId
      testExecutionIssueIds: $executionIssueIds
    ) {
      removedTestExecutions
      warning
    }
  }
`;
