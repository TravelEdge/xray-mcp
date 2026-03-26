/** Mock data fixtures for import tool tests. */

export const mockImportResult = {
  testExecIssue: {
    id: "12345",
    key: "PROJ-100",
    self: "https://jira.example.com/rest/api/2/issue/12345",
  },
  testIssues: {
    success: [
      {
        id: "54321",
        key: "PROJ-200",
        self: "https://jira.example.com/rest/api/2/issue/54321",
      },
    ],
    error: [],
  },
};
