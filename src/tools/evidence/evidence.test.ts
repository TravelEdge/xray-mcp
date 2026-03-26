/**
 * Unit tests for all 8 evidence and defect tools (WEVID-01..08, TEST-04).
 * Uses mocked fetch — no real HTTP calls.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import type { HttpClient } from "../../clients/HttpClient.js";
import { TOOL_REGISTRY } from "../registry.js";
import type { ToolDefinition } from "../../types/index.js";
import {
  ADD_EVIDENCE_TO_RUN_RESPONSE,
  REMOVE_EVIDENCE_FROM_RUN_RESPONSE,
  ADD_DEFECTS_TO_RUN_RESPONSE,
  REMOVE_DEFECTS_FROM_RUN_RESPONSE,
  ADD_EVIDENCE_TO_STEP_RESPONSE,
  REMOVE_EVIDENCE_FROM_STEP_RESPONSE,
  ADD_DEFECTS_TO_STEP_RESPONSE,
  REMOVE_DEFECTS_FROM_STEP_RESPONSE,
} from "./fixtures.js";

// Trigger registerTool() calls
import "./index.js";

function makeClient(): { client: XrayCloudClient; mockRequest: ReturnType<typeof vi.fn> } {
  const mockRequest = vi.fn();
  const httpClient = {
    request: mockRequest,
    _sleep: vi.fn(),
  } as unknown as HttpClient;
  const client = new XrayCloudClient(httpClient, async () => "test-token");
  return { client, mockRequest };
}

function findTool(name: string): ToolDefinition {
  const tool = TOOL_REGISTRY.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found in registry`);
  return tool;
}

function makeCtx(format: "toon" | "json" | "summary" = "toon") {
  return {
    auth: {
      credentials: {
        xrayClientId: "cid",
        xrayClientSecret: "csec",
        xrayRegion: "global" as const,
      },
      source: "env" as const,
    },
    format,
  };
}

describe("evidence tools", () => {
  let mockRequest: ReturnType<typeof vi.fn>;
  let client: XrayCloudClient;

  beforeEach(() => {
    ({ client, mockRequest } = makeClient());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // WEVID-01: xray_add_evidence_to_run
  // ---------------------------------------------------------------------------
  describe("xray_add_evidence_to_run", () => {
    it("registers with accessLevel write", () => {
      const tool = findTool("xray_add_evidence_to_run");
      expect(tool.accessLevel).toBe("write");
    });

    it("calls executeGraphQL with mediaType (not mimeType) in evidence variables", async () => {
      mockRequest.mockResolvedValueOnce(ADD_EVIDENCE_TO_RUN_RESPONSE);
      const tool = findTool("xray_add_evidence_to_run");

      await tool.handler(
        {
          _client: client,
          id: "run-001",
          content: "base64content==",
          filename: "screenshot.png",
          mimeType: "image/png",
          format: "toon",
        },
        makeCtx(),
      );

      expect(mockRequest).toHaveBeenCalledOnce();
      const callArgs = mockRequest.mock.calls[0];
      const body = callArgs[1].body as { variables: Record<string, unknown> };
      const evidence = (body.variables.evidence as Array<Record<string, unknown>>)[0];
      // Critical: must use mediaType, not mimeType (Pitfall 7)
      expect(evidence).toHaveProperty("mediaType", "image/png");
      expect(evidence).not.toHaveProperty("mimeType");
      expect(evidence).toHaveProperty("data", "base64content==");
      expect(evidence).toHaveProperty("filename", "screenshot.png");
    });

    it("returns writeConfirmation with run ID and filename", async () => {
      mockRequest.mockResolvedValueOnce(ADD_EVIDENCE_TO_RUN_RESPONSE);
      const tool = findTool("xray_add_evidence_to_run");

      const result = await tool.handler(
        {
          _client: client,
          id: "run-001",
          content: "base64content==",
          filename: "screenshot.png",
          mimeType: "image/png",
          format: "toon",
        },
        makeCtx(),
      );

      expect(result.content[0].text).toMatch(/^OK:UPDATED run-001/);
      expect(result.content[0].text).toContain("screenshot.png");
    });

    it("content parameter has max(10_000_000) size guard", () => {
      const tool = findTool("xray_add_evidence_to_run");
      const schema = tool.inputSchema;
      const shape = schema.shape as Record<string, { _def?: { checks?: Array<{ kind: string; value: number }> } }>;
      const contentField = shape.content;
      // Verify max constraint exists
      const checks = contentField._def?.checks ?? [];
      const maxCheck = checks.find((c) => c.kind === "max");
      expect(maxCheck).toBeDefined();
      expect(maxCheck?.value).toBe(10_000_000);
    });
  });

  // ---------------------------------------------------------------------------
  // WEVID-02: xray_remove_evidence_from_run
  // ---------------------------------------------------------------------------
  describe("xray_remove_evidence_from_run", () => {
    it("registers with accessLevel write", () => {
      const tool = findTool("xray_remove_evidence_from_run");
      expect(tool.accessLevel).toBe("write");
    });

    it("calls executeGraphQL with id and evidenceIds", async () => {
      mockRequest.mockResolvedValueOnce(REMOVE_EVIDENCE_FROM_RUN_RESPONSE);
      const tool = findTool("xray_remove_evidence_from_run");

      await tool.handler(
        {
          _client: client,
          id: "run-001",
          evidenceIds: ["ev-1", "ev-2"],
          format: "toon",
        },
        makeCtx(),
      );

      expect(mockRequest).toHaveBeenCalledOnce();
      const callArgs = mockRequest.mock.calls[0];
      const body = callArgs[1].body as { variables: Record<string, unknown> };
      expect(body.variables.id).toBe("run-001");
      expect(body.variables.evidenceIds).toEqual(["ev-1", "ev-2"]);
    });

    it("returns writeConfirmation with run ID", async () => {
      mockRequest.mockResolvedValueOnce(REMOVE_EVIDENCE_FROM_RUN_RESPONSE);
      const tool = findTool("xray_remove_evidence_from_run");

      const result = await tool.handler(
        {
          _client: client,
          id: "run-001",
          evidenceIds: ["ev-1"],
          format: "toon",
        },
        makeCtx(),
      );

      expect(result.content[0].text).toMatch(/^OK:UPDATED run-001/);
    });
  });

  // ---------------------------------------------------------------------------
  // WEVID-03: xray_add_defects_to_run
  // ---------------------------------------------------------------------------
  describe("xray_add_defects_to_run", () => {
    it("registers with accessLevel write", () => {
      const tool = findTool("xray_add_defects_to_run");
      expect(tool.accessLevel).toBe("write");
    });

    it("calls executeGraphQL with id and issueIds", async () => {
      mockRequest.mockResolvedValueOnce(ADD_DEFECTS_TO_RUN_RESPONSE);
      const tool = findTool("xray_add_defects_to_run");

      await tool.handler(
        {
          _client: client,
          id: "run-001",
          issueIds: ["PROJ-123", "PROJ-456"],
          format: "toon",
        },
        makeCtx(),
      );

      expect(mockRequest).toHaveBeenCalledOnce();
      const callArgs = mockRequest.mock.calls[0];
      const body = callArgs[1].body as { variables: Record<string, unknown> };
      expect(body.variables.id).toBe("run-001");
      expect(body.variables.issueIds).toEqual(["PROJ-123", "PROJ-456"]);
    });

    it("returns writeConfirmation with defect issue keys", async () => {
      mockRequest.mockResolvedValueOnce(ADD_DEFECTS_TO_RUN_RESPONSE);
      const tool = findTool("xray_add_defects_to_run");

      const result = await tool.handler(
        {
          _client: client,
          id: "run-001",
          issueIds: ["PROJ-123"],
          format: "toon",
        },
        makeCtx(),
      );

      expect(result.content[0].text).toMatch(/^OK:UPDATED run-001/);
      expect(result.content[0].text).toContain("PROJ-123");
    });
  });

  // ---------------------------------------------------------------------------
  // WEVID-04: xray_remove_defects_from_run
  // ---------------------------------------------------------------------------
  describe("xray_remove_defects_from_run", () => {
    it("registers with accessLevel write", () => {
      const tool = findTool("xray_remove_defects_from_run");
      expect(tool.accessLevel).toBe("write");
    });

    it("calls executeGraphQL with id and issueIds", async () => {
      mockRequest.mockResolvedValueOnce(REMOVE_DEFECTS_FROM_RUN_RESPONSE);
      const tool = findTool("xray_remove_defects_from_run");

      await tool.handler(
        {
          _client: client,
          id: "run-001",
          issueIds: ["PROJ-123"],
          format: "toon",
        },
        makeCtx(),
      );

      expect(mockRequest).toHaveBeenCalledOnce();
      const callArgs = mockRequest.mock.calls[0];
      const body = callArgs[1].body as { variables: Record<string, unknown> };
      expect(body.variables.issueIds).toEqual(["PROJ-123"]);
    });

    it("returns writeConfirmation with run ID", async () => {
      mockRequest.mockResolvedValueOnce(REMOVE_DEFECTS_FROM_RUN_RESPONSE);
      const tool = findTool("xray_remove_defects_from_run");

      const result = await tool.handler(
        {
          _client: client,
          id: "run-001",
          issueIds: ["PROJ-123"],
          format: "toon",
        },
        makeCtx(),
      );

      expect(result.content[0].text).toMatch(/^OK:UPDATED run-001/);
    });
  });

  // ---------------------------------------------------------------------------
  // WEVID-05: xray_add_evidence_to_step
  // ---------------------------------------------------------------------------
  describe("xray_add_evidence_to_step", () => {
    it("registers with accessLevel write", () => {
      const tool = findTool("xray_add_evidence_to_step");
      expect(tool.accessLevel).toBe("write");
    });

    it("calls executeGraphQL with mediaType (not mimeType) in evidence variables", async () => {
      mockRequest.mockResolvedValueOnce(ADD_EVIDENCE_TO_STEP_RESPONSE);
      const tool = findTool("xray_add_evidence_to_step");

      await tool.handler(
        {
          _client: client,
          runId: "run-001",
          stepId: "step-42",
          content: "base64content==",
          filename: "log.txt",
          mimeType: "text/plain",
          format: "toon",
        },
        makeCtx(),
      );

      expect(mockRequest).toHaveBeenCalledOnce();
      const callArgs = mockRequest.mock.calls[0];
      const body = callArgs[1].body as { variables: Record<string, unknown> };
      const evidence = (body.variables.evidence as Array<Record<string, unknown>>)[0];
      // Critical: must use mediaType, not mimeType (Pitfall 7)
      expect(evidence).toHaveProperty("mediaType", "text/plain");
      expect(evidence).not.toHaveProperty("mimeType");
      expect(evidence).toHaveProperty("data", "base64content==");
      expect(evidence).toHaveProperty("filename", "log.txt");
    });

    it("returns writeConfirmation with run/step IDs and filename", async () => {
      mockRequest.mockResolvedValueOnce(ADD_EVIDENCE_TO_STEP_RESPONSE);
      const tool = findTool("xray_add_evidence_to_step");

      const result = await tool.handler(
        {
          _client: client,
          runId: "run-001",
          stepId: "step-42",
          content: "base64content==",
          filename: "log.txt",
          mimeType: "text/plain",
          format: "toon",
        },
        makeCtx(),
      );

      expect(result.content[0].text).toMatch(/^OK:UPDATED run-001\/step:step-42/);
      expect(result.content[0].text).toContain("log.txt");
    });

    it("content parameter has max(10_000_000) size guard", () => {
      const tool = findTool("xray_add_evidence_to_step");
      const schema = tool.inputSchema;
      const shape = schema.shape as Record<string, { _def?: { checks?: Array<{ kind: string; value: number }> } }>;
      const contentField = shape.content;
      const checks = contentField._def?.checks ?? [];
      const maxCheck = checks.find((c) => c.kind === "max");
      expect(maxCheck).toBeDefined();
      expect(maxCheck?.value).toBe(10_000_000);
    });
  });

  // ---------------------------------------------------------------------------
  // WEVID-06: xray_remove_evidence_from_step
  // ---------------------------------------------------------------------------
  describe("xray_remove_evidence_from_step", () => {
    it("registers with accessLevel write", () => {
      const tool = findTool("xray_remove_evidence_from_step");
      expect(tool.accessLevel).toBe("write");
    });

    it("calls executeGraphQL with runId, stepId, and evidenceIds", async () => {
      mockRequest.mockResolvedValueOnce(REMOVE_EVIDENCE_FROM_STEP_RESPONSE);
      const tool = findTool("xray_remove_evidence_from_step");

      await tool.handler(
        {
          _client: client,
          runId: "run-001",
          stepId: "step-42",
          evidenceIds: ["ev-10"],
          format: "toon",
        },
        makeCtx(),
      );

      expect(mockRequest).toHaveBeenCalledOnce();
      const callArgs = mockRequest.mock.calls[0];
      const body = callArgs[1].body as { variables: Record<string, unknown> };
      expect(body.variables.runId).toBe("run-001");
      expect(body.variables.stepId).toBe("step-42");
      expect(body.variables.evidenceIds).toEqual(["ev-10"]);
    });

    it("returns writeConfirmation with run/step IDs", async () => {
      mockRequest.mockResolvedValueOnce(REMOVE_EVIDENCE_FROM_STEP_RESPONSE);
      const tool = findTool("xray_remove_evidence_from_step");

      const result = await tool.handler(
        {
          _client: client,
          runId: "run-001",
          stepId: "step-42",
          evidenceIds: ["ev-10"],
          format: "toon",
        },
        makeCtx(),
      );

      expect(result.content[0].text).toMatch(/^OK:UPDATED run-001\/step:step-42/);
    });
  });

  // ---------------------------------------------------------------------------
  // WEVID-07: xray_add_defects_to_step
  // ---------------------------------------------------------------------------
  describe("xray_add_defects_to_step", () => {
    it("registers with accessLevel write", () => {
      const tool = findTool("xray_add_defects_to_step");
      expect(tool.accessLevel).toBe("write");
    });

    it("calls executeGraphQL with runId, stepId, and issueIds", async () => {
      mockRequest.mockResolvedValueOnce(ADD_DEFECTS_TO_STEP_RESPONSE);
      const tool = findTool("xray_add_defects_to_step");

      await tool.handler(
        {
          _client: client,
          runId: "run-001",
          stepId: "step-42",
          issueIds: ["PROJ-789"],
          format: "toon",
        },
        makeCtx(),
      );

      expect(mockRequest).toHaveBeenCalledOnce();
      const callArgs = mockRequest.mock.calls[0];
      const body = callArgs[1].body as { variables: Record<string, unknown> };
      expect(body.variables.runId).toBe("run-001");
      expect(body.variables.stepId).toBe("step-42");
      expect(body.variables.issueIds).toEqual(["PROJ-789"]);
    });

    it("returns writeConfirmation with defect issue key", async () => {
      mockRequest.mockResolvedValueOnce(ADD_DEFECTS_TO_STEP_RESPONSE);
      const tool = findTool("xray_add_defects_to_step");

      const result = await tool.handler(
        {
          _client: client,
          runId: "run-001",
          stepId: "step-42",
          issueIds: ["PROJ-789"],
          format: "toon",
        },
        makeCtx(),
      );

      expect(result.content[0].text).toMatch(/^OK:UPDATED run-001\/step:step-42/);
      expect(result.content[0].text).toContain("PROJ-789");
    });
  });

  // ---------------------------------------------------------------------------
  // WEVID-08: xray_remove_defects_from_step
  // ---------------------------------------------------------------------------
  describe("xray_remove_defects_from_step", () => {
    it("registers with accessLevel write", () => {
      const tool = findTool("xray_remove_defects_from_step");
      expect(tool.accessLevel).toBe("write");
    });

    it("calls executeGraphQL with runId, stepId, and issueIds", async () => {
      mockRequest.mockResolvedValueOnce(REMOVE_DEFECTS_FROM_STEP_RESPONSE);
      const tool = findTool("xray_remove_defects_from_step");

      await tool.handler(
        {
          _client: client,
          runId: "run-001",
          stepId: "step-42",
          issueIds: ["PROJ-789"],
          format: "toon",
        },
        makeCtx(),
      );

      expect(mockRequest).toHaveBeenCalledOnce();
      const callArgs = mockRequest.mock.calls[0];
      const body = callArgs[1].body as { variables: Record<string, unknown> };
      expect(body.variables.issueIds).toEqual(["PROJ-789"]);
    });

    it("returns writeConfirmation with run/step IDs", async () => {
      mockRequest.mockResolvedValueOnce(REMOVE_DEFECTS_FROM_STEP_RESPONSE);
      const tool = findTool("xray_remove_defects_from_step");

      const result = await tool.handler(
        {
          _client: client,
          runId: "run-001",
          stepId: "step-42",
          issueIds: ["PROJ-789"],
          format: "toon",
        },
        makeCtx(),
      );

      expect(result.content[0].text).toMatch(/^OK:UPDATED run-001\/step:step-42/);
    });
  });
});
