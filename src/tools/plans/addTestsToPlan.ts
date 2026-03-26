import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { ADD_TESTS_TO_PLAN } from "./queries.js";

interface AddTestsResponse {
  addTestsToTestPlan: {
    addedTests: string[];
    warning?: string;
  };
}

const inputSchema = z.object({
  issueId: z.string().describe("Jira issue ID of the test plan"),
  testIssueIds: z.array(z.string()).min(1).describe("List of test issue IDs to add to the plan"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_add_tests_to_plan",
  description: "Add one or more tests to an existing Xray test plan.",
  accessLevel: "write",
  inputSchema,
  handler: async (args, _ctx) => {
    const { issueId, testIssueIds, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<AddTestsResponse>(ADD_TESTS_TO_PLAN, {
      issueId,
      testIssueIds,
    });

    const result = data.addTestsToTestPlan;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }

    const added = result.addedTests.length;
    const details = `added ${added} test(s)${result.warning ? ` | warn:${result.warning}` : ""}`;
    const text = writeConfirmation("UPDATED", issueId, details);
    return { content: [{ type: "text" as const, text }] };
  },
});
