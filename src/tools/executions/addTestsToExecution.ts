import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { ADD_TESTS_TO_EXECUTION } from "./queries.js";

interface AddTestsResponse {
  addTestsToTestExecution: {
    addedTests?: string[];
    warning?: string | null;
  };
}

const inputSchema = z.object({
  issueId: z.string().describe("Test execution issue key, e.g. PROJ-456"),
  testIssueIds: z
    .array(z.string())
    .min(1)
    .describe("Issue keys of tests to add, e.g. ['PROJ-1', 'PROJ-2']"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_add_tests_to_execution",
  description: "Add one or more tests to an existing test execution.",
  accessLevel: "write",
  inputSchema,
  handler: async (args, _ctx) => {
    const { issueId, testIssueIds, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<AddTestsResponse>(ADD_TESTS_TO_EXECUTION, {
      issueId,
      testIssueIds,
    });

    const result = data.addTestsToTestExecution;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }

    const added = result.addedTests?.length ?? testIssueIds.length;
    const warnStr = result.warning ? ` | warn:${result.warning}` : "";
    const details = `added:${added}${warnStr}`;
    return {
      content: [{ type: "text" as const, text: writeConfirmation("UPDATED", issueId, details) }],
    };
  },
});
