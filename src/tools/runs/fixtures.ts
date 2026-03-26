// Mock Xray API responses for run domain tool tests (D-28).

export const mockTestRun = {
  id: "run-42",
  status: { name: "TODO" },
  comment: "Initial run",
  executedById: "user-1",
  assigneeId: "user-1",
  startedOn: "2026-01-01T00:00:00Z",
  finishedOn: null,
  steps: [
    {
      id: "step-1",
      status: { name: "TODO" },
      comment: null,
      action: "Login",
      result: "Success",
      evidence: [],
      defects: [],
    },
  ],
  customFields: [],
};

export const mockTestRun2 = {
  id: "run-43",
  status: { name: "PASS" },
  comment: "Completed run",
  executedById: "user-2",
  assigneeId: null,
  startedOn: "2026-01-02T00:00:00Z",
  finishedOn: "2026-01-02T01:00:00Z",
  steps: [],
  customFields: [],
};

export const mockGetRunResponse = { getTestRun: mockTestRun };
export const mockGetRunNullResponse = { getTestRun: null };
export const mockGetRunByIdResponse = { getTestRunById: mockTestRun };
export const mockGetRunByIdNullResponse = { getTestRunById: null };

export const mockListRunsResponse = {
  getTestRuns: {
    total: 2,
    results: [mockTestRun, mockTestRun2],
  },
};

export const mockListRunsByIdResponse = {
  getTestRunsById: [mockTestRun, mockTestRun2],
};

export const mockUpdateStatusResponse = {
  updateTestRunStatus: "run-42",
};

export const mockUpdateCommentResponse = {
  updateTestRunComment: "run-42",
};

export const mockUpdateRunResponse = {
  updateTestRun: "run-42",
};

export const mockResetRunResponse = {
  resetTestRun: "run-42",
};

export const mockUpdateStepStatusResponse = {
  updateStepStatus: "step-1",
};

export const mockUpdateStepCommentResponse = {
  updateStepComment: "step-1",
};

export const mockUpdateRunStepResponse = {
  updateTestRunStep: "step-1",
};

export const mockUpdateExampleStatusResponse = {
  updateExampleStatus: "run-42",
};

export const mockUpdateIterationStatusResponse = {
  updateIterationStatus: "run-42",
};

export const mockSetRunTimerResponse = {
  setTestRunTimer: "run-42",
};
