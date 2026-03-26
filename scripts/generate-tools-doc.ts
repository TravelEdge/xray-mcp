/**
 * generate-tools-doc.ts
 *
 * Auto-generates TOOLS.md from the live TOOL_REGISTRY.
 * Run via: pnpm generate:tools-doc
 * Automatically invoked as part of pnpm build (D-59).
 *
 * Output format per D-60: grouped by domain, table with name/access/description,
 * followed by parameter list per tool.
 */

// IMPORTANT: Import tools/index.js FIRST to trigger all registerTool() side effects.
import "../src/tools/index.js";

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { TOOL_REGISTRY } from "../src/tools/registry.js";
import type { ToolDefinition } from "../src/types/index.js";

// ---------------------------------------------------------------------------
// Domain mapping — prefix-inference lookup without touching any tool files.
// Order matters: more specific patterns first.
// ---------------------------------------------------------------------------
const DOMAINS: Array<{ label: string; match: (name: string) => boolean }> = [
  {
    label: "Tests",
    match: (n) =>
      /^xray_(get_test_details|get_test_expanded|get_expanded_test|list_tests|list_expanded_tests|create_test|delete_test|update_test_type|update_gherkin_definition|update_unstructured_definition|add_test_step|update_test_step|remove_test_step|remove_all_test_steps)$/.test(
        n,
      ),
  },
  {
    label: "Test Executions",
    match: (n) =>
      /^xray_(get_test_execution|list_test_executions|create_test_execution|delete_test_execution|add_tests_to_execution|remove_tests_from_execution|add_environments_to_execution|remove_environments_from_execution)$/.test(
        n,
      ),
  },
  {
    label: "Test Plans",
    match: (n) =>
      /^xray_(get_test_plan|list_test_plans|create_test_plan|delete_test_plan|add_tests_to_plan|remove_tests_from_plan|add_executions_to_plan|remove_executions_from_plan)$/.test(
        n,
      ),
  },
  {
    label: "Test Sets",
    match: (n) =>
      /^xray_(get_test_set|list_test_sets|create_test_set|delete_test_set|add_tests_to_set|remove_tests_from_set)$/.test(
        n,
      ),
  },
  {
    label: "Test Runs",
    match: (n) =>
      /^xray_(get_test_run|get_test_run_by_id|list_test_runs|list_test_runs_by_id|update_test_run|update_test_run_status|update_test_run_comment|update_test_run_step|reset_test_run|update_step_status|update_step_comment|set_test_run_timer|update_example_status|update_iteration_status)$/.test(
        n,
      ),
  },
  {
    label: "Preconditions",
    match: (n) =>
      /^xray_(get_precondition|list_preconditions|create_precondition|update_precondition|delete_precondition|add_tests_to_precondition|remove_tests_from_precondition)$/.test(
        n,
      ),
  },
  {
    label: "Folders",
    match: (n) =>
      /^xray_(get_folder|create_folder|delete_folder|rename_folder|move_folder|add_tests_to_folder|remove_tests_from_folder|add_issues_to_folder|remove_issues_from_folder)$/.test(
        n,
      ),
  },
  {
    label: "Evidence & Defects",
    match: (n) =>
      /^xray_(add_evidence_to_run|remove_evidence_from_run|add_defects_to_run|remove_defects_from_run|add_evidence_to_step|remove_evidence_from_step|add_defects_to_step|remove_defects_from_step)$/.test(
        n,
      ),
  },
  {
    label: "Imports",
    match: (n) => /^xray_import_/.test(n),
  },
  {
    label: "Admin & Settings",
    match: (n) =>
      /^xray_(get_project_settings|list_test_statuses|list_step_statuses|list_issue_link_types|get_coverable_issue|list_coverable_issues|get_dataset|list_datasets|export_cucumber_features)$/.test(
        n,
      ),
  },
];

// ---------------------------------------------------------------------------
// Parameter extraction — introspect Zod schema (D-60)
// Filter out internal/transport parameters.
// ---------------------------------------------------------------------------
const INTERNAL_KEYS = new Set(["_client", "format"]);

function extractParams(schema: z.ZodObject<z.ZodRawShape>): string[] {
  const shape = schema.shape;
  return Object.entries(shape)
    .filter(([key]) => !INTERNAL_KEYS.has(key))
    .map(([key, s]) => {
      const zodSchema = s as z.ZodTypeAny;
      const desc = zodSchema._def?.description ?? "";
      // Check optionality: ZodOptional wrapper or .optional() modifier
      const isOptional =
        zodSchema instanceof z.ZodOptional ||
        zodSchema instanceof z.ZodDefault ||
        (typeof (zodSchema as { isOptional?: () => boolean }).isOptional === "function" &&
          (zodSchema as { isOptional: () => boolean }).isOptional());
      return `\`${key}\`${isOptional ? " *(optional)*" : ""} — ${desc}`;
    });
}

// ---------------------------------------------------------------------------
// Domain assignment
// ---------------------------------------------------------------------------
function assignDomain(tool: ToolDefinition): string {
  for (const domain of DOMAINS) {
    if (domain.match(tool.name)) {
      return domain.label;
    }
  }
  return "Other";
}

// ---------------------------------------------------------------------------
// Markdown generation
// ---------------------------------------------------------------------------
function generateMarkdown(): string {
  const domainMap = new Map<string, ToolDefinition[]>();

  // Initialize domain order
  for (const domain of DOMAINS) {
    domainMap.set(domain.label, []);
  }
  domainMap.set("Other", []);

  // Assign tools to domains
  const unmatched: string[] = [];
  for (const tool of TOOL_REGISTRY) {
    const label = assignDomain(tool);
    if (label === "Other") {
      unmatched.push(tool.name);
    }
    const list = domainMap.get(label) ?? [];
    list.push(tool);
    domainMap.set(label, list);
  }

  // Warn about unmatched tools
  if (unmatched.length > 0) {
    process.stderr.write(
      `WARNING: ${unmatched.length} tool(s) not assigned to any domain:\n${unmatched.join("\n")}\n`,
    );
  }

  const lines: string[] = [];

  lines.push("# Xray MCP Tools Reference");
  lines.push("");
  lines.push("> Auto-generated from tool registry. Do not edit manually.");
  lines.push("> Regenerate with `pnpm generate:tools-doc`.");
  lines.push("");

  const totalTools = TOOL_REGISTRY.length;
  lines.push(`**Total tools: ${totalTools}**`);
  lines.push("");

  // Table of contents
  lines.push("## Contents");
  lines.push("");
  for (const domain of DOMAINS) {
    const tools = domainMap.get(domain.label) ?? [];
    if (tools.length > 0) {
      const anchor = domain.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      lines.push(`- [${domain.label}](#${anchor}) (${tools.length} tools)`);
    }
  }
  const otherTools = domainMap.get("Other") ?? [];
  if (otherTools.length > 0) {
    lines.push(`- [Other](#other) (${otherTools.length} tools)`);
  }
  lines.push("");

  // Domain sections
  for (const domain of DOMAINS) {
    const tools = domainMap.get(domain.label) ?? [];
    if (tools.length === 0) continue;

    lines.push(`## ${domain.label}`);
    lines.push("");

    // Table header
    lines.push("| Tool | Access | Description |");
    lines.push("|------|--------|-------------|");

    for (const tool of tools) {
      // Escape pipe characters in description for Markdown tables
      const desc = tool.description.replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push(`| \`${tool.name}\` | ${tool.accessLevel} | ${desc} |`);
    }

    lines.push("");

    // Parameter details per tool
    for (const tool of tools) {
      const params = extractParams(tool.inputSchema);
      if (params.length === 0) continue;

      lines.push(`### \`${tool.name}\``);
      lines.push("");
      lines.push("**Parameters:**");
      lines.push("");
      for (const param of params) {
        lines.push(`- ${param}`);
      }
      lines.push("");
    }
  }

  // Other domain (if any unmatched tools)
  if (otherTools.length > 0) {
    lines.push("## Other");
    lines.push("");
    lines.push("| Tool | Access | Description |");
    lines.push("|------|--------|-------------|");
    for (const tool of otherTools) {
      const desc = tool.description.replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push(`| \`${tool.name}\` | ${tool.accessLevel} | ${desc} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Write TOOLS.md to project root
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputPath = resolve(__dirname, "..", "TOOLS.md");

const content = generateMarkdown();
writeFileSync(outputPath, content, "utf-8");

const toolCount = TOOL_REGISTRY.length;
process.stdout.write(`Generated TOOLS.md with ${toolCount} tools.\n`);
