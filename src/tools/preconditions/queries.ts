// GraphQL queries and mutations for the preconditions domain (D-22, D-23).
// TOON variants: minimal fields for compact output.
// FULL variants: all available fields for json format.

// ---------------------------------------------------------------------------
// Read queries
// ---------------------------------------------------------------------------

export const GET_PRECONDITION_TOON = `
  query GetPreconditionToon($issueId: String!) {
    getPrecondition(issueId: $issueId) {
      issueId
      preconditionType { name }
      definition
      jira(fields: ["key", "summary"])
      tests(limit: 100) {
        total
        results { issueId }
      }
    }
  }
`;

export const GET_PRECONDITION_FULL = `
  query GetPreconditionFull($issueId: String!) {
    getPrecondition(issueId: $issueId) {
      issueId
      preconditionType { name kind }
      definition
      folder { path }
      jira(fields: ["key", "summary", "status", "priority", "labels", "assignee"])
      tests(limit: 100) {
        total
        results {
          issueId
          jira(fields: ["key", "summary"])
        }
      }
    }
  }
`;

export const LIST_PRECONDITIONS_TOON = `
  query ListPreconditionsToon($jql: String, $limit: Int!, $start: Int) {
    getPreconditions(jql: $jql, limit: $limit, start: $start) {
      total
      results {
        issueId
        preconditionType { name }
        definition
        jira(fields: ["key", "summary"])
      }
    }
  }
`;

export const LIST_PRECONDITIONS_FULL = `
  query ListPreconditionsFull($jql: String, $limit: Int!, $start: Int) {
    getPreconditions(jql: $jql, limit: $limit, start: $start) {
      total
      results {
        issueId
        preconditionType { name kind }
        definition
        folder { path }
        jira(fields: ["key", "summary", "status", "priority", "labels", "assignee"])
        tests(limit: 100) {
          total
          results { issueId jira(fields: ["key", "summary"]) }
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Write mutations
// ---------------------------------------------------------------------------

export const CREATE_PRECONDITION = `
  mutation CreatePrecondition(
    $jira: JSON!
    $preconditionType: UpdatePreconditionTypeInput
    $definition: String
    $testIssueIds: [String!]
    $folderPath: String
  ) {
    createPrecondition(
      jira: $jira
      preconditionType: $preconditionType
      definition: $definition
      testIssueIds: $testIssueIds
      folderPath: $folderPath
    ) {
      precondition {
        issueId
        jira(fields: ["key"])
      }
      warnings
    }
  }
`;

export const UPDATE_PRECONDITION = `
  mutation UpdatePrecondition(
    $issueId: String!
    $data: UpdatePreconditionInput!
  ) {
    updatePrecondition(
      issueId: $issueId
      data: $data
    ) {
      issueId
      jira(fields: ["key"])
    }
  }
`;

export const DELETE_PRECONDITION = `
  mutation DeletePrecondition($issueId: String!) {
    deletePrecondition(issueId: $issueId)
  }
`;

export const ADD_TESTS_TO_PRECONDITION = `
  mutation AddTestsToPrecondition($issueId: String!, $testIssueIds: [String]!) {
    addTestsToPrecondition(issueId: $issueId, testIssueIds: $testIssueIds) {
      addedTests
      warning
    }
  }
`;

export const REMOVE_TESTS_FROM_PRECONDITION = `
  mutation RemoveTestsFromPrecondition($issueId: String!, $testIssueIds: [String]!) {
    removeTestsFromPrecondition(issueId: $issueId, testIssueIds: $testIssueIds) {
      removedTests
      warning
    }
  }
`;
