import { beforeEach, describe, expect, it, vi } from "vitest";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { TOOL_REGISTRY } from "../registry.js";

// Import all test tools to register them (side-effect barrel)
import "./index.js";

import {
  mockAddTestStepResponse,
  mockCreateTestResponse,
  mockDeleteTestResponse,
  mockGetExpandedTestNoCallStepResponse,
  mockGetExpandedTestResponse,
  mockGetTestNullResponse,
  mockGetTestResponse,
  mockListTestsResponse,
  mockRemoveAllTestStepsResponse,
  mockRemoveTestStepResponse,
  mockUpdateGherkinResponse,
  mockUpdateTestStepResponse,
  mockUpdateTestTypeResponse,
  mockUpdateUnstructuredResponse,
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

describe("xray_get_test_details", () => {
  it("returns TOON formatted test on success", async () => {
    const client = makeMockClient(mockGetTestResponse);
    const tool = findTool("xray_get_test_details");
    const result = await tool.handler({ issueId: "PROJ-123", format: "toon", _client: client }, ctx);

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("PROJ-123");
    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("GetTest"),
      { issueId: "PROJ-123" },
    );
  });

  it("returns JSON format when format=json", async () => {
    const client = makeMockClient(mockGetTestResponse);
    const tool = findTool("xray_get_test_details");
    const result = await tool.handler({ issueId: "PROJ-123", format: "json", _client: client }, ctx);

    const text = result.content[0].text;
    expect(() => JSON.parse(text)).not.toThrow();
  });

  it("returns ERR:NOT_FOUND when getTest is null", async () => {
    const client = makeMockClient(mockGetTestNullResponse);
    const tool = findTool("xray_get_test_details");
    const result = await tool.handler({ issueId: "PROJ-999", format: "toon", _client: client }, ctx);

    expect(result.content[0].text).toContain("ERR:NOT_FOUND");
    expect(result.content[0].text).toContain("PROJ-999");
  });
});

describe("xray_get_expanded_test", () => {
  it("returns expanded test with callTestStep data", async () => {
    const client = makeMockClient(mockGetExpandedTestResponse);
    const tool = findTool("xray_get_expanded_test");
    const result = await tool.handler({ issueId: "PROJ-123", format: "toon", _client: client }, ctx);

    expect(result.content[0].text).toContain("PROJ-123");
    // Should NOT have the fallback hint when callTestStep data is present
    expect(result.content[0].text).not.toContain("unavailable");
  });

  it("appends fallback hint when callTestStep is null", async () => {
    const client = makeMockClient(mockGetExpandedTestNoCallStepResponse);
    const tool = findTool("xray_get_expanded_test");
    const result = await tool.handler({ issueId: "PROJ-123", format: "toon", _client: client }, ctx);

    expect(result.content[0].text).toContain("PROJ-123");
    expect(result.content[0].text).toContain("unavailable");
    expect(result.content[0].text).toContain("base steps");
  });

  it("falls back to standard query when expanded query throws", async () => {
    const client: XrayClient = {
      executeGraphQL: vi
        .fn()
        .mockRejectedValueOnce(new Error("Unknown query: getExpandedTests"))
        .mockResolvedValueOnce(mockGetTestResponse),
      executeRest: vi.fn(),
      executeRestRaw: vi.fn(),
      executeRestText: vi.fn().mockResolvedValue(""),
    };
    const tool = findTool("xray_get_expanded_test");
    const result = await tool.handler({ issueId: "PROJ-123", format: "toon", _client: client }, ctx);

    expect(result.content[0].text).toContain("PROJ-123");
    expect(result.content[0].text).toContain("unavailable");
    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledTimes(2);
  });

  it("returns ERR:NOT_FOUND when getTest is null", async () => {
    const client = makeMockClient(mockGetTestNullResponse);
    const tool = findTool("xray_get_expanded_test");
    const result = await tool.handler({ issueId: "PROJ-999", format: "toon", _client: client }, ctx);

    expect(result.content[0].text).toContain("ERR:NOT_FOUND");
  });
});

describe("xray_list_tests", () => {
  it("returns paginated TOON list", async () => {
    const client = makeMockClient(mockListTestsResponse);
    const tool = findTool("xray_list_tests");
    const result = await tool.handler(
      { jql: "project = PROJ", limit: 50, start: 0, format: "toon", _client: client },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("Tests");
    expect(text).toContain("PROJ-123");
    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("GetTests"),
      expect.objectContaining({ jql: "project = PROJ", limit: 50, start: 0 }),
    );
  });

  it("includes pagination header with next hint when more results exist", async () => {
    const client = makeMockClient({
      getTests: { total: 100, results: [{ issueId: "PROJ-1", testType: { name: "Manual" }, status: { name: "TODO" }, jira: { key: "PROJ-1", summary: "t1" }, folder: null, steps: { nodes: [] } }] },
    });
    const tool = findTool("xray_list_tests");
    const result = await tool.handler(
      { limit: 1, start: 0, format: "toon", _client: client },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("next: start=1");
  });
});

describe("xray_list_expanded_tests", () => {
  it("defaults to limit 10 (not 50)", () => {
    const tool = findTool("xray_list_expanded_tests");
    const schema = tool.inputSchema;
    // Parse with no limit provided — should default to 10
    const parsed = schema.parse({ issueId: "PROJ-123" });
    expect((parsed as { limit: number }).limit).toBe(10);
  });

  it("returns paginated TOON list", async () => {
    const client = makeMockClient(mockListTestsResponse);
    const tool = findTool("xray_list_expanded_tests");
    const result = await tool.handler(
      { limit: 10, start: 0, format: "toon", _client: client },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("Tests");
  });

  it("falls back gracefully when query throws", async () => {
    const client: XrayClient = {
      executeGraphQL: vi
        .fn()
        .mockRejectedValueOnce(new Error("Unknown query"))
        .mockResolvedValueOnce(mockListTestsResponse),
      executeRest: vi.fn(),
      executeRestRaw: vi.fn(),
      executeRestText: vi.fn().mockResolvedValue(""),
    };
    const tool = findTool("xray_list_expanded_tests");
    const result = await tool.handler(
      { limit: 10, start: 0, format: "toon", _client: client },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("Tests");
    expect(text).toContain("unavailable");
  });
});

// ---------------------------------------------------------------------------
// Write tools
// ---------------------------------------------------------------------------

describe("xray_create_test", () => {
  it("returns OK:CREATED confirmation with key and type", async () => {
    const client = makeMockClient(mockCreateTestResponse);
    const tool = findTool("xray_create_test");
    const result = await tool.handler(
      {
        projectKey: "PROJ",
        summary: "New login test",
        testType: "Manual",
        format: "toon",
        _client: client,
      },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:CREATED");
    expect(text).toContain("PROJ-456");
    expect(text).toContain("Manual");
  });

  it("calls executeGraphQL with correct variables", async () => {
    const client = makeMockClient(mockCreateTestResponse);
    const tool = findTool("xray_create_test");
    await tool.handler(
      {
        projectKey: "PROJ",
        summary: "Test summary",
        testType: "Cucumber",
        gherkin: "Feature: Login\nScenario: ...",
        format: "toon",
        _client: client,
      },
      ctx,
    );

    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.stringContaining("CreateTest"),
      expect.objectContaining({
        projectKey: "PROJ",
        summary: "Test summary",
        testType: "Cucumber",
      }),
    );
  });
});

describe("xray_delete_test", () => {
  it("returns OK:DELETED confirmation", async () => {
    const client = makeMockClient(mockDeleteTestResponse);
    const tool = findTool("xray_delete_test");
    const result = await tool.handler(
      { issueId: "PROJ-123", format: "toon", _client: client },
      ctx,
    );

    expect(result.content[0].text).toContain("OK:DELETED");
    expect(result.content[0].text).toContain("PROJ-123");
  });
});

describe("xray_update_test_type", () => {
  it("returns OK:UPDATED confirmation with new type", async () => {
    const client = makeMockClient(mockUpdateTestTypeResponse);
    const tool = findTool("xray_update_test_type");
    const result = await tool.handler(
      { issueId: "PROJ-123", testType: "Cucumber", format: "toon", _client: client },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:UPDATED");
    expect(text).toContain("Cucumber");
  });
});

describe("xray_update_gherkin_definition", () => {
  it("returns OK:UPDATED confirmation", async () => {
    const client = makeMockClient(mockUpdateGherkinResponse);
    const tool = findTool("xray_update_gherkin_definition");
    const result = await tool.handler(
      {
        issueId: "PROJ-123",
        gherkin: "Feature: Login\n  Scenario: Success",
        format: "toon",
        _client: client,
      },
      ctx,
    );

    expect(result.content[0].text).toContain("OK:UPDATED");
    expect(result.content[0].text).toContain("PROJ-123");
  });
});

describe("xray_update_unstructured_definition", () => {
  it("returns OK:UPDATED confirmation", async () => {
    const client = makeMockClient(mockUpdateUnstructuredResponse);
    const tool = findTool("xray_update_unstructured_definition");
    const result = await tool.handler(
      { issueId: "PROJ-123", definition: "Test definition text", format: "toon", _client: client },
      ctx,
    );

    expect(result.content[0].text).toContain("OK:UPDATED");
    expect(result.content[0].text).toContain("PROJ-123");
  });
});

describe("xray_add_test_step", () => {
  it("returns OK:CREATED confirmation with step ID", async () => {
    const client = makeMockClient(mockAddTestStepResponse);
    const tool = findTool("xray_add_test_step");
    const result = await tool.handler(
      {
        issueId: "PROJ-123",
        action: "Navigate to login page",
        data: "/login",
        result: "Page loads",
        format: "toon",
        _client: client,
      },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:CREATED");
    expect(text).toContain("step-new");
  });
});

describe("xray_update_test_step", () => {
  it("returns OK:UPDATED confirmation with step ID", async () => {
    const client = makeMockClient(mockUpdateTestStepResponse);
    const tool = findTool("xray_update_test_step");
    const result = await tool.handler(
      {
        issueId: "PROJ-123",
        stepId: "step-1",
        action: "Updated action",
        format: "toon",
        _client: client,
      },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:UPDATED");
    expect(text).toContain("step-1");
  });
});

describe("xray_remove_test_step", () => {
  it("returns OK:DELETED confirmation with step ID", async () => {
    const client = makeMockClient(mockRemoveTestStepResponse);
    const tool = findTool("xray_remove_test_step");
    const result = await tool.handler(
      { issueId: "PROJ-123", stepId: "step-1", format: "toon", _client: client },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:DELETED");
    expect(text).toContain("step-1");
  });
});

describe("xray_remove_all_test_steps", () => {
  it("returns OK:DELETED confirmation", async () => {
    const client = makeMockClient(mockRemoveAllTestStepsResponse);
    const tool = findTool("xray_remove_all_test_steps");
    const result = await tool.handler(
      { issueId: "PROJ-123", format: "toon", _client: client },
      ctx,
    );

    const text = result.content[0].text;
    expect(text).toContain("OK:DELETED");
    expect(text).toContain("PROJ-123");
  });

  it("description contains WARNING and cannot be undone", () => {
    const tool = findTool("xray_remove_all_test_steps");
    expect(tool.description).toContain("WARNING");
    expect(tool.description).toContain("cannot be undone");
  });
});

// ---------------------------------------------------------------------------
// Registration verification
// ---------------------------------------------------------------------------

describe("test tool registration", () => {
  const testToolNames = [
    "xray_get_test_details",
    "xray_get_expanded_test",
    "xray_list_tests",
    "xray_list_expanded_tests",
    "xray_create_test",
    "xray_delete_test",
    "xray_update_test_type",
    "xray_update_gherkin_definition",
    "xray_update_unstructured_definition",
    "xray_add_test_step",
    "xray_update_test_step",
    "xray_remove_test_step",
    "xray_remove_all_test_steps",
  ];

  it("all 13 test tools are registered in TOOL_REGISTRY", () => {
    const registeredNames = TOOL_REGISTRY.map((t) => t.name);
    for (const name of testToolNames) {
      expect(registeredNames).toContain(name);
    }
  });

  it("read tools have accessLevel read", () => {
    const readTools = [
      "xray_get_test_details",
      "xray_get_expanded_test",
      "xray_list_tests",
      "xray_list_expanded_tests",
    ];
    for (const name of readTools) {
      const tool = TOOL_REGISTRY.find((t) => t.name === name);
      expect(tool?.accessLevel).toBe("read");
    }
  });

  it("write tools have accessLevel write", () => {
    const writeTools = [
      "xray_create_test",
      "xray_delete_test",
      "xray_update_test_type",
      "xray_update_gherkin_definition",
      "xray_update_unstructured_definition",
      "xray_add_test_step",
      "xray_update_test_step",
      "xray_remove_test_step",
      "xray_remove_all_test_steps",
    ];
    for (const name of writeTools) {
      const tool = TOOL_REGISTRY.find((t) => t.name === name);
      expect(tool?.accessLevel).toBe("write");
    }
  });
});
