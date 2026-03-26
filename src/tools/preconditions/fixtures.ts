// Test fixtures for precondition domain tests (D-28).

export const mockPrecondition = {
  issueId: "PC-1",
  preconditionType: { name: "Manual" },
  definition: "User must be logged in as admin",
  jira: { key: "PC-1", summary: "Admin user logged in" },
  tests: {
    total: 2,
    results: [{ issueId: "PROJ-10" }, { issueId: "PROJ-11" }],
  },
};

export const mockPreconditionList = {
  getPreconditions: {
    total: 2,
    results: [
      {
        issueId: "PC-1",
        preconditionType: { name: "Manual" },
        definition: "User must be logged in as admin",
        jira: { key: "PC-1", summary: "Admin user logged in" },
      },
      {
        issueId: "PC-2",
        preconditionType: { name: "Cucumber" },
        definition: "Given user is logged in",
        jira: { key: "PC-2", summary: "User logged in (Cucumber)" },
      },
    ],
  },
};

export const mockGetPreconditionResponse = {
  getPrecondition: mockPrecondition,
};

export const mockCreatePreconditionResponse = {
  createPrecondition: {
    precondition: {
      issueId: "PC-3",
      jira: { key: "PC-3" },
    },
    warnings: [],
  },
};

export const mockUpdatePreconditionResponse = {
  updatePrecondition: {
    issueId: "PC-1",
    jira: { key: "PC-1" },
  },
};

export const mockDeletePreconditionResponse = {
  deletePrecondition: true,
};

export const mockAddTestsResponse = {
  addTestsToPrecondition: {
    addedTests: ["PROJ-10", "PROJ-11"],
    warning: null,
  },
};

export const mockRemoveTestsResponse = {
  removeTestsFromPrecondition: {
    removedTests: ["PROJ-10"],
    warning: null,
  },
};
