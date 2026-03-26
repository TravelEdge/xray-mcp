import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { DELETE_SET } from "./queries.js";

const schema = z.object({
  issueId: z.string().describe("Jira issue ID of the test set to delete (e.g. '10042')"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_delete_test_set",
  description: "Delete a test set by its Jira issue ID. This removes the test set issue from Jira.",
  accessLevel: "write",
  inputSchema: schema,
  async handler(args, _ctx) {
    const { issueId, format } = schema.parse(args);
    const client = args._client as XrayClient;

    await client.executeGraphQL<{ deleteTestSet: string }>(DELETE_SET, { issueId });

    if (format === "json") {
      return { content: [{ type: "text" as const, text: JSON.stringify({ deleted: issueId }) }] };
    }

    const text = writeConfirmation("DELETED", issueId);
    return { content: [{ type: "text" as const, text }] };
  },
});
