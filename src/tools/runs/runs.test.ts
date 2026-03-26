import { beforeEach, describe, expect, it, vi } from "vitest";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { TOOL_REGISTRY } from "../registry.js";

// Import all run tools to register them (side-effect barrel)
import "./index.js";

import {
  mockGetRunByIdNullResponse,
  mockGetRunByIdResponse,
  mockGetRunNullResponse,
  mockGetRunResponse,
  mockListRunsByIdResponse,
  mockListRunsResponse,
  mockResetRunResponse,
  mockSetRunTimerResponse,
  mockUpdateCommentResponse,
  mockUpdateExampleStatusResponse,
  mockUpdateIterationStatusResponse,
  mockUpdateRunResponse,
  mockUpdateRunStepResponse,
  mockUpdateStatusResponse,
  mockUpdateStepCommentResponse,
  mockUpdateStepStatusResponse,
} from "./fixtures.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeMockClient(response: unknown): XrayClient {
  return {
    executeGraphQL: vi.fn().mockResolvedValue(response),
    executeRest: vi.fn().mockResolvedValue(response),
    executeRestRaw: vi.fn().mockResolvedValue(response),
    executeRestText: vi.fn().mockResolvedValue(""),
  };
}

function findTool(name: string) {
  const tool = TOOL_REGISTRY.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found in registry`);
  return tool;
}

const ctx = {
  auth: {
    credentials: {
      xrayClientId: "id",
      xrayClientSecret: "secret",
      xrayRegion: "global" as const,
    },
    source: "env" as const,
  },
  format: "toon" as const,
};

// ---------------------------------------------------------------------------
// Read tools
// ---------------------------------------------------------------------------

describe("xray_get_test_run", () => {
  it("returns TOON formatted run on success", async () => {
    const client = makeMockClient(mockGetRunResponse);
    const tool = findTool("xray_get_test_run");
    const result = await tool.handler(
      {
        testIssueId: "PROJ-123",
        testExecIssueId: "PROJ-456",
        format: "toon",
        _client: client,
      },
      ctx,
    );

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("run-42");
    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("GetTestRun"),
      { testIssueId: "PROJ-123", testExecIssueId: "PROJ-456" },
    );
  });

  it("returns JSON when format=json", async () => {
    const client = makeMockClient(mockGetRunResponse);
    const tool = findTool("xray_get_test_run");
    const result = await tool.handler(
      {
        testIssueId: "PROJ-123",
        testExecIssueId: "PROJ-456",
        format: "json",
        _client: client,
      },
      ctx,
    );

    expect(() => JSON.parse(result.content[0].text)).not.toThrow();
  });

  it("returns no-data message when getTestRun is null", async () => {
    const client = makeMockClient(mockGetRunNullResponse);
    const tool = findTool("xray_get_test_run");
    const result = await tool.handler(
      {
        testIssueId: "PROJ-999",
        testExecIssueId: "PROJ-456",
        format: "toon",
        _client: client,
      },
      ctx,
    );

    expect(result.content[0].text).toContain("no test run found");
    expect(result.content[0].text).toContain("PROJ-999");
  });
});

describe("xray_get_test_run_by_id", () => {
  it("returns TOON formatted run on success", async () => {
    const client = makeMockClient(mockGetRunByIdResponse);
    const tool = findTool("xray_get_test_run_by_id");
    const result = await tool.handler({ id: "run-42", format: "toon", _client: client }, ctx);

    expect(result.content[0].text).toContain("run-42");
    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("GetTestRunById"),
      { id: "run-42" },
    );
  });

  it("returns no-data message when getTestRunById is null", async () => {
    const client = makeMockClient(mockGetRunByIdNullResponse);
    const tool = findTool("xray_get_test_run_by_id");
    const result = await tool.handler({ id: "run-999", format: "toon", _client: client }, ctx);

    expect(result.content[0].text).toContain("no test run found");
    expect(result.content[0].text).toContain("run-999");
  });
});

describe("xray_list_test_runs", () => {
  it("returns paginated TOON list", async () => {
    const client = makeMockClient(mockListRunsResponse);
    const tool = findTool("xray_list_test_runs");
    const result = await tool.handler(
      {
        testIssueId: "PROJ-123",
        limit: 50,
        start: 0,
        format: "toon",
        _client: client,
      },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("Test Runs");
    expect(text).toContain("run-42");
    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("ListTestRuns"),
      expect.objectContaining({ testIssueIds: ["PROJ-123"], limit: 50, start: 0 }),
    );
  });

  it("includes pagination header with next hint when more results exist", async () => {
    const client = makeMockClient({
      getTestRuns: {
        total: 100,
        results: [mockListRunsResponse.getTestRuns.results[0]],
      },
    });
    const tool = findTool("xray_list_test_runs");
    const result = await tool.handler(
      {
        testIssueId: "PROJ-123",
        limit: 1,
        start: 0,
        format: "toon",
        _client: client,
      },
      ctx,
    );

    expect(result.content[0].text).toContain("next: start=1");
  });
});

describe("xray_list_test_runs_by_id", () => {
  it("returns list of runs for given IDs", async () => {
    const client = makeMockClient(mockListRunsByIdResponse);
    const tool = findTool("xray_list_test_runs_by_id");
    const result = await tool.handler(
      {
        ids: ["run-42", "run-43"],
        format: "toon",
        _client: client,
      },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("run-42");
    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("ListTestRunsById"),
      { ids: ["run-42", "run-43"], limit: 2 },
    );
  });
});

// ---------------------------------------------------------------------------
// Write tools
// ---------------------------------------------------------------------------

describe("xray_update_test_run_status", () => {
  it("returns OK:UPDATED with run ID and status", async () => {
    const client = makeMockClient(mockUpdateStatusResponse);
    const tool = findTool("xray_update_test_run_status");
    const result = await tool.handler(
      { id: "run-42", status: "PASS", format: "toon", _client: client },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:UPDATED");
    expect(text).toContain("run:run-42");
    expect(text).toContain("PASS");
    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("UpdateTestRunStatus"),
      { id: "run-42", status: "PASS" },
    );
  });
});

describe("xray_update_test_run_comment", () => {
  it("returns OK:UPDATED confirmation with run ID", async () => {
    const client = makeMockClient(mockUpdateCommentResponse);
    const tool = findTool("xray_update_test_run_comment");
    const result = await tool.handler(
      {
        id: "run-42",
        comment: "Fixed the login issue",
        format: "toon",
        _client: client,
      },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:UPDATED");
    expect(text).toContain("run:run-42");
    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("UpdateTestRunComment"),
      { id: "run-42", comment: "Fixed the login issue" },
    );
  });
});

describe("xray_update_test_run", () => {
  it("returns OK:UPDATED with comment in details", async () => {
    const client = makeMockClient(mockUpdateRunResponse);
    const tool = findTool("xray_update_test_run");
    const result = await tool.handler(
      {
        id: "run-42",
        comment: "Bug found",
        format: "toon",
        _client: client,
      },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:UPDATED");
    expect(text).toContain("run:run-42");
    expect(text).toContain("comment updated");
  });

  it("calls executeGraphQL with correct variables", async () => {
    const client = makeMockClient(mockUpdateRunResponse);
    const tool = findTool("xray_update_test_run");
    await tool.handler(
      {
        id: "run-42",
        assigneeId: "user-99",
        format: "toon",
        _client: client,
      },
      ctx,
    );

    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("UpdateTestRun"),
      expect.objectContaining({ id: "run-42", assigneeId: "user-99" }),
    );
  });
});

describe("xray_reset_test_run", () => {
  it("returns OK:UPDATED with reset message", async () => {
    const client = makeMockClient(mockResetRunResponse);
    const tool = findTool("xray_reset_test_run");
    const result = await tool.handler({ id: "run-42", format: "toon", _client: client }, ctx);

    const text = result.content[0].text;
    expect(text).toContain("OK:UPDATED");
    expect(text).toContain("run:run-42");
    expect(text).toContain("reset to initial state");
  });

  it("description contains WARNING", () => {
    const tool = findTool("xray_reset_test_run");
    expect(tool.description).toContain("WARNING");
  });
});

describe("xray_update_step_status", () => {
  it("returns OK:UPDATED with run and step IDs and status", async () => {
    const client = makeMockClient(mockUpdateStepStatusResponse);
    const tool = findTool("xray_update_step_status");
    const result = await tool.handler(
      {
        testRunId: "run-42",
        stepId: "step-1",
        status: "PASS",
        format: "toon",
        _client: client,
      },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:UPDATED");
    expect(text).toContain("run:run-42");
    expect(text).toContain("step:step-1");
    expect(text).toContain("PASS");
    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("UpdateTestRunStepStatus"),
      { testRunId: "run-42", stepId: "step-1", status: "PASS", iterationRank: null },
    );
  });
});

describe("xray_update_step_comment", () => {
  it("returns OK:UPDATED with run and step IDs", async () => {
    const client = makeMockClient(mockUpdateStepCommentResponse);
    const tool = findTool("xray_update_step_comment");
    const result = await tool.handler(
      {
        testRunId: "run-42",
        stepId: "step-1",
        comment: "Step completed",
        format: "toon",
        _client: client,
      },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:UPDATED");
    expect(text).toContain("run:run-42/step:step-1");
  });
});

describe("xray_update_test_run_step", () => {
  it("returns OK:UPDATED with step details", async () => {
    const client = makeMockClient(mockUpdateRunStepResponse);
    const tool = findTool("xray_update_test_run_step");
    const result = await tool.handler(
      {
        testRunId: "run-42",
        stepId: "step-1",
        updateData: {
          status: "FAIL",
          comment: "Login page not loading",
        },
        format: "toon",
        _client: client,
      },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:UPDATED");
    expect(text).toContain("run:run-42/step:step-1");
    expect(text).toContain("FAIL");
  });

  it("calls executeGraphQL with correct variables", async () => {
    const client = makeMockClient(mockUpdateRunStepResponse);
    const tool = findTool("xray_update_test_run_step");
    await tool.handler(
      {
        testRunId: "run-42",
        stepId: "step-1",
        updateData: {
          defects: ["PROJ-789"],
        },
        format: "toon",
        _client: client,
      },
      ctx,
    );

    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("UpdateTestRunStep"),
      expect.objectContaining({
        testRunId: "run-42",
        stepId: "step-1",
        updateData: { defects: ["PROJ-789"] },
      }),
    );
  });
});

describe("xray_update_example_status", () => {
  it("returns OK:UPDATED with example ID and status", async () => {
    const client = makeMockClient(mockUpdateExampleStatusResponse);
    const tool = findTool("xray_update_example_status");
    const result = await tool.handler(
      {
        exampleId: "example-1",
        status: "PASS",
        format: "toon",
        _client: client,
      },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:UPDATED");
    expect(text).toContain("example:example-1");
    expect(text).toContain("PASS");
    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("UpdateTestRunExampleStatus"),
      { exampleId: "example-1", status: "PASS" },
    );
  });
});

describe("xray_update_iteration_status", () => {
  it("returns OK:UPDATED with iteration rank and status", async () => {
    const client = makeMockClient(mockUpdateIterationStatusResponse);
    const tool = findTool("xray_update_iteration_status");
    const result = await tool.handler(
      {
        testRunId: "run-42",
        iterationRank: "1",
        status: "FAIL",
        format: "toon",
        _client: client,
      },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:UPDATED");
    expect(text).toContain("run:run-42/iteration:1");
    expect(text).toContain("FAIL");
    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("UpdateIterationStatus"),
      { testRunId: "run-42", iterationRank: "1", status: "FAIL" },
    );
  });
});

describe("xray_set_test_run_timer", () => {
  it("returns OK:UPDATED with running:true", async () => {
    const client = makeMockClient(mockSetRunTimerResponse);
    const tool = findTool("xray_set_test_run_timer");
    const result = await tool.handler(
      { testRunId: "run-42", running: true, format: "toon", _client: client },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:UPDATED");
    expect(text).toContain("run:run-42");
    expect(text).toContain("running:true");
    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("SetTestRunTimer"),
      { testRunId: "run-42", running: true, reset: null },
    );
  });

  it("returns OK:UPDATED with running:false", async () => {
    const client = makeMockClient(mockSetRunTimerResponse);
    const tool = findTool("xray_set_test_run_timer");
    const result = await tool.handler(
      { testRunId: "run-42", running: false, format: "toon", _client: client },
      ctx,
    );

    expect(result.content[0].text).toContain("running:false");
  });
});

// ---------------------------------------------------------------------------
// Registration verification
// ---------------------------------------------------------------------------

describe("run tool registration", () => {
  const runToolNames = [
    "xray_get_test_run",
    "xray_get_test_run_by_id",
    "xray_list_test_runs",
    "xray_list_test_runs_by_id",
    "xray_update_test_run_status",
    "xray_update_test_run_comment",
    "xray_update_test_run",
    "xray_reset_test_run",
    "xray_update_step_status",
    "xray_update_step_comment",
    "xray_update_test_run_step",
    "xray_update_example_status",
    "xray_update_iteration_status",
    "xray_set_test_run_timer",
  ];

  it("all 14 run tools are registered in TOOL_REGISTRY", () => {
    const registeredNames = TOOL_REGISTRY.map((t) => t.name);
    for (const name of runToolNames) {
      expect(registeredNames).toContain(name);
    }
  });

  it("read tools have accessLevel read", () => {
    const readTools = [
      "xray_get_test_run",
      "xray_get_test_run_by_id",
      "xray_list_test_runs",
      "xray_list_test_runs_by_id",
    ];
    for (const name of readTools) {
      const tool = TOOL_REGISTRY.find((t) => t.name === name);
      expect(tool?.accessLevel).toBe("read");
    }
  });

  it("write tools have accessLevel write", () => {
    const writeTools = [
      "xray_update_test_run_status",
      "xray_update_test_run_comment",
      "xray_update_test_run",
      "xray_reset_test_run",
      "xray_update_step_status",
      "xray_update_step_comment",
      "xray_update_test_run_step",
      "xray_update_example_status",
      "xray_update_iteration_status",
      "xray_set_test_run_timer",
    ];
    for (const name of writeTools) {
      const tool = TOOL_REGISTRY.find((t) => t.name === name);
      expect(tool?.accessLevel).toBe("write");
    }
  });
});
