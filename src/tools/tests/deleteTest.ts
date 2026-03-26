import { z } from "zod";
import { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { DELETE_TEST } from "./queries.js";

registerTool({
  name: "xray_delete_test",
  description: "Delete an Xray test by issue ID. Returns a deletion confirmation.",
  accessLevel: "write",
  inputSchema: z.object({
    issueId: z.string().describe("The Jira issue ID of the test to delete (e.g. PROJ-123)"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const { issueId } = args as { issueId: string };
    const client = args._client as XrayCloudClient;

    await client.executeGraphQL(DELETE_TEST, { issueId });

    const text = writeConfirmation("DELETED", issueId);
    return { content: [{ type: "text" as const, text }] };
  },
});
