/**
 * GraphQL queries for test set operations (D-22, D-23).
 * TOON variants request minimal fields; FULL variants include all details.
 */

// ---------------------------------------------------------------------------
// Read: Get single test set
// ---------------------------------------------------------------------------

export const GET_SET_TOON = `
  query getTestSet($issueId: String!) {
    getTestSet(issueId: $issueId) {
      issueId
      jira(fields: ["key", "summary"])
      tests(limit: 100) {
        total
        results {
          issueId
        }
      }
    }
  }
`;

export const GET_SET_FULL = `
  query getTestSet($issueId: String!) {
    getTestSet(issueId: $issueId) {
      issueId
      jira(fields: ["key", "summary", "status", "assignee", "reporter"])
      tests(limit: 100) {
        total
        results {
          issueId
          jira(fields: ["key", "summary"])
          testType {
            name
          }
          status {
            name
            color
          }
          folder {
            path
          }
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Read: List test sets
// ---------------------------------------------------------------------------

export const LIST_SETS_TOON = `
  query getTestSets($jql: String, $limit: Int!, $start: Int) {
    getTestSets(jql: $jql, limit: $limit, start: $start) {
      total
      results {
        issueId
        jira(fields: ["key", "summary"])
        tests(limit: 1) {
          total
        }
      }
    }
  }
`;

export const LIST_SETS_FULL = `
  query getTestSets($jql: String, $limit: Int!, $start: Int) {
    getTestSets(jql: $jql, limit: $limit, start: $start) {
      total
      results {
        issueId
        jira(fields: ["key", "summary", "status", "assignee", "reporter"])
        tests(limit: 100) {
          total
          results {
            issueId
            jira(fields: ["key", "summary"])
            testType {
              name
            }
          }
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const CREATE_SET = `
  mutation createTestSet($jira: JSON!, $testIssueIds: [String!]) {
    createTestSet(
      jira: $jira
      testIssueIds: $testIssueIds
    ) {
      testSet {
        issueId
        jira(fields: ["key", "summary"])
      }
      warnings
    }
  }
`;

export const DELETE_SET = `
  mutation deleteTestSet($issueId: String!) {
    deleteTestSet(issueId: $issueId)
  }
`;

export const ADD_TESTS_TO_SET = `
  mutation addTestsToTestSet($issueId: String!, $testIssueIds: [String]!) {
    addTestsToTestSet(issueId: $issueId, testIssueIds: $testIssueIds) {
      addedTests
      warnings
    }
  }
`;

export const REMOVE_TESTS_FROM_SET = `
  mutation removeTestsFromTestSet($issueId: String!, $testIssueIds: [String]!) {
    removeTestsFromTestSet(issueId: $issueId, testIssueIds: $testIssueIds) {
      removedTests
      warnings
    }
  }
`;
