import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { ADD_EXECUTIONS_TO_PLAN } from "./queries.js";

interface AddExecutionsResponse {
  addTestExecutionsToTestPlan: {
    addedTestExecutions: string[];
    warning?: string;
  };
}

const inputSchema = z.object({
  issueId: z.string().describe("Jira issue ID of the test plan"),
  executionIssueIds: z
    .array(z.string())
    .min(1)
    .describe("List of test execution issue IDs to add to the plan"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_add_executions_to_plan",
  description: "Add one or more test executions to an existing Xray test plan.",
  accessLevel: "write",
  inputSchema,
  handler: async (args, _ctx) => {
    const { issueId, executionIssueIds, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<AddExecutionsResponse>(ADD_EXECUTIONS_TO_PLAN, {
      issueId,
      executionIssueIds,
    });

    const result = data.addTestExecutionsToTestPlan;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }

    const added = result.addedTestExecutions.length;
    const details = `added ${added} execution(s)${result.warning ? ` | warn:${result.warning}` : ""}`;
    const text = writeConfirmation("UPDATED", issueId, details);
    return { content: [{ type: "text" as const, text }] };
  },
});
