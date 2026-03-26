import { beforeEach, describe, expect, it, vi } from "vitest";
import type { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { TOOL_REGISTRY } from "../registry.js";

// Import side-effect to register all folder tools
import "./index.js";

import {
  mockGetFolderResponse,
  mockCreateFolderResponse,
  mockRenameFolderResponse,
  mockMoveFolderResponse,
  mockAddTestsToFolderResponse,
  mockAddIssuesToFolderResponse,
} from "./fixtures.js";

// ---------------------------------------------------------------------------
// Shared mock client
// ---------------------------------------------------------------------------

function makeMockClient(): XrayCloudClient {
  return {
    executeGraphQL: vi.fn(),
    executeRest: vi.fn(),
    executeRestRaw: vi.fn(),
    executeRestText: vi.fn(),
  } as unknown as XrayCloudClient;
}

/** Find a registered tool handler by name and return it. */
function getHandler(name: string) {
  const tool = TOOL_REGISTRY.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found in TOOL_REGISTRY`);
  return tool.handler;
}

const toonCtx = { auth: {} as never, format: "toon" as const };
const jsonCtx = { auth: {} as never, format: "json" as const };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("folder tools", () => {
  let client: XrayCloudClient;

  beforeEach(() => {
    client = makeMockClient();
    vi.clearAllMocks();
  });

  // ── xray_get_folder ──────────────────────────────────────────────────────

  it("xray_get_folder returns TOON-formatted folder", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockGetFolderResponse);
    const handler = getHandler("xray_get_folder");
    const result = await handler(
      { _client: client, projectId: "10000", path: "/Regression/Login" },
      toonCtx,
    );
    expect(result.content[0].text).toContain("/Regression/Login");
    expect(result.content[0].text).toContain("5 tests");
    expect(result.content[0].text).toContain("2 subfolders");
  });

  it("xray_get_folder returns JSON when format=json", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockGetFolderResponse);
    const handler = getHandler("xray_get_folder");
    const result = await handler(
      { _client: client, projectId: "10000", path: "/Regression/Login" },
      jsonCtx,
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe("Login");
    expect(parsed.path).toBe("/Regression/Login");
  });

  it("xray_get_folder returns ERR:NOT_FOUND when folder is null", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce({ getFolder: null });
    const handler = getHandler("xray_get_folder");
    const result = await handler(
      { _client: client, projectId: "10000", path: "/Unknown" },
      toonCtx,
    );
    expect(result.content[0].text).toContain("ERR:NOT_FOUND");
  });

  // ── xray_create_folder ───────────────────────────────────────────────────

  it("xray_create_folder returns OK:CREATED confirmation", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockCreateFolderResponse);
    const handler = getHandler("xray_create_folder");
    const result = await handler(
      { _client: client, projectId: "10000", path: "/Regression", name: "Login" },
      toonCtx,
    );
    expect(result.content[0].text).toContain("OK:CREATED");
    expect(result.content[0].text).toContain("/Regression/Login");
  });

  it("xray_create_folder returns ERR when folder is null", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce({ createFolder: { folder: null } });
    const handler = getHandler("xray_create_folder");
    const result = await handler(
      { _client: client, projectId: "10000", path: "/Regression", name: "Login" },
      toonCtx,
    );
    expect(result.content[0].text).toContain("ERR:CREATE_FAILED");
  });

  // ── xray_delete_folder ───────────────────────────────────────────────────

  it("xray_delete_folder returns OK:DELETED confirmation", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce({ deleteFolder: true });
    const handler = getHandler("xray_delete_folder");
    const result = await handler(
      { _client: client, projectId: "10000", path: "/Regression/Login" },
      toonCtx,
    );
    expect(result.content[0].text).toContain("OK:DELETED");
  });

  it("xray_delete_folder description contains warning", () => {
    const tool = TOOL_REGISTRY.find((t) => t.name === "xray_delete_folder");
    expect(tool).toBeDefined();
    expect(tool!.description).toContain("WARNING");
  });

  // ── xray_rename_folder ───────────────────────────────────────────────────

  it("xray_rename_folder returns OK:UPDATED confirmation", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockRenameFolderResponse);
    const handler = getHandler("xray_rename_folder");
    const result = await handler(
      { _client: client, projectId: "10000", path: "/Regression/Login", newName: "Auth" },
      toonCtx,
    );
    expect(result.content[0].text).toContain("OK:UPDATED");
    expect(result.content[0].text).toContain("/Regression/Auth");
  });

  it("xray_rename_folder returns ERR when folder is null", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce({ renameFolder: { folder: null } });
    const handler = getHandler("xray_rename_folder");
    const result = await handler(
      { _client: client, projectId: "10000", path: "/Regression/Login", newName: "Auth" },
      toonCtx,
    );
    expect(result.content[0].text).toContain("ERR:RENAME_FAILED");
  });

  // ── xray_move_folder ─────────────────────────────────────────────────────

  it("xray_move_folder returns OK:UPDATED confirmation", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockMoveFolderResponse);
    const handler = getHandler("xray_move_folder");
    const result = await handler(
      {
        _client: client,
        projectId: "10000",
        path: "/Regression/Login",
        destinationPath: "/Smoke",
      },
      toonCtx,
    );
    expect(result.content[0].text).toContain("OK:UPDATED");
    expect(result.content[0].text).toContain("/Smoke/Login");
  });

  it("xray_move_folder returns ERR when folder is null", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce({ moveFolder: { folder: null } });
    const handler = getHandler("xray_move_folder");
    const result = await handler(
      {
        _client: client,
        projectId: "10000",
        path: "/Regression/Login",
        destinationPath: "/Smoke",
      },
      toonCtx,
    );
    expect(result.content[0].text).toContain("ERR:MOVE_FAILED");
  });

  // ── xray_add_tests_to_folder ─────────────────────────────────────────────

  it("xray_add_tests_to_folder returns OK:UPDATED confirmation with count", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockAddTestsToFolderResponse);
    const handler = getHandler("xray_add_tests_to_folder");
    const result = await handler(
      {
        _client: client,
        projectId: "10000",
        path: "/Regression/Login",
        testIssueIds: ["10001", "10002"],
      },
      toonCtx,
    );
    expect(result.content[0].text).toContain("OK:UPDATED");
    expect(result.content[0].text).toContain("added 2 tests");
  });

  // ── xray_remove_tests_from_folder ────────────────────────────────────────

  it("xray_remove_tests_from_folder returns OK:UPDATED confirmation with count", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce({ removeTestsFromFolder: true });
    const handler = getHandler("xray_remove_tests_from_folder");
    const result = await handler(
      {
        _client: client,
        projectId: "10000",
        path: "/Regression/Login",
        testIssueIds: ["10001"],
      },
      toonCtx,
    );
    expect(result.content[0].text).toContain("OK:UPDATED");
    expect(result.content[0].text).toContain("removed 1 tests");
  });

  // ── xray_add_issues_to_folder ────────────────────────────────────────────

  it("xray_add_issues_to_folder returns OK:UPDATED confirmation with count", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce(mockAddIssuesToFolderResponse);
    const handler = getHandler("xray_add_issues_to_folder");
    const result = await handler(
      {
        _client: client,
        projectId: "10000",
        path: "/Regression/Login",
        issueIds: ["20001", "20002", "20003"],
      },
      toonCtx,
    );
    expect(result.content[0].text).toContain("OK:UPDATED");
    expect(result.content[0].text).toContain("added 3 issues");
  });

  // ── xray_remove_issues_from_folder ───────────────────────────────────────

  it("xray_remove_issues_from_folder returns OK:UPDATED confirmation with count", async () => {
    vi.mocked(client.executeGraphQL).mockResolvedValueOnce({ removeIssuesFromFolder: true });
    const handler = getHandler("xray_remove_issues_from_folder");
    const result = await handler(
      {
        _client: client,
        projectId: "10000",
        path: "/Regression/Login",
        issueIds: ["20001"],
      },
      toonCtx,
    );
    expect(result.content[0].text).toContain("OK:UPDATED");
    expect(result.content[0].text).toContain("removed 1 issues");
  });

  // ── Registry checks ──────────────────────────────────────────────────────

  it("all 9 folder tools are registered with xray_ prefix", () => {
    const folderTools = TOOL_REGISTRY.filter(
      (t) =>
        t.name === "xray_get_folder" ||
        t.name === "xray_create_folder" ||
        t.name === "xray_delete_folder" ||
        t.name === "xray_rename_folder" ||
        t.name === "xray_move_folder" ||
        t.name === "xray_add_tests_to_folder" ||
        t.name === "xray_remove_tests_from_folder" ||
        t.name === "xray_add_issues_to_folder" ||
        t.name === "xray_remove_issues_from_folder",
    );
    expect(folderTools).toHaveLength(9);
  });

  it("xray_get_folder has read access level", () => {
    const tool = TOOL_REGISTRY.find((t) => t.name === "xray_get_folder");
    expect(tool?.accessLevel).toBe("read");
  });

  it("write folder tools have write access level", () => {
    const writeTools = [
      "xray_create_folder",
      "xray_delete_folder",
      "xray_rename_folder",
      "xray_move_folder",
      "xray_add_tests_to_folder",
      "xray_remove_tests_from_folder",
      "xray_add_issues_to_folder",
      "xray_remove_issues_from_folder",
    ];
    for (const name of writeTools) {
      const tool = TOOL_REGISTRY.find((t) => t.name === name);
      expect(tool?.accessLevel, `${name} should be write`).toBe("write");
    }
  });
});
