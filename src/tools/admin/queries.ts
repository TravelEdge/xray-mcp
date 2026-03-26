// GraphQL queries for admin/settings/coverage tools (READ-18..READ-26)

// ─── Coverage Queries ───────────────────────────────────────────────────────

/** TOON variant — minimal fields for compact output. */
export const GET_COVERABLE_ISSUE_TOON = `
  query GetCoverableIssueToon($issueId: String!) {
    getCoverableIssue(issueId: $issueId) {
      issueId
      jira(fields: ["key", "summary"])
      status { name }
      tests(limit: 100) {
        total
        results {
          issueId
        }
      }
    }
  }
`;

/** FULL variant — all fields for json format. */
export const GET_COVERABLE_ISSUE_FULL = `
  query GetCoverableIssueFull($issueId: String!) {
    getCoverableIssue(issueId: $issueId) {
      issueId
      jira(fields: ["key", "summary", "status", "priority", "assignee"])
      status { name description color }
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

/** TOON variant for listing coverable issues. */
export const LIST_COVERABLE_ISSUES_TOON = `
  query ListCoverableIssuesToon($jql: String, $limit: Int!, $start: Int) {
    getCoverableIssues(jql: $jql, limit: $limit, start: $start) {
      total
      results {
        issueId
        jira(fields: ["key", "summary"])
        status { name }
      }
    }
  }
`;

/** FULL variant for listing coverable issues. */
export const LIST_COVERABLE_ISSUES_FULL = `
  query ListCoverableIssuesFull($jql: String, $limit: Int!, $start: Int) {
    getCoverableIssues(jql: $jql, limit: $limit, start: $start) {
      total
      results {
        issueId
        jira(fields: ["key", "summary", "status", "priority", "assignee"])
        status { name description color }
        tests(limit: 100) {
          total
          results {
            issueId
            jira(fields: ["key", "summary"])
          }
        }
      }
    }
  }
`;

// ─── Dataset Queries ─────────────────────────────────────────────────────────

/** TOON variant for single dataset. */
export const GET_DATASET_TOON = `
  query GetDatasetToon($testIssueId: String!, $testExecIssueId: String, $testPlanIssueId: String, $callTestIssueId: String) {
    getDataset(testIssueId: $testIssueId, testExecIssueId: $testExecIssueId, testPlanIssueId: $testPlanIssueId, callTestIssueId: $callTestIssueId) {
      id
      parameters {
        name
      }
      rows {
        order
        Values
      }
    }
  }
`;

/** FULL variant for single dataset. */
export const GET_DATASET_FULL = `
  query GetDatasetFull($testIssueId: String!, $testExecIssueId: String, $testPlanIssueId: String, $callTestIssueId: String) {
    getDataset(testIssueId: $testIssueId, testExecIssueId: $testExecIssueId, testPlanIssueId: $testPlanIssueId, callTestIssueId: $callTestIssueId) {
      id
      testIssueId
      testExecIssueId
      testPlanIssueId
      testStepId
      callTestIssueId
      parameters {
        name
      }
      rows {
        order
        Values
      }
    }
  }
`;

/** TOON variant for listing datasets. */
export const LIST_DATASETS_TOON = `
  query ListDatasetsToon($testIssueIds: [String!], $testExecIssueIds: [String!], $testPlanIssueIds: [String!]) {
    getDatasets(testIssueIds: $testIssueIds, testExecIssueIds: $testExecIssueIds, testPlanIssueIds: $testPlanIssueIds) {
      id
      testIssueId
      parameters {
        name
      }
    }
  }
`;

/** FULL variant for listing datasets. */
export const LIST_DATASETS_FULL = `
  query ListDatasetsFull($testIssueIds: [String!], $testExecIssueIds: [String!], $testPlanIssueIds: [String!]) {
    getDatasets(testIssueIds: $testIssueIds, testExecIssueIds: $testExecIssueIds, testPlanIssueIds: $testPlanIssueIds) {
      id
      testIssueId
      testExecIssueId
      testPlanIssueId
      parameters {
        name
      }
      rows {
        order
        Values
      }
    }
  }
`;

// ─── Settings Queries ─────────────────────────────────────────────────────────

/** Get project settings including test type settings, environments, and coverage config. */
export const GET_PROJECT_SETTINGS = `
  query GetProjectSettings($projectIdOrKey: String!) {
    getProjectSettings(projectIdOrKey: $projectIdOrKey) {
      projectId
      testEnvironments
      testTypeSettings {
        testTypes { name kind }
        defaultTestTypeId
      }
      testStepSettings {
        fields { id name }
      }
      testRunCustomFieldSettings {
        fields { id name }
      }
      testCoverageSettings {
        coverableIssueTypeIds
        epicIssuesRelation
        issueSubTasksRelation
      }
      defectIssueTypes
    }
  }
`;

/** Get test statuses — optional $projectId for project-specific statuses (addresses MEDIUM review concern). */
export const GET_STATUSES = `
  query GetStatuses($projectId: String) {
    getStatuses(projectId: $projectId) {
      name
      color
      description
    }
  }
`;

/** Get step statuses — optional $projectId for project-specific statuses (addresses MEDIUM review concern). */
export const GET_STEP_STATUSES = `
  query GetStepStatuses($projectId: String) {
    getStepStatuses(projectId: $projectId) {
      name
      color
      description
    }
  }
`;

/** Get Xray-specific issue link types. */
export const GET_ISSUE_LINK_TYPES = `
  query GetIssueLinkTypes {
    getIssueLinkTypes {
      name
      inward
      outward
    }
  }
`;
