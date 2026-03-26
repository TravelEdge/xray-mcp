import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
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
  projectKey: z.string().describe("Jira project key, e.g. PROJ"),
  summary: z.string().describe("Test execution summary/title"),
  testIssueIds: z
    .array(z.string())
    .optional()
    .describe("Issue keys of tests to add to this execution"),
  environments: z
    .array(z.string())
    .optional()
    .describe("Test environment names, e.g. ['Chrome', 'Firefox']"),
  testPlanIssueId: z
    .string()
    .optional()
    .describe("Issue key of the test plan to link this execution to"),
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
    const { projectKey, summary, testIssueIds, environments, testPlanIssueId, format } =
      args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const testExecution: Record<string, unknown> = { projectKey, summary };
    if (testIssueIds) testExecution.testIssueIds = testIssueIds;
    if (environments) testExecution.environments = environments;
    if (testPlanIssueId) testExecution.testPlanIssueId = testPlanIssueId;

    const data = await client.executeGraphQL<CreateExecutionResponse>(CREATE_EXECUTION, {
      testExecution,
    });

    const { testExecution: exec, warnings } = data.createTestExecution;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(exec, null, 2) }],
      };
    }

    const key = exec.jira?.key ?? exec.issueId;
    const testCount = testIssueIds?.length ?? 0;
    const warnStr = warnings?.length ? ` | warn:${warnings[0]}` : "";
    const details = `s:${summary}${testCount > 0 ? ` | ${testCount} tests` : ""}${warnStr}`;
    return {
      content: [{ type: "text" as const, text: writeConfirmation("CREATED", key, details) }],
    };
  },
});
