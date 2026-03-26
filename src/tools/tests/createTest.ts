import { z } from "zod";
import { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { CREATE_TEST } from "./queries.js";

registerTool({
  name: "xray_create_test",
  description:
    "Create a new Xray test (Manual, Cucumber, or Generic). " +
    "Returns a confirmation with the new test issue ID.",
  accessLevel: "write",
  inputSchema: z.object({
    projectKey: z.string().describe("Jira project key (e.g. PROJ)"),
    summary: z.string().describe("Test summary / title"),
    testType: z
      .enum(["Manual", "Cucumber", "Generic"])
      .default("Manual")
      .describe("Test type (default: Manual)"),
    folder: z.string().optional().describe("Folder path to place the test in (e.g. /Regression)"),
    steps: z
      .array(
        z.object({
          action: z.string(),
          data: z.string().optional(),
          result: z.string().optional(),
        }),
      )
      .optional()
      .describe("Initial steps for Manual tests"),
    gherkin: z
      .string()
      .optional()
      .describe("Full Gherkin scenario text (for Cucumber tests)"),
    preconditionIssueIds: z
      .array(z.string())
      .optional()
      .describe("Precondition issue IDs to associate with this test"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const { projectKey, summary, testType, folder, steps, gherkin, preconditionIssueIds } =
      args as {
        projectKey: string;
        summary: string;
        testType: string;
        folder?: string;
        steps?: Array<{ action: string; data?: string; result?: string }>;
        gherkin?: string;
        preconditionIssueIds?: string[];
      };

    const client = args._client as XrayCloudClient;
    const data = await client.executeGraphQL<{
      createTest: { test: { issueId: string; jira: { key: string } }; warnings: string[] };
    }>(CREATE_TEST, {
      projectKey,
      summary,
      testType,
      folder,
      steps,
      gherkin,
      preconditionIssueIds,
    });

    const key = data.createTest.test.jira.key;
    const text = writeConfirmation("CREATED", key, `t:${testType} | ${summary}`);

    return { content: [{ type: "text" as const, text }] };
  },
});
