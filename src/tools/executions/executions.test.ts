import { beforeEach, describe, expect, it, vi } from "vitest";
import { TOOL_REGISTRY } from "../registry.js";

// Import side-effect barrel to register all execution tools
import "./index.js";

import {
  ADD_ENVS_FIXTURE,
  ADD_TESTS_FIXTURE,
  CREATE_EXEC_FIXTURE,
  DELETE_EXEC_FIXTURE,
  EXEC_FIXTURE,
  EXEC_LIST_FIXTURE,
  REMOVE_ENVS_FIXTURE,
  REMOVE_TESTS_FIXTURE,
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

describe("Execution Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // xray_get_test_execution
  // -------------------------------------------------------------------------
  describe("xray_get_test_execution", () => {
    it("returns TOON-formatted execution output", async () => {
      mockExecuteGraphQL.mockResolvedValue({ getTestExecution: EXEC_FIXTURE });

      const result = await invokeTool("xray_get_test_execution", {
        issueId: "PROJ-456",
        format: "toon",
      });

      expect(result.content[0].type).toBe("text");
      const text = result.content[0].text;
      expect(text).toContain("PROJ-456");
      expect(text).toContain("2");
    });

    it("returns JSON format when requested", async () => {
      mockExecuteGraphQL.mockResolvedValue({ getTestExecution: EXEC_FIXTURE });

      const result = await invokeTool("xray_get_test_execution", {
        issueId: "PROJ-456",
        format: "json",
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.issueId).toBe("PROJ-456");
      expect(parsed.jira.key).toBe("PROJ-456");
    });

    it("returns (no data) when getTestExecution is null", async () => {
      mockExecuteGraphQL.mockResolvedValue({ getTestExecution: null });

      const result = await invokeTool("xray_get_test_execution", {
        issueId: "PROJ-999",
        format: "toon",
      });

      expect(result.content[0].text).toBe("(no data)");
    });

    it("passes issueId to GraphQL query", async () => {
      mockExecuteGraphQL.mockResolvedValue({ getTestExecution: EXEC_FIXTURE });

      await invokeTool("xray_get_test_execution", { issueId: "PROJ-456", format: "toon" });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ issueId: "PROJ-456" }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // xray_list_test_executions
  // -------------------------------------------------------------------------
  describe("xray_list_test_executions", () => {
    it("returns paginated list in TOON format", async () => {
      mockExecuteGraphQL.mockResolvedValue(EXEC_LIST_FIXTURE);

      const result = await invokeTool("xray_list_test_executions", {
        limit: 50,
        start: 0,
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("Executions");
      expect(text).toContain("2 of 2");
      expect(text).toContain("PROJ-456");
      expect(text).toContain("PROJ-789");
    });

    it("returns paginated list in JSON format with header", async () => {
      mockExecuteGraphQL.mockResolvedValue(EXEC_LIST_FIXTURE);

      const result = await invokeTool("xray_list_test_executions", {
        limit: 50,
        start: 0,
        format: "json",
      });

      const text = result.content[0].text;
      expect(text).toContain("Executions");
      const lines = text.split("\n");
      const jsonPart = lines.slice(1).join("\n");
      const parsed = JSON.parse(jsonPart);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it("passes JQL filter to GraphQL query", async () => {
      mockExecuteGraphQL.mockResolvedValue(EXEC_LIST_FIXTURE);

      await invokeTool("xray_list_test_executions", {
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
  // xray_create_test_execution
  // -------------------------------------------------------------------------
  describe("xray_create_test_execution", () => {
    it("returns TOON write confirmation on create", async () => {
      mockExecuteGraphQL.mockResolvedValue(CREATE_EXEC_FIXTURE);

      const result = await invokeTool("xray_create_test_execution", {
        jira: { fields: { summary: "New Test Execution", project: { key: "PROJ" } } },
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("OK:CREATED");
      expect(text).toContain("PROJ-456");
    });

    it("includes test count in confirmation when tests provided", async () => {
      mockExecuteGraphQL.mockResolvedValue(CREATE_EXEC_FIXTURE);

      const result = await invokeTool("xray_create_test_execution", {
        jira: { fields: { summary: "New Test Execution", project: { key: "PROJ" } } },
        testIssueIds: ["PROJ-1", "PROJ-2"],
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("2 tests");
    });

    it("returns JSON of created entity when format=json", async () => {
      mockExecuteGraphQL.mockResolvedValue(CREATE_EXEC_FIXTURE);

      const result = await invokeTool("xray_create_test_execution", {
        jira: { fields: { summary: "New Test Execution", project: { key: "PROJ" } } },
        format: "json",
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.issueId).toBe("PROJ-456");
    });
  });

  // -------------------------------------------------------------------------
  // xray_delete_test_execution
  // -------------------------------------------------------------------------
  describe("xray_delete_test_execution", () => {
    it("returns TOON delete confirmation", async () => {
      mockExecuteGraphQL.mockResolvedValue(DELETE_EXEC_FIXTURE);

      const result = await invokeTool("xray_delete_test_execution", {
        issueId: "PROJ-456",
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("OK:DELETED");
      expect(text).toContain("PROJ-456");
    });

    it("returns JSON format when format=json", async () => {
      mockExecuteGraphQL.mockResolvedValue(DELETE_EXEC_FIXTURE);

      const result = await invokeTool("xray_delete_test_execution", {
        issueId: "PROJ-456",
        format: "json",
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.deleted).toBe("PROJ-456");
    });
  });

  // -------------------------------------------------------------------------
  // xray_add_tests_to_execution
  // -------------------------------------------------------------------------
  describe("xray_add_tests_to_execution", () => {
    it("returns TOON update confirmation with added count", async () => {
      mockExecuteGraphQL.mockResolvedValue(ADD_TESTS_FIXTURE);

      const result = await invokeTool("xray_add_tests_to_execution", {
        issueId: "PROJ-456",
        testIssueIds: ["PROJ-100", "PROJ-101"],
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("OK:UPDATED");
      expect(text).toContain("PROJ-456");
      expect(text).toContain("added:2");
    });

    it("passes issueId and testIssueIds to GraphQL", async () => {
      mockExecuteGraphQL.mockResolvedValue(ADD_TESTS_FIXTURE);

      await invokeTool("xray_add_tests_to_execution", {
        issueId: "PROJ-456",
        testIssueIds: ["PROJ-100"],
        format: "toon",
      });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          issueId: "PROJ-456",
          testIssueIds: ["PROJ-100"],
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // xray_remove_tests_from_execution
  // -------------------------------------------------------------------------
  describe("xray_remove_tests_from_execution", () => {
    it("returns TOON update confirmation with removed count", async () => {
      mockExecuteGraphQL.mockResolvedValue(REMOVE_TESTS_FIXTURE);

      const result = await invokeTool("xray_remove_tests_from_execution", {
        issueId: "PROJ-456",
        testIssueIds: ["PROJ-100"],
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("OK:UPDATED");
      expect(text).toContain("PROJ-456");
      expect(text).toContain("removed:1");
    });
  });

  // -------------------------------------------------------------------------
  // xray_add_environments_to_execution
  // -------------------------------------------------------------------------
  describe("xray_add_environments_to_execution", () => {
    it("returns TOON update confirmation with env list", async () => {
      mockExecuteGraphQL.mockResolvedValue(ADD_ENVS_FIXTURE);

      const result = await invokeTool("xray_add_environments_to_execution", {
        issueId: "PROJ-456",
        testEnvironments: ["Safari"],
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("OK:UPDATED");
      expect(text).toContain("PROJ-456");
      expect(text).toContain("envs:");
    });

    it("returns JSON of updated environments when format=json", async () => {
      mockExecuteGraphQL.mockResolvedValue(ADD_ENVS_FIXTURE);

      const result = await invokeTool("xray_add_environments_to_execution", {
        issueId: "PROJ-456",
        testEnvironments: ["Safari"],
        format: "json",
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.issueId).toBe("PROJ-456");
      expect(parsed.testEnvironments).toContain("Safari");
    });
  });

  // -------------------------------------------------------------------------
  // xray_remove_environments_from_execution
  // -------------------------------------------------------------------------
  describe("xray_remove_environments_from_execution", () => {
    it("returns TOON update confirmation with remaining env list", async () => {
      mockExecuteGraphQL.mockResolvedValue(REMOVE_ENVS_FIXTURE);

      const result = await invokeTool("xray_remove_environments_from_execution", {
        issueId: "PROJ-456",
        testEnvironments: ["Chrome"],
        format: "toon",
      });

      const text = result.content[0].text;
      expect(text).toContain("OK:UPDATED");
      expect(text).toContain("PROJ-456");
    });

    it("returns JSON of updated environments when format=json", async () => {
      mockExecuteGraphQL.mockResolvedValue(REMOVE_ENVS_FIXTURE);

      const result = await invokeTool("xray_remove_environments_from_execution", {
        issueId: "PROJ-456",
        testEnvironments: ["Chrome"],
        format: "json",
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.removed).toBe("OK");
    });
  });

  // -------------------------------------------------------------------------
  // Tool registration checks
  // -------------------------------------------------------------------------
  describe("Tool registration", () => {
    it("registers all 8 execution tools in TOOL_REGISTRY", () => {
      const execTools = TOOL_REGISTRY.filter(
        (t) => t.name.includes("execution") || t.name.includes("environment"),
      );
      expect(execTools.length).toBeGreaterThanOrEqual(8);
    });

    it("xray_get_test_execution is registered with read access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_get_test_execution");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("read");
    });

    it("xray_list_test_executions is registered with read access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_list_test_executions");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("read");
    });

    it("xray_create_test_execution is registered with write access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_create_test_execution");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("write");
    });

    it("xray_delete_test_execution is registered with write access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_delete_test_execution");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("write");
    });

    it("xray_add_tests_to_execution is registered with write access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_add_tests_to_execution");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("write");
    });

    it("xray_remove_tests_from_execution is registered with write access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_remove_tests_from_execution");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("write");
    });

    it("xray_add_environments_to_execution is registered with write access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_add_environments_to_execution");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("write");
    });

    it("xray_remove_environments_from_execution is registered with write access", () => {
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_remove_environments_from_execution");
      expect(tool).toBeDefined();
      expect(tool?.accessLevel).toBe("write");
    });
  });
});
