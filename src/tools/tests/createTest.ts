import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { CREATE_TEST } from "./queries.js";

registerTool({
  name: "xray_create_test",
  description:
    "Create a new Xray test (Manual, Cucumber, or Generic). " +
    "Returns a confirmation with the new test issue ID.",
  accessLevel: "write",
  inputSchema: z.object({
    jira: z
      .record(z.unknown())
      .describe(
        'Jira issue fields as JSON (e.g. { "fields": { "project": { "key": "PROJ" }, "summary": "Test name" } })',
      ),
    testType: z
      .object({ name: z.enum(["Manual", "Cucumber", "Generic"]) })
      .optional()
      .describe('Test type (e.g. { "name": "Manual" })'),
    folderPath: z
      .string()
      .optional()
      .describe("Folder path to place the test in (e.g. /Regression)"),
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
    gherkin: z.string().optional().describe("Full Gherkin scenario text (for Cucumber tests)"),
    preconditionIssueIds: z
      .array(z.string())
      .optional()
      .describe("Precondition issue IDs to associate with this test"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const { jira, testType, folderPath, steps, gherkin, preconditionIssueIds } = args as {
      jira: Record<string, unknown>;
      testType?: { name: string };
      folderPath?: string;
      steps?: Array<{ action: string; data?: string; result?: string }>;
      gherkin?: string;
      preconditionIssueIds?: string[];
    };

    const client = args._client as XrayClient;
    const data = await client.executeGraphQL<{
      createTest: { test: { issueId: string; jira: { key: string } }; warnings: string[] };
    }>(CREATE_TEST, {
      jira,
      testType,
      folderPath,
      steps,
      gherkin,
      preconditionIssueIds,
    });

    const created = data.createTest?.test;
    if (!created) {
      return {
        content: [
          { type: "text" as const, text: "ERR:CREATE_FAILED Test creation returned no data" },
        ],
      };
    }

    const key = created.jira?.key ?? created.issueId;
    const typeName = testType?.name ?? "Manual";
    const summary = (jira as Record<string, Record<string, unknown>>)?.fields?.summary ?? "";
    const text = writeConfirmation("CREATED", key, `t:${typeName} | ${summary}`);

    return { content: [{ type: "text" as const, text }] };
  },
});
