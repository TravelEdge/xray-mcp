import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { UPDATE_UNSTRUCTURED_DEFINITION } from "./queries.js";

registerTool({
  name: "xray_update_unstructured_definition",
  description: "Update the definition text of a Generic (unstructured) Xray test.",
  accessLevel: "write",
  inputSchema: z.object({
    issueId: z.string().describe("The Jira issue ID of the test (e.g. PROJ-123)"),
    unstructured: z.string().describe("New definition text for the Generic test"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const { issueId, unstructured } = args as { issueId: string; unstructured: string };
    const client = args._client as XrayClient;

    await client.executeGraphQL<{ updateUnstructuredTestDefinition: unknown }>(
      UPDATE_UNSTRUCTURED_DEFINITION,
      { issueId, unstructured },
    );

    const text = writeConfirmation("UPDATED", issueId, "unstructured definition updated");
    return { content: [{ type: "text" as const, text }] };
  },
});
