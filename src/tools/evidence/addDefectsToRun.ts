import { z } from "zod";
import type { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { ADD_DEFECTS_TO_RUN } from "./queries.js";

registerTool({
  name: "xray_add_defects_to_run",
  description:
    "Link Jira issues as defects to a test run. " +
    "Pass an array of Jira issue keys (e.g. PROJ-123). " +
    "For Jira issue fields, use the Atlassian MCP server instead.",
  accessLevel: "write",
  inputSchema: z.object({
    id: z.string().describe("Test run internal ID"),
    issueIds: z.array(z.string()).describe("Jira issue keys to link as defects, e.g. ['PROJ-123']"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayCloudClient;
    await client.executeGraphQL(ADD_DEFECTS_TO_RUN, {
      id: args.id,
      issueIds: args.issueIds,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation(
            "UPDATED",
            String(args.id),
            `defects:${(args.issueIds as string[]).join(",")}`,
          ),
        },
      ],
    };
  },
});
