// Credential types
export type XrayRegion = "us" | "eu" | "au" | "global";
export type CredentialMode = "strict" | "shared-reads" | "fully-shared";
export type AccessLevel = "read" | "write";

export interface CloudCredentials {
  xrayClientId: string;
  xrayClientSecret: string;
  xrayRegion: XrayRegion;
}

export interface AuthContext {
  credentials: CloudCredentials;
  source: "env" | "header";
}

// Tool types
export interface ToolContext {
  auth: AuthContext;
  format: "toon" | "json" | "summary";
}

export interface ToolDefinition {
  name: string;
  description: string;
  accessLevel: AccessLevel;
  inputSchema: import("zod").ZodObject<import("zod").ZodRawShape>;
  handler: (
    args: Record<string, unknown>,
    ctx: ToolContext,
  ) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
}

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
}

// GraphQL types
export interface GraphQLRequest {
  query: string;
  variables?: Record<string, unknown>;
}

export interface GraphQLError {
  message: string;
  path?: string[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
}

// Xray entity types (core shapes used by formatters and tools)
export interface XrayTest {
  issueId: string;
  testType?: { name?: string };
  status?: { name?: string; color?: string };
  folder?: { path?: string };
  steps?: { nodes?: XrayTestStep[] };
  preconditions?: { nodes?: Array<{ issueId: string }> };
  jira?: { key?: string; summary?: string };
}

export interface XrayTestStep {
  id?: string;
  action?: string;
  data?: string;
  result?: string;
}

export interface XrayTestExecution {
  issueId: string;
  testRuns?: { nodes?: XrayTestRun[] };
  testEnvironments?: string[];
  jira?: { key?: string; summary?: string };
}

export interface XrayTestRun {
  id?: string;
  status?: { name?: string; color?: string };
  comment?: string;
  executedById?: string;
  startedOn?: string;
  finishedOn?: string;
  steps?: XrayTestRunStep[];
}

export interface XrayTestRunStep {
  id?: string;
  status?: { name?: string };
  comment?: string;
  action?: string;
  result?: string;
}

export interface XrayTestPlan {
  issueId: string;
  tests?: { nodes?: Array<{ issueId: string }> };
  testExecutions?: { nodes?: Array<{ issueId: string }> };
  jira?: { key?: string; summary?: string };
}

export interface XrayTestSet {
  issueId: string;
  tests?: { nodes?: Array<{ issueId: string }> };
  jira?: { key?: string; summary?: string };
}

export interface XrayPrecondition {
  issueId: string;
  preconditionType?: { name?: string };
  definition?: string;
  tests?: { nodes?: Array<{ issueId: string }> };
  jira?: { key?: string; summary?: string };
}

export interface XrayFolder {
  name: string;
  path: string;
  testsCount?: number;
  folders?: XrayFolder[];
}

// Formatter types
export type FormatType = "toon" | "json" | "summary";
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
export class XrayAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XrayAuthError";
  }
}

export class XrayGqlError extends Error {
  public readonly errors: GraphQLError[];
  constructor(errors: GraphQLError[]) {
    super(errors.map((e) => e.message).join("; "));
    this.name = "XrayGqlError";
    this.errors = errors;
  }
}

export class XrayHttpError extends Error {
  public readonly statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "XrayHttpError";
    this.statusCode = statusCode;
  }
}
