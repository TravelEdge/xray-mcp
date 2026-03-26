import { describe, expect, it } from "vitest";
import { TOOL_ACCESS_MAP, TOOL_REGISTRY } from "./registry.js";

// Import all tools to populate registry
import "./index.js";

describe("Tool Registry Validation", () => {
  // NOTE: Tool count reconciliation (review concern):
  // CONTEXT.md says "83 tools" but actual implementation across plans 02-02..02-11 yields 90.
  // The discrepancy is because CONTEXT.md used the original REQUIREMENTS.md count, while
  // implementation discovered additional tools (e.g., separate get/list expanded, separate
  // step-level operations). This test asserts the actual count.
  const EXPECTED_READ_TOOLS = 26;
  const EXPECTED_WRITE_TOOLS = 64;
  const EXPECTED_TOTAL = EXPECTED_READ_TOOLS + EXPECTED_WRITE_TOOLS; // 90

  it("should have expected total tools registered", () => {
    expect(TOOL_REGISTRY.length).toBe(EXPECTED_TOTAL);
  });

  it("all tool names start with xray_ prefix (QUAL-01)", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.name).toMatch(/^xray_/);
    }
  });

  it("no duplicate tool names", () => {
    const names = TOOL_REGISTRY.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("all tools have non-empty descriptions (QUAL-02)", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it("all tools have Zod input schemas with shape property (QUAL-02)", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.shape).toBeDefined();
    }
  });

  it("all tools have format parameter in schema (QUAL-02)", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.inputSchema.shape).toHaveProperty("format");
    }
  });

  it("all tools have valid accessLevel (QUAL-04)", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(["read", "write"]).toContain(tool.accessLevel);
    }
  });

  it("TOOL_ACCESS_MAP matches TOOL_REGISTRY", () => {
    expect(TOOL_ACCESS_MAP.size).toBe(TOOL_REGISTRY.length);
    for (const tool of TOOL_REGISTRY) {
      expect(TOOL_ACCESS_MAP.get(tool.name)).toBe(tool.accessLevel);
    }
  });

  it("tools referencing Atlassian MCP in descriptions where relevant (QUAL-03)", () => {
    // Spot-check across 4 different domains per QUAL-03
    const testDetailsTool = TOOL_REGISTRY.find((t) => t.name === "xray_get_test_details");
    expect(testDetailsTool?.description).toContain("Atlassian MCP");

    const execTool = TOOL_REGISTRY.find((t) => t.name === "xray_get_test_execution");
    expect(execTool?.description).toContain("Atlassian MCP");

    const coverageTool = TOOL_REGISTRY.find((t) => t.name === "xray_get_coverable_issue");
    expect(coverageTool?.description).toContain("Atlassian MCP");

    const linkTypesTool = TOOL_REGISTRY.find((t) => t.name === "xray_list_issue_link_types");
    expect(linkTypesTool?.description).toContain("Atlassian MCP");
  });

  it("has expected tool count breakdown", () => {
    const reads = TOOL_REGISTRY.filter((t) => t.accessLevel === "read");
    const writes = TOOL_REGISTRY.filter((t) => t.accessLevel === "write");
    expect(reads.length).toBe(EXPECTED_READ_TOOLS);
    expect(writes.length).toBe(EXPECTED_WRITE_TOOLS);
  });

  it("all tools have handler functions", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(typeof tool.handler).toBe("function");
    }
  });
});
