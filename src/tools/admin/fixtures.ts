// Test fixtures for the admin/settings/coverage domain.

export const mockCoverableIssue = {
  issueId: "10100",
  jira: { key: "PROJ-100", summary: "User can log in" },
  testCoverage: {
    covered: true,
    coveragePercentage: 75,
    tests: {
      total: 3,
      results: [{ issueId: "10001" }, { issueId: "10002" }, { issueId: "10003" }],
    },
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
        testCoverage: { covered: true, coveragePercentage: 75 },
      },
      {
        issueId: "10101",
        jira: { key: "PROJ-101", summary: "User can reset password" },
        testCoverage: { covered: false, coveragePercentage: 0 },
      },
    ],
  },
};

export const mockDataset = {
  name: "Login Test Data",
  parameters: [{ name: "username" }, { name: "password" }],
  rows: [
    ["admin", "secret123"],
    ["user1", "pass456"],
  ],
  totalRows: 2,
};

export const mockGetDatasetResponse = {
  getDataset: mockDataset,
};

export const mockListDatasetsResponse = {
  getDatasets: {
    total: 2,
    results: [
      {
        name: "Login Test Data",
        totalRows: 2,
        parameters: [{ name: "username" }, { name: "password" }],
      },
      {
        name: "Search Test Data",
        totalRows: 5,
        parameters: [{ name: "query" }, { name: "expectedCount" }],
      },
    ],
  },
};

export const mockCucumberFeatureContent = `Feature: User Login
  Scenario: Successful login
    Given a user with valid credentials
    When they log in
    Then they should see the dashboard
`;

export const mockProjectSettings = {
  projectId: "PROJ",
  testTypes: [
    { name: "Manual", kind: "MANUAL" },
    { name: "Cucumber", kind: "CUCUMBER" },
    { name: "Generic", kind: "GENERIC" },
  ],
  stepStatuses: [
    { name: "TODO", color: "#aaaaaa", description: "Not started" },
    { name: "PASS", color: "#95c160", description: "Passed" },
    { name: "FAIL", color: "#df5a49", description: "Failed" },
  ],
  testStatuses: [
    { name: "TODO", color: "#aaaaaa", description: "Not executed" },
    { name: "EXECUTING", color: "#f0c330", description: "In progress" },
    { name: "PASS", color: "#95c160", description: "Passed" },
    { name: "FAIL", color: "#df5a49", description: "Failed" },
  ],
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
