// Mock Xray API responses for test domain tool tests (D-28).

export const mockTest = {
  issueId: "PROJ-123",
  testType: { name: "Manual" },
  status: { name: "TODO" },
  folder: { path: "/Regression/Login" },
  steps: {
    nodes: [
      { id: "step-1", action: "Navigate to login", data: "/login", result: "Page loads" },
    ],
  },
  preconditions: {
    results: [{ issueId: "PROJ-100", jira: { key: "PROJ-100", summary: "User exists" } }],
  },
  jira: { key: "PROJ-123", summary: "Login validation test" },
};

export const mockTest2 = {
  issueId: "PROJ-124",
  testType: { name: "Manual" },
  status: { name: "PASS" },
  folder: { path: "/Regression/Login" },
  steps: { nodes: [] },
  preconditions: { results: [] },
  jira: { key: "PROJ-124", summary: "Logout test" },
};

export const mockExpandedTest = {
  ...mockTest,
  steps: {
    nodes: [
      {
        id: "step-1",
        action: "Navigate to login",
        data: "/login",
        result: "Page loads",
        callTestStep: {
          test: { issueId: "PROJ-200", jira: { key: "PROJ-200", summary: "Called test" } },
          steps: {
            nodes: [
              { id: "nested-1", action: "Click login", data: null, result: "Login form shown" },
            ],
          },
        },
      },
    ],
  },
};

export const mockTestNoCallStep = {
  ...mockTest,
  steps: {
    nodes: [
      {
        id: "step-1",
        action: "Navigate to login",
        data: "/login",
        result: "Page loads",
        callTestStep: null,
      },
    ],
  },
};

export const mockGetTestResponse = { getTest: mockTest };
export const mockGetTestNullResponse = { getTest: null };
export const mockGetExpandedTestResponse = { getTest: mockExpandedTest };
export const mockGetExpandedTestNoCallStepResponse = { getTest: mockTestNoCallStep };

export const mockListTestsResponse = {
  getTests: {
    total: 2,
    results: [mockTest, mockTest2],
  },
};

export const mockCreateTestResponse = {
  createTest: {
    test: {
      issueId: "PROJ-456",
      jira: { key: "PROJ-456", summary: "New test" },
    },
    warnings: [],
  },
};

export const mockDeleteTestResponse = { deleteTest: "PROJ-123" };

export const mockUpdateTestTypeResponse = { updateTestType: { issueId: "PROJ-123" } };

export const mockUpdateGherkinResponse = { updateGherkinDefinition: "PROJ-123" };

export const mockUpdateUnstructuredResponse = { updateUnstructuredDefinition: "PROJ-123" };

export const mockAddTestStepResponse = {
  addTestStep: { id: "step-new", action: "New action", data: null, result: null },
};

export const mockUpdateTestStepResponse = {
  updateTestStep: { id: "step-1", action: "Updated action", data: "/login", result: "Page loads" },
};

export const mockRemoveTestStepResponse = { removeTestStep: "step-1" };

export const mockRemoveAllTestStepsResponse = { removeAllTestSteps: "PROJ-123" };
