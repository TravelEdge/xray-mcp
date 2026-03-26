import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { CREATE_EXECUTION } from "./queries.js";

interface CreateExecutionResponse {
  createTestExecution: {
    testExecution: {
      issueId: string;
      jira?: { key?: string; summary?: string };
    };
    warnings?: string[];
  };
}

const inputSchema = z.object({
  jira: z
    .record(z.unknown())
    .describe(
      'Jira fields JSON object, e.g. { "fields": { "summary": "...", "project": { "key": "PROJ" } } }',
    ),
  testIssueIds: z
    .array(z.string())
    .optional()
    .describe("Issue keys of tests to add to this execution"),
  tests: z
    .array(
      z.object({
        testIssueId: z.string().describe("Test issue key"),
        version: z.string().optional().describe("Version name"),
        revision: z.string().optional().describe("Revision identifier"),
      }),
    )
    .optional()
    .describe("Tests with version info to add to this execution"),
  testEnvironments: z
    .array(z.string())
    .optional()
    .describe("Test environment names, e.g. ['Chrome', 'Firefox']"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_create_test_execution",
  description:
    "Create a new test execution, optionally linking tests and environments. " +
    "Returns the new execution key.",
  accessLevel: "write",
  inputSchema,
  handler: async (args, _ctx) => {
    const { jira, testIssueIds, tests, testEnvironments, format } = args as z.infer<
      typeof inputSchema
    >;
    const client = args._client as XrayClient;

    const variables: Record<string, unknown> = { jira };
    if (testIssueIds) variables.testIssueIds = testIssueIds;
    if (tests) variables.tests = tests;
    if (testEnvironments) variables.testEnvironments = testEnvironments;

    const data = await client.executeGraphQL<CreateExecutionResponse>(CREATE_EXECUTION, variables);

    if (!data.createTestExecution?.testExecution) {
      return {
        content: [
          {
            type: "text" as const,
            text: "ERR:CREATE_FAILED Test execution creation returned no data",
          },
        ],
      };
    }

    const { testExecution: exec, warnings } = data.createTestExecution;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(exec, null, 2) }],
      };
    }

    const key = exec.jira?.key ?? exec.issueId;
    const summary = exec.jira?.summary ?? "";
    const testCount = testIssueIds?.length ?? 0;
    const warnStr = warnings?.length ? ` | warn:${warnings[0]}` : "";
    const details = `s:${summary}${testCount > 0 ? ` | ${testCount} tests` : ""}${warnStr}`;
    return {
      content: [{ type: "text" as const, text: writeConfirmation("CREATED", key, details) }],
    };
  },
});
