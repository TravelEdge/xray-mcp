import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { REMOVE_TESTS_FROM_PLAN } from "./queries.js";

interface RemoveTestsResponse {
  removeTestsFromTestPlan: {
    removedTests: string[];
    warning?: string;
  };
}

const inputSchema = z.object({
  issueId: z.string().describe("Jira issue ID of the test plan"),
  testIssueIds: z
    .array(z.string())
    .min(1)
    .describe("List of test issue IDs to remove from the plan"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_remove_tests_from_plan",
  description: "Remove one or more tests from an existing Xray test plan.",
  accessLevel: "write",
  inputSchema,
  handler: async (args, _ctx) => {
    const { issueId, testIssueIds, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<RemoveTestsResponse>(REMOVE_TESTS_FROM_PLAN, {
      issueId,
      testIssueIds,
    });

    const result = data.removeTestsFromTestPlan;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }

    const removed = result.removedTests.length;
    const details = `removed ${removed} test(s)${result.warning ? ` | warn:${result.warning}` : ""}`;
    const text = writeConfirmation("UPDATED", issueId, details);
    return { content: [{ type: "text" as const, text }] };
  },
});
