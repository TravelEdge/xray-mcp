import { beforeEach, describe, expect, it, vi } from "vitest";
import { TOOL_REGISTRY } from "../registry.js";

// Import side-effect barrel to register all plan tools
import "./index.js";

import {
  mockGetPlanResponse,
  mockListPlansResponse,
  mockCreatePlanResponse,
  mockDeletePlanResponse,
  mockAddTestsResponse,
  mockRemoveTestsResponse,
  mockAddExecutionsResponse,
  mockRemoveExecutionsResponse,
} from "./fixtures.js";

// ---------------------------------------------------------------------------
// Mock XrayClient — mocked-fetch pattern (D-28, TEST-04)
// ---------------------------------------------------------------------------
const mockExecuteGraphQL = vi.fn();
const mockClient = { executeGraphQL: mockExecuteGraphQL };

/** Find a registered tool by name and invoke its handler with args + mock client. */
async function invokeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const tool = TOOL_REGISTRY.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool.handler({ ...args, _client: mockClient }, { auth: {} as never, format: "toon" });
}

describe("Plan Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // xray_get_test_plan
  // -------------------------------------------------------------------------
  describe("xray_get_test_plan", () => {
    it("returns TOON-formatted plan output", async () => {
      mockExecuteGraphQL.mockResolvedValue(mockGetPlanResponse);

      const result = await invokeTool("xray_get_test_plan", {
        issueId: "10042",
        format: "toon",
      });

      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("10042");
      expect(result.content[0].text).toContain("3 tests");
      expect(result.content[0].text).toContain("1 executions");
    });

    it("returns JSON format when requested", async () => {
      mockExecuteGraphQL.mockResolvedValue(mockGetPlanResponse);

      const result = await invokeTool("xray_get_test_plan", {
        issueId: "10042",
        format: "json",
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.issueId).toBe("10042");
      expect(parsed.jira.key).toBe("PROJ-42");
    });

    it("returns (no data) when getTestPlan is null", async () => {
      mockExecuteGraphQL.mockResolvedValue({ getTestPlan: null });

      const result = await invokeTool("xray_get_test_plan", {
        issueId: "99999",
        format: "toon",
      });

      expect(result.content[0].text).toBe("(no data)");
    });
  });

  // -------------------------------------------------------------------------
  // xray_list_test_plans
  // -------------------------------------------------------------------------
  describe("xray_list_test_plans", () => {
    it("returns paginated list in TOON format", async () => {
      mockExecuteGraphQL.mockResolvedValue(mockListPlansResponse);

      const result = await invokeTool("xray_list_test_plans", {
        limit: 50,
        start: 0,
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("Test Plans");
      expect(text).toContain("2 of 2");
      expect(text).toContain("10042");
      expect(text).toContain("10043");
    });

    it("returns paginated list in JSON format with header", async () => {
      mockExecuteGraphQL.mockResolvedValue(mockListPlansResponse);

      const result = await invokeTool("xray_list_test_plans", {
        limit: 50,
        start: 0,
        format: "json",
      });

      const text = result.content[0].text;
      expect(text).toContain("Test Plans");
      // First line is header, rest is JSON array
      const lines = text.split("\n");
      const jsonPart = lines.slice(1).join("\n");
      const parsed = JSON.parse(jsonPart);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it("passes JQL filter to GraphQL query", async () => {
      mockExecuteGraphQL.mockResolvedValue(mockListPlansResponse);

      await invokeTool("xray_list_test_plans", {
        jql: "project = PROJ",
        limit: 10,
        start: 0,
        format: "toon",
      });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ jql: "project = PROJ", limit: 10, start: 0 }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // xray_create_test_plan
  // -------------------------------------------------------------------------
  describe("xray_create_test_plan", () => {
    it("returns TOON write confirmation on create", async () => {
      mockExecuteGraphQL.mockResolvedValue(mockCreatePlanResponse);

      const result = await invokeTool("xray_create_test_plan", {
        projectKey: "PROJ",
        summary: "Release 2.0 Test Plan",
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("OK:CREATED");
      expect(text).toContain("PROJ-44");
    });

    it("returns JSON format when requested", async () => {
      mockExecuteGraphQL.mockResolvedValue(mockCreatePlanResponse);

      const result = await invokeTool("xray_create_test_plan", {
        projectKey: "PROJ",
        summary: "Release 2.0 Test Plan",
        format: "json",
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.issueId).toBe("10044");
    });
  });

  // -------------------------------------------------------------------------
  // xray_delete_test_plan
  // -------------------------------------------------------------------------
  describe("xray_delete_test_plan", () => {
    it("returns TOON delete confirmation", async () => {
      mockExecuteGraphQL.mockResolvedValue(mockDeletePlanResponse);

      const result = await invokeTool("xray_delete_test_plan", {
        issueId: "10042",
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("OK:DELETED");
      expect(text).toContain("10042");
    });

    it("returns JSON of deleted entity when format=json", async () => {
      mockExecuteGraphQL.mockResolvedValue(mockDeletePlanResponse);

      const result = await invokeTool("xray_delete_test_plan", {
        issueId: "10042",
        format: "json",
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.issueId).toBe("10042");
    });
  });

  // -------------------------------------------------------------------------
  // xray_add_tests_to_plan
  // -------------------------------------------------------------------------
  describe("xray_add_tests_to_plan", () => {
    it("returns TOON update confirmation with count", async () => {
      mockExecuteGraphQL.mockResolvedValue(mockAddTestsResponse);

      const result = await invokeTool("xray_add_tests_to_plan", {
        issueId: "10042",
        testIssueIds: ["10001", "10002"],
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("OK:UPDATED");
      expect(text).toContain("10042");
      expect(text).toContain("added 2 test(s)");
    });
  });

  // -------------------------------------------------------------------------
  // xray_remove_tests_from_plan
  // -------------------------------------------------------------------------
  describe("xray_remove_tests_from_plan", () => {
    it("returns TOON update confirmation with removed count", async () => {
      mockExecuteGraphQL.mockResolvedValue(mockRemoveTestsResponse);

      const result = await invokeTool("xray_remove_tests_from_plan", {
        issueId: "10042",
        testIssueIds: ["10001"],
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("OK:UPDATED");
      expect(text).toContain("10042");
      expect(text).toContain("removed 1 test(s)");
    });
  });

  // -------------------------------------------------------------------------
  // xray_add_executions_to_plan
  // -------------------------------------------------------------------------
  describe("xray_add_executions_to_plan", () => {
    it("returns TOON update confirmation with execution count", async () => {
      mockExecuteGraphQL.mockResolvedValue(mockAddExecutionsResponse);

      const result = await invokeTool("xray_add_executions_to_plan", {
        issueId: "10042",
        executionIssueIds: ["10021", "10022"],
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("OK:UPDATED");
      expect(text).toContain("10042");
      expect(text).toContain("added 2 execution(s)");
    });
  });

  // -------------------------------------------------------------------------
  // xray_remove_executions_from_plan
  // -------------------------------------------------------------------------
  describe("xray_remove_executions_from_plan", () => {
    it("returns TOON update confirmation with removed execution count", async () => {
      mockExecuteGraphQL.mockResolvedValue(mockRemoveExecutionsResponse);

      const result = await invokeTool("xray_remove_executions_from_plan", {
        issueId: "10042",
        executionIssueIds: ["10021"],
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("OK:UPDATED");
      expect(text).toContain("10042");
      expect(text).toContain("removed 1 execution(s)");
    });
  });

  // -------------------------------------------------------------------------
  // Registration check
  // -------------------------------------------------------------------------
  describe("Tool registration", () => {
    it("registers all 8 plan tools in TOOL_REGISTRY", () => {
      const planTools = TOOL_REGISTRY.filter((t) => t.name.includes("plan") || t.name.includes("Plan"));
      expect(planTools.length).toBeGreaterThanOrEqual(8);
    });

    it("xray_get_test_plan is registered with read access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_get_test_plan");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("read");
    });

    it("xray_list_test_plans is registered with read access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_list_test_plans");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("read");
    });

    it("xray_create_test_plan is registered with write access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_create_test_plan");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("write");
    });

    it("xray_delete_test_plan is registered with write access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_delete_test_plan");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("write");
    });

    it("xray_add_tests_to_plan is registered with write access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_add_tests_to_plan");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("write");
    });

    it("xray_remove_tests_from_plan is registered with write access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_remove_tests_from_plan");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("write");
    });

    it("xray_add_executions_to_plan is registered with write access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_add_executions_to_plan");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("write");
    });

    it("xray_remove_executions_from_plan is registered with write access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_remove_executions_from_plan");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("write");
    });
  });
});
