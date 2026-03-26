import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { DELETE_EXECUTION } from "./queries.js";

const inputSchema = z.object({
  issueId: z.string().describe("Test execution issue key to delete, e.g. PROJ-456"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_delete_test_execution",
  description: "Delete a test execution by issue key. This action cannot be undone.",
  accessLevel: "write",
  inputSchema,
  handler: async (args, _ctx) => {
    const { issueId, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    await client.executeGraphQL<{ deleteTestExecution: string }>(DELETE_EXECUTION, { issueId });

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ deleted: issueId }) }],
      };
    }

    return {
      content: [{ type: "text" as const, text: writeConfirmation("DELETED", issueId) }],
    };
  },
});
