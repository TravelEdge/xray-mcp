// GraphQL queries for admin/settings/coverage tools (READ-18..READ-26)

// ─── Coverage Queries ───────────────────────────────────────────────────────

/** TOON variant — minimal fields for compact output. */
export const GET_COVERABLE_ISSUE_TOON = `
  query GetCoverableIssueToon($issueId: String!) {
    getCoverableIssue(issueId: $issueId) {
      issueId
      jira(fields: ["key", "summary"])
      testCoverage {
        covered
        coveragePercentage
        tests(limit: 100) {
          total
          results {
            issueId
          }
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
      testCoverage {
        covered
        coveragePercentage
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

/** TOON variant for listing coverable issues. */
export const LIST_COVERABLE_ISSUES_TOON = `
  query ListCoverableIssuesToon($jql: String, $limit: Int!, $start: Int) {
    getCoverableIssues(jql: $jql, limit: $limit, start: $start) {
      total
      results {
        issueId
        jira(fields: ["key", "summary"])
        testCoverage {
          covered
          coveragePercentage
        }
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
        testCoverage {
          covered
          coveragePercentage
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
  }
`;

// ─── Dataset Queries ─────────────────────────────────────────────────────────

/** TOON variant for single dataset. */
export const GET_DATASET_TOON = `
  query GetDatasetToon($id: String!) {
    getDataset(id: $id) {
      name
      parameters {
        name
      }
      rows
      totalRows
    }
  }
`;

/** FULL variant for single dataset. */
export const GET_DATASET_FULL = `
  query GetDatasetFull($id: String!) {
    getDataset(id: $id) {
      name
      parameters {
        name
      }
      rows
      totalRows
    }
  }
`;

/** TOON variant for listing datasets. */
export const LIST_DATASETS_TOON = `
  query ListDatasetsToon($projectId: String!, $limit: Int!, $start: Int) {
    getDatasets(projectId: $projectId, limit: $limit, start: $start) {
      total
      results {
        name
        totalRows
        parameters {
          name
        }
      }
    }
  }
`;

/** FULL variant for listing datasets. */
export const LIST_DATASETS_FULL = `
  query ListDatasetsFull($projectId: String!, $limit: Int!, $start: Int) {
    getDatasets(projectId: $projectId, limit: $limit, start: $start) {
      total
      results {
        name
        totalRows
        parameters {
          name
        }
        rows
      }
    }
  }
`;

// ─── Settings Queries ─────────────────────────────────────────────────────────

/** Get project settings including test types, step statuses, test statuses. */
export const GET_PROJECT_SETTINGS = `
  query GetProjectSettings($projectId: String!) {
    getProjectSettings(projectId: $projectId) {
      projectId
      testTypes {
        name
        kind
      }
      stepStatuses {
        name
        color
        description
      }
      testStatuses {
        name
        color
        description
      }
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
