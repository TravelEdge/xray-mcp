// GraphQL queries and mutations for folder entity (D-22, D-23, GQL-05)
// Note: Folders use projectId+path identifiers, not issueId

// ─── Read Queries ────────────────────────────────────────────────────────────

/** TOON variant — minimal fields for compact output. */
export const GET_FOLDER_TOON = `
  query GetFolderToon($projectId: String!, $path: String!) {
    getFolder(projectId: $projectId, path: $path) {
      name
      path
      testsCount
      folders {
        name
        path
        testsCount
      }
    }
  }
`;

/** FULL variant — all fields including nested subfolders and tests. */
export const GET_FOLDER_FULL = `
  query GetFolderFull($projectId: String!, $path: String!) {
    getFolder(projectId: $projectId, path: $path) {
      name
      path
      testsCount
      folders {
        name
        path
        testsCount
        folders {
          name
          path
          testsCount
        }
      }
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

// ─── Mutations ───────────────────────────────────────────────────────────────

export const CREATE_FOLDER = `
  mutation CreateFolder($projectId: String!, $path: String!) {
    createFolder(projectId: $projectId, path: $path) {
      folder {
        name
        path
        testsCount
      }
      warnings
    }
  }
`;

export const DELETE_FOLDER = `
  mutation DeleteFolder($projectId: String!, $path: String!) {
    deleteFolder(projectId: $projectId, path: $path)
  }
`;

export const RENAME_FOLDER = `
  mutation RenameFolder($projectId: String!, $path: String!, $newName: String!) {
    renameFolder(projectId: $projectId, path: $path, newName: $newName) {
      folder {
        name
        path
        testsCount
      }
      warnings
    }
  }
`;

export const MOVE_FOLDER = `
  mutation MoveFolder($projectId: String!, $path: String!, $destinationPath: String!) {
    moveFolder(projectId: $projectId, path: $path, destinationPath: $destinationPath) {
      folder {
        name
        path
        testsCount
      }
      warnings
    }
  }
`;

export const ADD_TESTS_TO_FOLDER = `
  mutation AddTestsToFolder($projectId: String!, $path: String!, $testIssueIds: [String!]!) {
    addTestsToFolder(projectId: $projectId, path: $path, testIssueIds: $testIssueIds) {
      folder {
        name
        path
        testsCount
      }
      warnings
    }
  }
`;

export const REMOVE_TESTS_FROM_FOLDER = `
  mutation RemoveTestsFromFolder($projectId: String!, $testIssueIds: [String!]!) {
    removeTestsFromFolder(projectId: $projectId, testIssueIds: $testIssueIds)
  }
`;

export const ADD_ISSUES_TO_FOLDER = `
  mutation AddIssuesToFolder($projectId: String!, $path: String!, $issueIds: [String!]!) {
    addIssuesToFolder(projectId: $projectId, path: $path, issueIds: $issueIds) {
      folder {
        name
        path
        testsCount
      }
      warnings
    }
  }
`;

export const REMOVE_ISSUES_FROM_FOLDER = `
  mutation RemoveIssuesFromFolder($projectId: String!, $issueIds: [String!]!) {
    removeIssuesFromFolder(projectId: $projectId, issueIds: $issueIds)
  }
`;
