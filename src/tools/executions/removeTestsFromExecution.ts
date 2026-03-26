import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { REMOVE_TESTS_FROM_EXECUTION } from "./queries.js";

const inputSchema = z.object({
  issueId: z.string().describe("Test execution issue key, e.g. PROJ-456"),
  testIssueIds: z
    .array(z.string())
    .min(1)
    .describe("Issue keys of tests to remove, e.g. ['PROJ-1', 'PROJ-2']"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_remove_tests_from_execution",
  description: "Remove one or more tests from a test execution.",
  accessLevel: "write",
  inputSchema,
  handler: async (args, _ctx) => {
    const { issueId, testIssueIds, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    await client.executeGraphQL<{ removeTestsFromTestExecution: string }>(
      REMOVE_TESTS_FROM_EXECUTION,
      { issueId, testIssueIds },
    );

    if (format === "json") {
      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ removed: testIssueIds.length }) },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("UPDATED", issueId, `removed:${testIssueIds.length}`),
        },
      ],
    };
  },
});
