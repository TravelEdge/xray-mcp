// Mock API response fixtures for execution domain tests (D-28, TEST-04)

export const EXEC_FIXTURE = {
  issueId: "PROJ-456",
  jira: { key: "PROJ-456", summary: "Sprint 1 Regression Run" },
  testRuns: {
    total: 2,
    results: [
      { id: "run-001", status: { name: "PASS" } },
      { id: "run-002", status: { name: "TODO" } },
    ],
  },
  testEnvironments: ["Chrome", "Firefox"],
};

export const EXEC_LIST_FIXTURE = {
  getTestExecutions: {
    total: 2,
    results: [
      {
        issueId: "PROJ-456",
        jira: { key: "PROJ-456", summary: "Sprint 1 Run" },
        testEnvironments: ["Chrome"],
      },
      {
        issueId: "PROJ-789",
        jira: { key: "PROJ-789", summary: "Sprint 2 Run" },
        testEnvironments: [],
      },
    ],
  },
};

export const CREATE_EXEC_FIXTURE = {
  createTestExecution: {
    testExecution: {
      issueId: "PROJ-456",
      jira: { key: "PROJ-456", summary: "New Test Execution" },
    },
    warnings: [],
  },
};

export const DELETE_EXEC_FIXTURE = {
  deleteTestExecution: "PROJ-456",
};

export const ADD_TESTS_FIXTURE = {
  addTestsToTestExecution: {
    addedTests: ["PROJ-100", "PROJ-101"],
    warning: null,
  },
};

export const REMOVE_TESTS_FIXTURE = {
  removeTestsFromTestExecution: "OK",
};

export const ADD_ENVS_FIXTURE = {
  addTestEnvironmentsToTestExecution: {
    issueId: "PROJ-456",
    testEnvironments: ["Chrome", "Firefox", "Safari"],
  },
};

export const REMOVE_ENVS_FIXTURE = {
  removeTestEnvironmentsFromTestExecution: "OK",
};
