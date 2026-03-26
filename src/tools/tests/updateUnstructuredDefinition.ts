import { z } from "zod";
import { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { UPDATE_UNSTRUCTURED_DEFINITION } from "./queries.js";

registerTool({
  name: "xray_update_unstructured_definition",
  description: "Update the definition text of a Generic (unstructured) Xray test.",
  accessLevel: "write",
  inputSchema: z.object({
    issueId: z.string().describe("The Jira issue ID of the test (e.g. PROJ-123)"),
    definition: z.string().describe("New definition text for the Generic test"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const { issueId, definition } = args as { issueId: string; definition: string };
    const client = args._client as XrayCloudClient;

    await client.executeGraphQL(UPDATE_UNSTRUCTURED_DEFINITION, { issueId, definition });

    const text = writeConfirmation("UPDATED", issueId, "unstructured definition updated");
    return { content: [{ type: "text" as const, text }] };
  },
});
