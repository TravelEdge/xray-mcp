import { beforeEach, describe, expect, it, vi } from "vitest";
import { TOOL_REGISTRY } from "../registry.js";

// Load the set tools by importing the barrel
import "./index.js";

import {
  mockGetSetResponse,
  mockGetSetNullResponse,
  mockListSetsResponse,
  mockCreateSetResponse,
  mockCreateSetNullResponse,
  mockDeleteSetResponse,
  mockAddTestsResponse,
  mockRemoveTestsResponse,
} from "./fixtures.js";

// ---------------------------------------------------------------------------
// Mock XrayClient
// ---------------------------------------------------------------------------
const mockExecuteGraphQL = vi.fn();
const mockClient = { executeGraphQL: mockExecuteGraphQL };

function findHandler(name: string) {
  const def = TOOL_REGISTRY.find((t) => t.name === name);
  if (!def) throw new Error(`Tool not found: ${name}`);
  return (args: Record<string, unknown>) =>
    def.handler({ ...args, _client: mockClient }, {} as never);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("sets tools", () => {
  beforeEach(() => {
    mockExecuteGraphQL.mockReset();
  });

  // -------------------------------------------------------------------------
  // xray_get_test_set
  // -------------------------------------------------------------------------
  it("xray_get_test_set: returns TOON-formatted test set with test count", async () => {
    mockExecuteGraphQL.mockResolvedValueOnce(mockGetSetResponse);

    const handler = findHandler("xray_get_test_set");
    const result = await handler({ issueId: "10042", format: "toon" });

    expect(result.content[0].type).toBe("text");
    const text = result.content[0].text;
    expect(text).toContain("10042");
    expect(text).toContain("3 tests");
  });

  it("xray_get_test_set: returns NOT_FOUND error when set is null", async () => {
    mockExecuteGraphQL.mockResolvedValueOnce(mockGetSetNullResponse);

    const handler = findHandler("xray_get_test_set");
    const result = await handler({ issueId: "99999", format: "toon" });

    expect(result.content[0].text).toContain("ERR:NOT_FOUND");
  });

  it("xray_get_test_set: returns JSON when format=json", async () => {
    mockExecuteGraphQL.mockResolvedValueOnce(mockGetSetResponse);

    const handler = findHandler("xray_get_test_set");
    const result = await handler({ issueId: "10042", format: "json" });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.issueId).toBe("10042");
    expect(parsed.tests.total).toBe(3);
  });

  // -------------------------------------------------------------------------
  // xray_list_test_sets
  // -------------------------------------------------------------------------
  it("xray_list_test_sets: returns paginated list with header", async () => {
    mockExecuteGraphQL.mockResolvedValueOnce(mockListSetsResponse);

    const handler = findHandler("xray_list_test_sets");
    const result = await handler({ limit: 50, start: 0, format: "toon" });

    const text = result.content[0].text;
    expect(text).toContain("Test Sets (1-2 of 2)");
    expect(text).toContain("Login flow tests");
    expect(text).toContain("Checkout flow tests");
  });

  it("xray_list_test_sets: passes jql filter to GraphQL", async () => {
    mockExecuteGraphQL.mockResolvedValueOnce(mockListSetsResponse);

    const handler = findHandler("xray_list_test_sets");
    await handler({ jql: "project = PROJ", limit: 10, start: 0, format: "toon" });

    expect(mockExecuteGraphQL).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ jql: "project = PROJ", limit: 10, start: 0 }),
    );
  });

  // -------------------------------------------------------------------------
  // xray_create_test_set
  // -------------------------------------------------------------------------
  it("xray_create_test_set: returns OK:CREATED confirmation", async () => {
    mockExecuteGraphQL.mockResolvedValueOnce(mockCreateSetResponse);

    const handler = findHandler("xray_create_test_set");
    const result = await handler({
      projectKey: "PROJ",
      summary: "New test set",
      format: "toon",
    });

    expect(result.content[0].text).toContain("OK:CREATED");
    expect(result.content[0].text).toContain("PROJ-44");
  });

  it("xray_create_test_set: returns error when creation returns null", async () => {
    mockExecuteGraphQL.mockResolvedValueOnce(mockCreateSetNullResponse);

    const handler = findHandler("xray_create_test_set");
    const result = await handler({
      projectKey: "PROJ",
      summary: "Failed set",
      format: "toon",
    });

    expect(result.content[0].text).toContain("ERR:CREATE_FAILED");
  });

  // -------------------------------------------------------------------------
  // xray_delete_test_set
  // -------------------------------------------------------------------------
  it("xray_delete_test_set: returns OK:DELETED confirmation", async () => {
    mockExecuteGraphQL.mockResolvedValueOnce(mockDeleteSetResponse);

    const handler = findHandler("xray_delete_test_set");
    const result = await handler({ issueId: "10042", format: "toon" });

    expect(result.content[0].text).toBe("OK:DELETED 10042");
  });

  // -------------------------------------------------------------------------
  // xray_add_tests_to_set
  // -------------------------------------------------------------------------
  it("xray_add_tests_to_set: returns OK:UPDATED with added count", async () => {
    mockExecuteGraphQL.mockResolvedValueOnce(mockAddTestsResponse);

    const handler = findHandler("xray_add_tests_to_set");
    const result = await handler({
      issueId: "10042",
      testIssueIds: ["10001", "10002"],
      format: "toon",
    });

    expect(result.content[0].text).toContain("OK:UPDATED");
    expect(result.content[0].text).toContain("added:2 tests");
  });

  // -------------------------------------------------------------------------
  // xray_remove_tests_from_set
  // -------------------------------------------------------------------------
  it("xray_remove_tests_from_set: returns OK:UPDATED with removed count", async () => {
    mockExecuteGraphQL.mockResolvedValueOnce(mockRemoveTestsResponse);

    const handler = findHandler("xray_remove_tests_from_set");
    const result = await handler({
      issueId: "10042",
      testIssueIds: ["10001"],
      format: "toon",
    });

    expect(result.content[0].text).toContain("OK:UPDATED");
    expect(result.content[0].text).toContain("removed:1 tests");
  });
});
