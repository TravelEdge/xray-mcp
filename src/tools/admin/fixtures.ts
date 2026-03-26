// Test fixtures for the admin/settings/coverage domain.

export const mockCoverableIssue = {
  issueId: "10100",
  jira: { key: "PROJ-100", summary: "User can log in" },
  status: { name: "COVERED", description: "Has test coverage", color: "#95c160" },
  tests: {
    total: 3,
    results: [{ issueId: "10001" }, { issueId: "10002" }, { issueId: "10003" }],
  },
};

export const mockGetCoverableIssueResponse = {
  getCoverableIssue: mockCoverableIssue,
};

export const mockListCoverableIssuesResponse = {
  getCoverableIssues: {
    total: 2,
    results: [
      {
        issueId: "10100",
        jira: { key: "PROJ-100", summary: "User can log in" },
        status: { name: "COVERED" },
      },
      {
        issueId: "10101",
        jira: { key: "PROJ-101", summary: "User can reset password" },
        status: { name: "UNCOVERED" },
      },
    ],
  },
};

export const mockDataset = {
  id: "ds-1",
  testIssueId: "10001",
  parameters: [{ name: "username" }, { name: "password" }],
  rows: [
    { order: 0, Values: ["admin", "secret123"] },
    { order: 1, Values: ["user1", "pass456"] },
  ],
};

export const mockGetDatasetResponse = {
  getDataset: mockDataset,
};

export const mockListDatasetsResponse = {
  getDatasets: [
    {
      id: "ds-1",
      testIssueId: "10001",
      parameters: [{ name: "username" }, { name: "password" }],
    },
    {
      id: "ds-2",
      testIssueId: "10002",
      parameters: [{ name: "query" }, { name: "expectedCount" }],
    },
  ],
};

export const mockCucumberFeatureContent = `Feature: User Login
  Scenario: Successful login
    Given a user with valid credentials
    When they log in
    Then they should see the dashboard
`;

export const mockProjectSettings = {
  projectId: "PROJ",
  testEnvironments: ["Chrome", "Firefox"],
  testTypeSettings: {
    testTypes: [
      { name: "Manual", kind: "MANUAL" },
      { name: "Cucumber", kind: "CUCUMBER" },
      { name: "Generic", kind: "GENERIC" },
    ],
    defaultTestTypeId: "1",
  },
  testStepSettings: {
    fields: [{ id: "1", name: "Action" }],
  },
  testRunCustomFieldSettings: {
    fields: [{ id: "1", name: "Browser" }],
  },
  testCoverageSettings: {
    coverableIssueTypeIds: ["10001"],
    epicIssuesRelation: true,
    issueSubTasksRelation: false,
  },
  defectIssueTypes: ["Bug"],
};

export const mockGetProjectSettingsResponse = {
  getProjectSettings: mockProjectSettings,
};

export const mockTestStatuses = [
  { name: "TODO", color: "#aaaaaa", description: "Not executed" },
  { name: "EXECUTING", color: "#f0c330", description: "In progress" },
  { name: "PASS", color: "#95c160", description: "Passed" },
  { name: "FAIL", color: "#df5a49", description: "Failed" },
];

export const mockGetStatusesResponse = {
  getStatuses: mockTestStatuses,
};

export const mockStepStatuses = [
  { name: "TODO", color: "#aaaaaa", description: "Not started" },
  { name: "PASS", color: "#95c160", description: "Passed" },
  { name: "FAIL", color: "#df5a49", description: "Failed" },
];

export const mockGetStepStatusesResponse = {
  getStepStatuses: mockStepStatuses,
};

export const mockIssueLinkTypes = [
  { name: "Tests", inward: "is tested by", outward: "tests" },
  { name: "Defect", inward: "is caused by", outward: "causes" },
];

export const mockGetIssueLinkTypesResponse = {
  getIssueLinkTypes: mockIssueLinkTypes,
};
