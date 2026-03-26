import { beforeEach, describe, expect, it, vi } from "vitest";
import { TOOL_REGISTRY } from "../registry.js";
import {
  mockAddTestsResponse,
  mockCreatePreconditionResponse,
  mockDeletePreconditionResponse,
  mockGetPreconditionResponse,
  mockPreconditionList,
  mockRemoveTestsResponse,
  mockUpdatePreconditionResponse,
} from "./fixtures.js";

// Side-effect imports: trigger registerTool() at module scope (D-25)
import "./getPrecondition.js";
import "./listPreconditions.js";
import "./createPrecondition.js";
import "./updatePrecondition.js";
import "./deletePrecondition.js";
import "./addTestsToPrecondition.js";
import "./removeTestsFromPrecondition.js";

function makeMockClient() {
  return {
    executeGraphQL: vi.fn(),
    executeRest: vi.fn(),
  };
}

function findTool(name: string) {
  const tool = TOOL_REGISTRY.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found in TOOL_REGISTRY`);
  return tool;
}

describe("Precondition tools", () => {
  let mockClient: ReturnType<typeof makeMockClient>;

  beforeEach(() => {
    mockClient = makeMockClient();
  });

  // ---------------------------------------------------------------------------
  // xray_get_precondition
  // ---------------------------------------------------------------------------
  describe("xray_get_precondition", () => {
    it("calls executeGraphQL with issueId variable", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce(mockGetPreconditionResponse);
      const tool = findTool("xray_get_precondition");
      const ctx = { auth: {} as never, format: "toon" as const };
      await tool.handler({ issueId: "PC-1", format: "toon", _client: mockClient }, ctx);
      expect(mockClient.executeGraphQL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ issueId: "PC-1" }),
      );
    });

    it("returns TOON-formatted precondition response", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce(mockGetPreconditionResponse);
      const tool = findTool("xray_get_precondition");
      const ctx = { auth: {} as never, format: "toon" as const };
      const result = await tool.handler(
        { issueId: "PC-1", format: "toon", _client: mockClient },
        ctx,
      );
      expect(result.content[0].text).toContain("PC-1");
    });

    it("returns (no data) when getPrecondition is null", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce({ getPrecondition: null });
      const tool = findTool("xray_get_precondition");
      const ctx = { auth: {} as never, format: "toon" as const };
      const result = await tool.handler(
        { issueId: "PC-999", format: "toon", _client: mockClient },
        ctx,
      );
      expect(result.content[0].text).toBe("(no data)");
    });

    it("is registered with read access level", () => {
      const tool = findTool("xray_get_precondition");
      expect(tool.accessLevel).toBe("read");
    });
  });

  // ---------------------------------------------------------------------------
  // xray_list_preconditions
  // ---------------------------------------------------------------------------
  describe("xray_list_preconditions", () => {
    it("calls executeGraphQL with jql, limit, start variables", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce(mockPreconditionList);
      const tool = findTool("xray_list_preconditions");
      const ctx = { auth: {} as never, format: "toon" as const };
      await tool.handler(
        { jql: "project = PROJ", limit: 10, start: 0, format: "toon", _client: mockClient },
        ctx,
      );
      expect(mockClient.executeGraphQL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ jql: "project = PROJ", limit: 10, start: 0 }),
      );
    });

    it("returns paginated list with header", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce(mockPreconditionList);
      const tool = findTool("xray_list_preconditions");
      const ctx = { auth: {} as never, format: "toon" as const };
      const result = await tool.handler(
        { limit: 50, start: 0, format: "toon", _client: mockClient },
        ctx,
      );
      expect(result.content[0].text).toContain("Preconditions");
      expect(result.content[0].text).toContain("PC-1");
      expect(result.content[0].text).toContain("PC-2");
    });

    it("is registered with read access level", () => {
      const tool = findTool("xray_list_preconditions");
      expect(tool.accessLevel).toBe("read");
    });
  });

  // ---------------------------------------------------------------------------
  // xray_create_precondition
  // ---------------------------------------------------------------------------
  describe("xray_create_precondition", () => {
    it("calls executeGraphQL with correct variables", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce(mockCreatePreconditionResponse);
      const tool = findTool("xray_create_precondition");
      const ctx = { auth: {} as never, format: "toon" as const };
      await tool.handler(
        {
          projectKey: "PROJ",
          summary: "User logged in",
          preconditionType: "Manual",
          format: "toon",
          _client: mockClient,
        },
        ctx,
      );
      expect(mockClient.executeGraphQL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ projectKey: "PROJ", summary: "User logged in" }),
      );
    });

    it("returns OK:CREATED confirmation", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce(mockCreatePreconditionResponse);
      const tool = findTool("xray_create_precondition");
      const ctx = { auth: {} as never, format: "toon" as const };
      const result = await tool.handler(
        {
          projectKey: "PROJ",
          summary: "User logged in",
          preconditionType: "Manual",
          format: "toon",
          _client: mockClient,
        },
        ctx,
      );
      expect(result.content[0].text).toContain("OK:CREATED");
      expect(result.content[0].text).toContain("PC-3");
    });

    it("is registered with write access level", () => {
      const tool = findTool("xray_create_precondition");
      expect(tool.accessLevel).toBe("write");
    });
  });

  // ---------------------------------------------------------------------------
  // xray_update_precondition
  // ---------------------------------------------------------------------------
  describe("xray_update_precondition", () => {
    it("calls executeGraphQL with issueId and optional fields", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce(mockUpdatePreconditionResponse);
      const tool = findTool("xray_update_precondition");
      const ctx = { auth: {} as never, format: "toon" as const };
      await tool.handler(
        {
          issueId: "PC-1",
          definition: "Updated definition",
          format: "toon",
          _client: mockClient,
        },
        ctx,
      );
      expect(mockClient.executeGraphQL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ issueId: "PC-1", definition: "Updated definition" }),
      );
    });

    it("returns OK:UPDATED confirmation", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce(mockUpdatePreconditionResponse);
      const tool = findTool("xray_update_precondition");
      const ctx = { auth: {} as never, format: "toon" as const };
      const result = await tool.handler(
        {
          issueId: "PC-1",
          preconditionType: "Cucumber",
          format: "toon",
          _client: mockClient,
        },
        ctx,
      );
      expect(result.content[0].text).toContain("OK:UPDATED");
      expect(result.content[0].text).toContain("PC-1");
    });

    it("is registered with write access level", () => {
      const tool = findTool("xray_update_precondition");
      expect(tool.accessLevel).toBe("write");
    });
  });

  // ---------------------------------------------------------------------------
  // xray_delete_precondition
  // ---------------------------------------------------------------------------
  describe("xray_delete_precondition", () => {
    it("calls executeGraphQL with issueId", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce(mockDeletePreconditionResponse);
      const tool = findTool("xray_delete_precondition");
      const ctx = { auth: {} as never, format: "toon" as const };
      await tool.handler({ issueId: "PC-1", format: "toon", _client: mockClient }, ctx);
      expect(mockClient.executeGraphQL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ issueId: "PC-1" }),
      );
    });

    it("returns OK:DELETED confirmation", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce(mockDeletePreconditionResponse);
      const tool = findTool("xray_delete_precondition");
      const ctx = { auth: {} as never, format: "toon" as const };
      const result = await tool.handler({ issueId: "PC-1", format: "toon", _client: mockClient }, ctx);
      expect(result.content[0].text).toBe("OK:DELETED PC-1");
    });

    it("is registered with write access level", () => {
      const tool = findTool("xray_delete_precondition");
      expect(tool.accessLevel).toBe("write");
    });
  });

  // ---------------------------------------------------------------------------
  // xray_add_tests_to_precondition
  // ---------------------------------------------------------------------------
  describe("xray_add_tests_to_precondition", () => {
    it("calls executeGraphQL with issueId and testIssueIds", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce(mockAddTestsResponse);
      const tool = findTool("xray_add_tests_to_precondition");
      const ctx = { auth: {} as never, format: "toon" as const };
      await tool.handler(
        {
          issueId: "PC-1",
          testIssueIds: ["PROJ-10", "PROJ-11"],
          format: "toon",
          _client: mockClient,
        },
        ctx,
      );
      expect(mockClient.executeGraphQL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          issueId: "PC-1",
          testIssueIds: ["PROJ-10", "PROJ-11"],
        }),
      );
    });

    it("returns OK:UPDATED with count of added tests", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce(mockAddTestsResponse);
      const tool = findTool("xray_add_tests_to_precondition");
      const ctx = { auth: {} as never, format: "toon" as const };
      const result = await tool.handler(
        {
          issueId: "PC-1",
          testIssueIds: ["PROJ-10", "PROJ-11"],
          format: "toon",
          _client: mockClient,
        },
        ctx,
      );
      expect(result.content[0].text).toContain("OK:UPDATED");
      expect(result.content[0].text).toContain("PC-1");
      expect(result.content[0].text).toContain("added:2 tests");
    });

    it("is registered with write access level", () => {
      const tool = findTool("xray_add_tests_to_precondition");
      expect(tool.accessLevel).toBe("write");
    });
  });

  // ---------------------------------------------------------------------------
  // xray_remove_tests_from_precondition
  // ---------------------------------------------------------------------------
  describe("xray_remove_tests_from_precondition", () => {
    it("calls executeGraphQL with issueId and testIssueIds", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce(mockRemoveTestsResponse);
      const tool = findTool("xray_remove_tests_from_precondition");
      const ctx = { auth: {} as never, format: "toon" as const };
      await tool.handler(
        {
          issueId: "PC-1",
          testIssueIds: ["PROJ-10"],
          format: "toon",
          _client: mockClient,
        },
        ctx,
      );
      expect(mockClient.executeGraphQL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          issueId: "PC-1",
          testIssueIds: ["PROJ-10"],
        }),
      );
    });

    it("returns OK:UPDATED with count of removed tests", async () => {
      mockClient.executeGraphQL.mockResolvedValueOnce(mockRemoveTestsResponse);
      const tool = findTool("xray_remove_tests_from_precondition");
      const ctx = { auth: {} as never, format: "toon" as const };
      const result = await tool.handler(
        {
          issueId: "PC-1",
          testIssueIds: ["PROJ-10"],
          format: "toon",
          _client: mockClient,
        },
        ctx,
      );
      expect(result.content[0].text).toContain("OK:UPDATED");
      expect(result.content[0].text).toContain("PC-1");
      expect(result.content[0].text).toContain("removed:1 tests");
    });

    it("is registered with write access level", () => {
      const tool = findTool("xray_remove_tests_from_precondition");
      expect(tool.accessLevel).toBe("write");
    });
  });
});
