import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { REMOVE_EXECUTIONS_FROM_PLAN } from "./queries.js";

interface RemoveExecutionsResponse {
  removeTestExecutionsFromTestPlan: {
    removedTestExecutions: string[];
    warning?: string;
  };
}

const inputSchema = z.object({
  issueId: z.string().describe("Jira issue ID of the test plan"),
  testExecIssueIds: z
    .array(z.string())
    .min(1)
    .describe("List of test execution issue IDs to remove from the plan"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_remove_executions_from_plan",
  description: "Remove one or more test executions from an existing Xray test plan.",
  accessLevel: "write",
  inputSchema,
  handler: async (args, _ctx) => {
    const { issueId, testExecIssueIds, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<RemoveExecutionsResponse>(
      REMOVE_EXECUTIONS_FROM_PLAN,
      { issueId, testExecIssueIds },
    );

    const result = data.removeTestExecutionsFromTestPlan;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }

    const removed = result.removedTestExecutions.length;
    const details = `removed ${removed} execution(s)${result.warning ? ` | warn:${result.warning}` : ""}`;
    const text = writeConfirmation("UPDATED", issueId, details);
    return { content: [{ type: "text" as const, text }] };
  },
});
