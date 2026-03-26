/**
 * Unit tests for admin/settings/coverage tools (READ-18..READ-26, REST-04, TEST-04).
 *
 * Pattern: Mock executeGraphQL / executeRestText on a fake XrayClient,
 * import tool modules for side-effects (registerTool calls), then invoke
 * handlers directly from TOOL_REGISTRY.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { TOOL_REGISTRY } from "../registry.js";
import {
  mockGetCoverableIssueResponse,
  mockListCoverableIssuesResponse,
  mockGetDatasetResponse,
  mockListDatasetsResponse,
  mockCucumberFeatureContent,
  mockGetProjectSettingsResponse,
  mockGetStatusesResponse,
  mockGetStepStatusesResponse,
  mockGetIssueLinkTypesResponse,
} from "./fixtures.js";

// ─── Mock client ─────────────────────────────────────────────────────────────

function makeMockClient(): XrayClient {
  return {
    executeGraphQL: vi.fn(),
    executeRest: vi.fn(),
    executeRestRaw: vi.fn(),
    executeRestText: vi.fn(),
  };
}

// ─── Load tools (side-effects trigger registerTool) ──────────────────────────

// These imports register the 9 admin tools into TOOL_REGISTRY
import "./getCoverableIssue.js";
import "./listCoverableIssues.js";
import "./getDataset.js";
import "./listDatasets.js";
import "./exportCucumberFeatures.js";
import "./getProjectSettings.js";
import "./listTestStatuses.js";
import "./listStepStatuses.js";
import "./listIssueLinkTypes.js";

// ─── Helper ───────────────────────────────────────────────────────────────────

function findTool(name: string) {
  const tool = TOOL_REGISTRY.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not found in registry: ${name}`);
  return tool;
}

function makeArgs(extra: Record<string, unknown>, client: XrayClient): Record<string, unknown> {
  return { format: "toon" as const, _client: client, ...extra };
}

const ctx = { auth: { credentials: { xrayClientId: "id", xrayClientSecret: "secret", xrayRegion: "global" as const }, source: "env" as const }, format: "toon" as const };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("xray_get_coverable_issue", () => {
  let client: XrayClient;

  beforeEach(() => {
    client = makeMockClient();
  });

  it("returns coverage info in TOON format", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockGetCoverableIssueResponse);

    const tool = findTool("xray_get_coverable_issue");
    const result = await tool.handler(makeArgs({ issueId: "PROJ-100" }, client), ctx);

    expect(result.content[0].text).toContain("covered");
    expect(result.content[0].text).toContain("10100");
  });

  it("returns ERR:NOT_FOUND when getCoverableIssue is null", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce({ getCoverableIssue: null });

    const tool = findTool("xray_get_coverable_issue");
    const result = await tool.handler(makeArgs({ issueId: "PROJ-999" }, client), ctx);

    expect(result.content[0].text).toContain("ERR:NOT_FOUND");
  });

  it("returns JSON format when format=json", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockGetCoverableIssueResponse);

    const tool = findTool("xray_get_coverable_issue");
    const result = await tool.handler(
      makeArgs({ issueId: "PROJ-100", format: "json" }, client),
      { ...ctx, format: "json" },
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.issueId).toBe("10100");
  });
});

describe("xray_list_coverable_issues", () => {
  let client: XrayClient;

  beforeEach(() => {
    client = makeMockClient();
  });

  it("returns paginated list with header in TOON format", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockListCoverableIssuesResponse);

    const tool = findTool("xray_list_coverable_issues");
    const result = await tool.handler(
      makeArgs({ limit: 50, start: 0 }, client),
      ctx,
    );

    expect(result.content[0].text).toContain("Coverable Issues");
    expect(result.content[0].text).toContain("of 2");
  });

  it("supports pagination with start offset", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce({
      getCoverableIssues: { total: 100, results: [] },
    });

    const tool = findTool("xray_list_coverable_issues");
    const result = await tool.handler(
      makeArgs({ limit: 50, start: 50 }, client),
      ctx,
    );

    expect(result.content[0].text).toContain("Coverable Issues");
  });
});

describe("xray_get_dataset", () => {
  let client: XrayClient;

  beforeEach(() => {
    client = makeMockClient();
  });

  it("returns dataset with rows and parameters in TOON format", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockGetDatasetResponse);

    const tool = findTool("xray_get_dataset");
    const result = await tool.handler(makeArgs({ id: "ds-123" }, client), ctx);

    expect(result.content[0].text).toContain("Login Test Data");
    expect(result.content[0].text).toContain("rows");
  });

  it("returns ERR:NOT_FOUND when getDataset is null", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce({ getDataset: null });

    const tool = findTool("xray_get_dataset");
    const result = await tool.handler(makeArgs({ id: "bad-id" }, client), ctx);

    expect(result.content[0].text).toContain("ERR:NOT_FOUND");
  });
});

describe("xray_list_datasets", () => {
  let client: XrayClient;

  beforeEach(() => {
    client = makeMockClient();
  });

  it("returns paginated dataset list", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockListDatasetsResponse);

    const tool = findTool("xray_list_datasets");
    const result = await tool.handler(
      makeArgs({ projectId: "PROJ", limit: 50, start: 0 }, client),
      ctx,
    );

    expect(result.content[0].text).toContain("Datasets");
    expect(result.content[0].text).toContain("of 2");
  });
});

describe("xray_export_cucumber_features", () => {
  let client: XrayClient;

  beforeEach(() => {
    client = makeMockClient();
  });

  it("returns feature file content inline via executeRestText", async () => {
    vi.mocked(client.executeRestText).mockResolvedValueOnce(mockCucumberFeatureContent);

    const tool = findTool("xray_export_cucumber_features");
    const result = await tool.handler(
      makeArgs({ issueKeys: ["PROJ-1"] }, client),
      ctx,
    );

    expect(result.content[0].text).toContain("Feature: User Login");
    expect(vi.mocked(client.executeRestText)).toHaveBeenCalledWith(
      "GET",
      expect.stringContaining("/export/cucumber"),
    );
  });

  it("uses semicolon separator for multiple keys", async () => {
    vi.mocked(client.executeRestText).mockResolvedValueOnce("feature content");

    const tool = findTool("xray_export_cucumber_features");
    await tool.handler(
      makeArgs({ issueKeys: ["PROJ-1", "PROJ-2", "PROJ-3"] }, client),
      ctx,
    );

    const callArg = vi.mocked(client.executeRestText).mock.calls[0][1] as string;
    expect(callArg).toContain("PROJ-1;PROJ-2;PROJ-3");
    expect(callArg).not.toContain("PROJ-1,PROJ-2");
  });
});

describe("xray_get_project_settings", () => {
  let client: XrayClient;

  beforeEach(() => {
    client = makeMockClient();
  });

  it("returns project settings in TOON format", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockGetProjectSettingsResponse);

    const tool = findTool("xray_get_project_settings");
    const result = await tool.handler(makeArgs({ projectId: "PROJ" }, client), ctx);

    expect(result.content[0].text).toContain("PROJ");
  });

  it("returns ERR:NOT_FOUND when getProjectSettings is null", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce({ getProjectSettings: null });

    const tool = findTool("xray_get_project_settings");
    const result = await tool.handler(makeArgs({ projectId: "UNKNOWN" }, client), ctx);

    expect(result.content[0].text).toContain("ERR:NOT_FOUND");
  });
});

describe("xray_list_test_statuses", () => {
  let client: XrayClient;

  beforeEach(() => {
    client = makeMockClient();
  });

  it("returns test statuses in TOON format", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockGetStatusesResponse);

    const tool = findTool("xray_list_test_statuses");
    const result = await tool.handler(makeArgs({}, client), ctx);

    expect(result.content[0].text).toContain("PASS");
    expect(result.content[0].text).toContain("FAIL");
  });

  it("passes projectId as variable when provided", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockGetStatusesResponse);

    const tool = findTool("xray_list_test_statuses");
    await tool.handler(makeArgs({ projectId: "PROJ" }, client), ctx);

    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ projectId: "PROJ" }),
    );
  });

  it("passes undefined projectId when omitted (global statuses)", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockGetStatusesResponse);

    const tool = findTool("xray_list_test_statuses");
    await tool.handler(makeArgs({}, client), ctx);

    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ projectId: undefined }),
    );
  });
});

describe("xray_list_step_statuses", () => {
  let client: XrayClient;

  beforeEach(() => {
    client = makeMockClient();
  });

  it("returns step statuses in TOON format", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockGetStepStatusesResponse);

    const tool = findTool("xray_list_step_statuses");
    const result = await tool.handler(makeArgs({}, client), ctx);

    expect(result.content[0].text).toContain("PASS");
  });

  it("passes projectId as variable when provided", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockGetStepStatusesResponse);

    const tool = findTool("xray_list_step_statuses");
    await tool.handler(makeArgs({ projectId: "PROJ" }, client), ctx);

    expect(vi.mocked(client.executeGraphQL)).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ projectId: "PROJ" }),
    );
  });
});

describe("xray_list_issue_link_types", () => {
  let client: XrayClient;

  beforeEach(() => {
    client = makeMockClient();
  });

  it("returns issue link types as key-value pairs", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockGetIssueLinkTypesResponse);

    const tool = findTool("xray_list_issue_link_types");
    const result = await tool.handler(makeArgs({}, client), ctx);

    expect(result.content[0].text).toContain("Tests");
    expect(result.content[0].text).toContain("inward");
    expect(result.content[0].text).toContain("outward");
  });

  it("description includes Atlassian MCP disambiguation", () => {
    const tool = findTool("xray_list_issue_link_types");
    expect(tool.description).toContain("Atlassian MCP server");
  });

  it("returns JSON format when requested", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockGetIssueLinkTypesResponse);

    const tool = findTool("xray_list_issue_link_types");
    const result = await tool.handler(
      makeArgs({ format: "json" }, client),
      { ...ctx, format: "json" },
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].name).toBe("Tests");
  });
});

// ─── Registry check ──────────────────────────────────────────────────────────

describe("admin tool registry", () => {
  it("registers all 9 admin tools with read access level", () => {
    const adminToolNames = [
      "xray_get_coverable_issue",
      "xray_list_coverable_issues",
      "xray_get_dataset",
      "xray_list_datasets",
      "xray_export_cucumber_features",
      "xray_get_project_settings",
      "xray_list_test_statuses",
      "xray_list_step_statuses",
      "xray_list_issue_link_types",
    ];

    for (const name of adminToolNames) {
      const tool = TOOL_REGISTRY.find((t) => t.name === name);
      expect(tool, `${name} should be registered`).toBeDefined();
      expect(tool?.accessLevel).toBe("read");
    }
  });
});
