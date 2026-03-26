/**
 * Shared test fixtures for sets domain tests (D-28).
 */

export const mockTestSet = {
  issueId: "10042",
  jira: { key: "PROJ-42", summary: "Login flow tests" },
  tests: {
    total: 3,
    nodes: [{ issueId: "10001" }, { issueId: "10002" }, { issueId: "10003" }],
  },
};

export const mockTestSetSummary = {
  issueId: "10042",
  jira: { key: "PROJ-42", summary: "Login flow tests" },
  tests: { total: 3, nodes: [{ issueId: "10001" }, { issueId: "10002" }, { issueId: "10003" }] },
};

export const mockTestSetSummary2 = {
  issueId: "10043",
  jira: { key: "PROJ-43", summary: "Checkout flow tests" },
  tests: { total: 5, nodes: [{ issueId: "10004" }, { issueId: "10005" }, { issueId: "10006" }, { issueId: "10007" }, { issueId: "10008" }] },
};

export const mockGetSetResponse = {
  getTestSet: mockTestSet,
};

export const mockGetSetNullResponse = {
  getTestSet: null,
};

export const mockListSetsResponse = {
  getTestSets: {
    total: 2,
    results: [mockTestSetSummary, mockTestSetSummary2],
  },
};

export const mockCreateSetResponse = {
  createTestSet: {
    testSet: {
      issueId: "10044",
      jira: { key: "PROJ-44", summary: "New test set" },
    },
    warnings: [],
  },
};

export const mockCreateSetNullResponse = {
  createTestSet: {
    testSet: null,
    warnings: ["Creation failed"],
  },
};

export const mockDeleteSetResponse = {
  deleteTestSet: "10042",
};

export const mockAddTestsResponse = {
  addTestsToTestSet: {
    addedTests: ["10001", "10002"],
    warnings: [],
  },
};

export const mockRemoveTestsResponse = {
  removeTestsFromTestSet: {
    removedTests: ["10001"],
    warnings: [],
  },
};
