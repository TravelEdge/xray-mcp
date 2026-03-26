import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { DELETE_PLAN } from "./queries.js";

interface DeletePlanResponse {
  deleteTestPlan: {
    issueId: string;
  };
}

const inputSchema = z.object({
  issueId: z.string().describe("Jira issue ID of the test plan to delete"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_delete_test_plan",
  description:
    "Delete an Xray test plan by issue ID. This action is irreversible.",
  accessLevel: "write",
  inputSchema,
  handler: async (args, _ctx) => {
    const { issueId, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<DeletePlanResponse>(DELETE_PLAN, { issueId });
    const deletedId = data.deleteTestPlan.issueId;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data.deleteTestPlan, null, 2) }],
      };
    }

    const text = writeConfirmation("DELETED", deletedId);
    return { content: [{ type: "text" as const, text }] };
  },
});
