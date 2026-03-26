// Credential types

/** Xray Cloud API regional endpoint identifier. */
export type XrayRegion = "us" | "eu" | "au" | "global";

/**
 * Credential sharing mode controlling how tool calls authenticate.
 * - `strict`: Every caller provides own credentials (default, most secure)
 * - `shared-reads`: Shared credentials for read operations; caller credentials for writes
 * - `fully-shared`: Single credential set for all operations
 */
export type CredentialMode = "strict" | "shared-reads" | "fully-shared";

/** Tool access level used by WriteGuard for credential enforcement. */
export type AccessLevel = "read" | "write";

/** Xray Cloud API credentials for JWT authentication. */
export interface CloudCredentials {
  /** Xray Cloud API client ID. */
  xrayClientId: string;
  /** Xray Cloud API client secret. */
  xrayClientSecret: string;
  /** Regional endpoint to use for API calls. */
  xrayRegion: XrayRegion;
}

/** Resolved credential context including source metadata. */
export interface AuthContext {
  /** The Xray Cloud credentials to use for this request. */
  credentials: CloudCredentials;
  /** Origin of these credentials — "env" for environment variables, "header" for HTTP headers. */
  source: "env" | "header";
}

// Tool types

/** Per-request context passed to every tool handler. */
export interface ToolContext {
  /** Resolved authentication context for this request. */
  auth: AuthContext;
  /** Output format requested by the caller (toon = compact, json = full, summary = one line). */
  format: "toon" | "json" | "summary";
}

/** Defines a single MCP tool: name, description, schema, and handler. */
export interface ToolDefinition {
  /** MCP tool name (e.g., "xray_get_test"). */
  name: string;
  /** Human-readable description shown in MCP tool discovery. */
  description: string;
  /** Access level for WriteGuard enforcement ("read" or "write"). */
  accessLevel: AccessLevel;
  /** Zod schema for input validation — used directly by McpServer.tool(). */
  inputSchema: import("zod").ZodObject<import("zod").ZodRawShape>;
  /**
   * Async handler invoked when the tool is called.
   * @param args - Validated input arguments plus injected `_client` key.
   * @param ctx - Per-request tool context (auth, format).
   */
  handler: (
    args: Record<string, unknown>,
    ctx: ToolContext,
  ) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
}

/** Standard MCP tool response shape. */
export interface ToolResult {
  /** Array of text content blocks returned to the MCP client. */
  content: Array<{ type: "text"; text: string }>;
}

// GraphQL types

/** A GraphQL request body with parameterized variables. */
export interface GraphQLRequest {
  /** The GraphQL query or mutation document string. */
  query: string;
  /** Optional parameterized variables (never use string interpolation). */
  variables?: Record<string, unknown>;
}

/** A single error object from a GraphQL response. */
export interface GraphQLError {
  /** Human-readable error message. */
  message: string;
  /** Field path where the error occurred. */
  path?: string[];
  /** Additional error metadata from the GraphQL server. */
  extensions?: Record<string, unknown>;
}

/** Typed GraphQL response envelope. */
export interface GraphQLResponse<T = unknown> {
  /** Response data (present on success and partial success). */
  data?: T;
  /** Errors array (present on partial or full failure). */
  errors?: GraphQLError[];
}

// Xray entity types (core shapes used by formatters and tools)

/** Core Xray test entity as returned by GraphQL queries. */
export interface XrayTest {
  /** Xray-internal issue ID. */
  issueId: string;
  testType?: { name?: string };
  status?: { name?: string; color?: string };
  folder?: { path?: string };
  steps?: { nodes?: XrayTestStep[] };
  preconditions?: { nodes?: Array<{ issueId: string }> };
  jira?: { key?: string; summary?: string };
}

/** A single step within an Xray manual test. */
export interface XrayTestStep {
  id?: string;
  /** Step action description. */
  action?: string;
  /** Optional test data for this step. */
  data?: string;
  /** Expected result for this step. */
  result?: string;
}

/** Xray test execution entity linking a test run to an issue. */
export interface XrayTestExecution {
  /** Xray-internal issue ID. */
  issueId: string;
  testRuns?: { nodes?: XrayTestRun[] };
  testEnvironments?: string[];
  jira?: { key?: string; summary?: string };
}

/** A single test run result within a test execution. */
export interface XrayTestRun {
  id?: string;
  status?: { name?: string; color?: string };
  comment?: string;
  executedById?: string;
  startedOn?: string;
  finishedOn?: string;
  steps?: XrayTestRunStep[];
}

/** A single step result within a test run. */
export interface XrayTestRunStep {
  id?: string;
  status?: { name?: string };
  comment?: string;
  action?: string;
  result?: string;
}

/** Xray test plan grouping tests and executions. */
export interface XrayTestPlan {
  /** Xray-internal issue ID. */
  issueId: string;
  tests?: { nodes?: Array<{ issueId: string }> };
  testExecutions?: { nodes?: Array<{ issueId: string }> };
  jira?: { key?: string; summary?: string };
}

/** Xray test set — a reusable collection of tests. */
export interface XrayTestSet {
  /** Xray-internal issue ID. */
  issueId: string;
  tests?: { nodes?: Array<{ issueId: string }> };
  jira?: { key?: string; summary?: string };
}

/** Xray precondition entity defining test prerequisites. */
export interface XrayPrecondition {
  /** Xray-internal issue ID. */
  issueId: string;
  preconditionType?: { name?: string };
  /** Precondition definition text (Gherkin Background or plain text). */
  definition?: string;
  tests?: { nodes?: Array<{ issueId: string }> };
  jira?: { key?: string; summary?: string };
}

/** Xray test repository folder. */
export interface XrayFolder {
  /** Display name of the folder. */
  name: string;
  /** Full path from the repository root (e.g., "/Backend/Auth"). */
  path: string;
  testsCount?: number;
  folders?: XrayFolder[];
}

// Formatter types

/** Output format type for tool responses. */
export type FormatType = "toon" | "json" | "summary";

/** Discriminator for entity template dispatch in formatters. */
export type EntityType =
  | "test"
  | "test_list"
  | "test_execution"
  | "test_plan"
  | "test_set"
  | "test_run"
  | "precondition"
  | "folder"
  | "coverage"
  | "dataset"
  | "import_result"
  | "statuses"
  | "settings";

// Error types

/** Thrown on 401/403 authentication failures from Xray Cloud API, or when required credentials are missing. */
export class XrayAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XrayAuthError";
  }
}

/** Thrown when GraphQL response contains errors array without usable data. */
export class XrayGqlError extends Error {
  /** The raw GraphQL error objects from the response. */
  public readonly errors: GraphQLError[];
  constructor(errors: GraphQLError[]) {
    super(errors.map((e) => e.message).join("; "));
    this.name = "XrayGqlError";
    this.errors = errors;
  }
}

/** Thrown on non-2xx HTTP responses from Xray Cloud API (excluding 401/403 auth errors). */
export class XrayHttpError extends Error {
  /** The HTTP status code that triggered this error. */
  public readonly statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "XrayHttpError";
    this.statusCode = statusCode;
  }
}
