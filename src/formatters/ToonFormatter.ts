import type { EntityType } from "../types/index.js";
import type { Formatter } from "./FormatterInterface.js";

// ---------------------------------------------------------------------------
// Status icon map — exact matches first, fuzzy below
// ---------------------------------------------------------------------------
const STATUS_ICONS: Record<string, string> = {
  PASS: "&#10004;",
  PASSED: "&#10004;",
  FAIL: "&#10008;",
  FAILED: "&#10008;",
  TODO: "&#9675;",
  EXECUTING: "&#9679;",
  ABORTED: "&#8709;",
};

/**
 * Return a Unicode status icon for a given Xray status name.
 * Falls back to `?` for completely unknown custom statuses (TOON-04).
 */
export function statusIcon(name: string): string {
  if (!name) return "?";
  const upper = name.toUpperCase();
  if (STATUS_ICONS[upper]) return STATUS_ICONS[upper];
  // Fuzzy substring matching for custom status names
  if (upper.includes("PASS")) return "&#10004;";
  if (upper.includes("FAIL")) return "&#10008;";
  if (upper.includes("TODO") || upper.includes("NOT_RUN")) return "&#9675;";
  if (upper.includes("EXECUT")) return "&#9679;";
  if (upper.includes("ABORT") || upper.includes("CANCEL")) return "&#8709;";
  return "?"; // D-04: explicit fallback, never silent empty
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function truncate(s: string | undefined | null, max = 50): string {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max - 3)}...` : s;
}

function safe(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

// ---------------------------------------------------------------------------
// Entity template functions
// Each returns a multi-line string (format will trim to first line in summary mode)
// ---------------------------------------------------------------------------

type AnyRecord = Record<string, unknown>;

function formatTest(data: AnyRecord): string {
  const issueId = safe(data.issueId);
  const jira = data.jira as AnyRecord | undefined;
  const summary = truncate(safe(jira?.summary));
  const testType = (data.testType as AnyRecord | undefined)?.name;
  const status = (data.status as AnyRecord | undefined)?.name;
  const folder = (data.folder as AnyRecord | undefined)?.path;
  const steps = (data.steps as AnyRecord | undefined)?.nodes;
  const stepCount = Array.isArray(steps) ? steps.length : 0;

  const icon = statusIcon(safe(status));
  const parts: string[] = [`[${issueId}]`, icon];
  if (testType) parts.push(`t:${testType}`);
  if (summary) parts.push(`s:${summary}`);
  if (folder) parts.push(`p:${folder}`);
  if (stepCount > 0) parts.push(`| ${stepCount} steps`);
  return parts.join(" ");
}

function formatTestList(data: AnyRecord[]): string {
  const lines = [`Tests (${data.length}):`];
  for (const item of data) {
    lines.push(formatTest(item as AnyRecord));
  }
  return lines.join("\n");
}

function formatTestExecution(data: AnyRecord): string {
  const issueId = safe(data.issueId);
  const jira = data.jira as AnyRecord | undefined;
  const summary = truncate(safe(jira?.summary));
  const runs = (data.testRuns as AnyRecord | undefined)?.nodes;
  const runCount = Array.isArray(runs) ? runs.length : 0;
  const envs = data.testEnvironments;
  const envStr = Array.isArray(envs) && envs.length ? `env:${envs.join(",")}` : "";

  const parts: string[] = [`[${issueId}]`];
  if (summary) parts.push(`s:${summary}`);
  const tail = [`${runCount} runs`, envStr].filter(Boolean).join(", ");
  if (tail) parts.push(`| ${tail}`);
  return parts.join(" ");
}

function formatTestPlan(data: AnyRecord): string {
  const issueId = safe(data.issueId);
  const jira = data.jira as AnyRecord | undefined;
  const summary = truncate(safe(jira?.summary));
  const tests = (data.tests as AnyRecord | undefined)?.nodes;
  const execs = (data.testExecutions as AnyRecord | undefined)?.nodes;
  const testCount = Array.isArray(tests) ? tests.length : 0;
  const execCount = Array.isArray(execs) ? execs.length : 0;

  const parts: string[] = [`[${issueId}]`];
  if (summary) parts.push(`s:${summary}`);
  parts.push(`| ${testCount} tests, ${execCount} executions`);
  return parts.join(" ");
}

function formatTestSet(data: AnyRecord): string {
  const issueId = safe(data.issueId);
  const jira = data.jira as AnyRecord | undefined;
  const summary = truncate(safe(jira?.summary));
  const tests = (data.tests as AnyRecord | undefined)?.nodes;
  const testCount = Array.isArray(tests) ? tests.length : 0;

  const parts: string[] = [`[${issueId}]`];
  if (summary) parts.push(`s:${summary}`);
  parts.push(`| ${testCount} tests`);
  return parts.join(" ");
}

function formatTestRun(data: AnyRecord): string {
  const id = safe(data.id) || "?";
  const status = (data.status as AnyRecord | undefined)?.name;
  const comment = truncate(safe(data.comment as string | undefined));
  const icon = statusIcon(safe(status));

  const parts: string[] = [`[${id}]`, `st:${icon}`];
  if (comment) parts.push(`| comment: ${comment}`);
  return parts.join(" ");
}

function formatPrecondition(data: AnyRecord): string {
  const issueId = safe(data.issueId);
  const jira = data.jira as AnyRecord | undefined;
  const summary = truncate(safe(jira?.summary));
  const typeName = (data.preconditionType as AnyRecord | undefined)?.name;
  const definition = safe(data.definition as string | undefined);
  const defFirst = definition.split("\n")[0] ?? definition;

  const parts: string[] = [`[${issueId}]`];
  if (typeName) parts.push(`t:${typeName}`);
  if (summary) parts.push(`s:${summary}`);
  if (defFirst) parts.push(`| ${defFirst}`);
  return parts.join(" ");
}

function formatFolder(data: AnyRecord): string {
  const path = safe(data.path);
  const testCount = data.testsCount !== undefined ? Number(data.testsCount) : 0;
  const subfolders = data.folders;
  const subCount = Array.isArray(subfolders) ? subfolders.length : 0;

  const parts: string[] = [path ? `[${path}]` : "[/]"];
  parts.push(`| ${testCount} tests, ${subCount} subfolders`);
  return parts.join(" ");
}

function formatCoverage(data: AnyRecord): string {
  const issueId = safe(data.issueId);
  const jira = data.jira as AnyRecord | undefined;
  const summary = truncate(safe(jira?.summary));
  const covered = data.covered !== undefined ? (data.covered ? "yes" : "no") : "?";

  const parts: string[] = [`[${issueId}]`];
  if (summary) parts.push(`s:${summary}`);
  parts.push(`| covered:${covered}`);
  return parts.join(" ");
}

function formatDataset(data: AnyRecord): string {
  const name = safe(data.name);
  const rows = data.rows !== undefined ? Number(data.rows) : 0;
  const params = data.parameters;
  const paramCount = Array.isArray(params) ? params.length : 0;

  const parts: string[] = [name ? `[${name}]` : "[dataset]"];
  parts.push(`| ${rows} rows, ${paramCount} params`);
  return parts.join(" ");
}

function formatImportResult(data: AnyRecord): string {
  // testResults may be a count or an array
  const count =
    typeof data.testResults === "number"
      ? data.testResults
      : Array.isArray(data.testResults)
        ? (data.testResults as unknown[]).length
        : 0;
  return `Import: ${count} tests processed`;
}

function formatStatuses(data: AnyRecord[]): string {
  return data
    .map((s) => {
      const name = safe(s.name);
      const color = safe(s.color);
      const icon = statusIcon(name);
      return color ? `${icon} ${name} (${color})` : `${icon} ${name}`;
    })
    .join("\n");
}

function formatSettings(data: AnyRecord): string {
  return Object.entries(data)
    .map(([k, v]) => `${k}: ${safe(v)}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Template dispatch map
// ---------------------------------------------------------------------------
type TemplateHandler = (data: unknown) => string;

const TEMPLATES: Partial<Record<EntityType, TemplateHandler>> = {
  test: (d) => formatTest(d as AnyRecord),
  test_list: (d) => formatTestList(d as AnyRecord[]),
  test_execution: (d) => formatTestExecution(d as AnyRecord),
  test_plan: (d) => formatTestPlan(d as AnyRecord),
  test_set: (d) => formatTestSet(d as AnyRecord),
  test_run: (d) => formatTestRun(d as AnyRecord),
  precondition: (d) => formatPrecondition(d as AnyRecord),
  folder: (d) => formatFolder(d as AnyRecord),
  coverage: (d) => formatCoverage(d as AnyRecord),
  dataset: (d) => formatDataset(d as AnyRecord),
  import_result: (d) => formatImportResult(d as AnyRecord),
  statuses: (d) => formatStatuses(d as AnyRecord[]),
  settings: (d) => formatSettings(d as AnyRecord),
};

// ---------------------------------------------------------------------------
// ToonFormatter class
// ---------------------------------------------------------------------------

/**
 * Token-Optimized Object Notation (TOON) formatter.
 * Produces compact single-line output with abbreviated keys and pipe separators.
 * Pass format="summary" to get only the first line of multi-line output.
 */
export class ToonFormatter implements Formatter {
  private readonly summaryMode: boolean;

  constructor(format?: "toon" | "json" | "summary") {
    this.summaryMode = format === "summary";
  }

  format(entityType: EntityType, data: unknown): string {
    if (data === null || data === undefined) return "(no data)";

    const handler = TEMPLATES[entityType];
    if (!handler) {
      // Generic fallback for unexpected entity types
      return JSON.stringify(data);
    }

    const output = handler(data);
    if (this.summaryMode) {
      return output.split("\n")[0] ?? output;
    }
    return output;
  }

  /**
   * Format an error in TOON notation: ERR:<code> <message>
   * Optionally append hint on a second line: -> <hint>
   */
  formatError(code: string, message: string, hint?: string): string {
    const base = `ERR:${code} ${message}`;
    if (hint) return `${base}\n-> ${hint}`;
    return base;
  }
}
