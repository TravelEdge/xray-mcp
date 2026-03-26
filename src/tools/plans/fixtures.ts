// Test fixtures for the plans domain (D-28).

export const mockTestPlan = {
  issueId: "10042",
  jira: { key: "PROJ-42", summary: "Release 1.0 Test Plan" },
  tests: {
    total: 3,
    results: [{ issueId: "10001" }, { issueId: "10002" }, { issueId: "10003" }],
  },
  testExecutions: {
    total: 1,
    results: [{ issueId: "10021" }],
  },
};

export const mockGetPlanResponse = {
  getTestPlan: mockTestPlan,
};

export const mockListPlansResponse = {
  getTestPlans: {
    total: 2,
    results: [
      {
        issueId: "10042",
        jira: { key: "PROJ-42", summary: "Release 1.0 Test Plan" },
        tests: {
          total: 3,
          results: [{ issueId: "10001" }, { issueId: "10002" }, { issueId: "10003" }],
        },
        testExecutions: { total: 1, nodes: [{ issueId: "10021" }] },
      },
      {
        issueId: "10043",
        jira: { key: "PROJ-43", summary: "Sprint 5 Test Plan" },
        tests: {
          total: 5,
          results: [
            { issueId: "10004" },
            { issueId: "10005" },
            { issueId: "10006" },
            { issueId: "10007" },
            { issueId: "10008" },
          ],
        },
        testExecutions: { total: 2, nodes: [{ issueId: "10022" }, { issueId: "10023" }] },
      },
    ],
  },
};

export const mockCreatePlanResponse = {
  createTestPlan: {
    testPlan: {
      issueId: "10044",
      jira: { key: "PROJ-44" },
    },
    warnings: [],
  },
};

export const mockDeletePlanResponse = {
  deleteTestPlan: {
    issueId: "10042",
  },
};

export const mockAddTestsResponse = {
  addTestsToTestPlan: {
    addedTests: ["10001", "10002"],
    warning: null,
  },
};

export const mockRemoveTestsResponse = {
  removeTestsFromTestPlan: {
    removedTests: ["10001"],
    warning: null,
  },
};

export const mockAddExecutionsResponse = {
  addTestExecutionsToTestPlan: {
    addedTestExecutions: ["10021", "10022"],
    warning: null,
  },
};

export const mockRemoveExecutionsResponse = {
  removeTestExecutionsFromTestPlan: {
    removedTestExecutions: ["10021"],
    warning: null,
  },
};
