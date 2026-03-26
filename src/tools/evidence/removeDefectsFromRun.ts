import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { REMOVE_DEFECTS_FROM_RUN } from "./queries.js";

registerTool({
  name: "xray_remove_defects_from_run",
  description: "Unlink Jira issues (defects) from a test run.",
  accessLevel: "write",
  inputSchema: z.object({
    id: z.string().describe("Test run internal ID"),
    issueIds: z.array(z.string()).describe("Jira issue keys to unlink as defects"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    await client.executeGraphQL(REMOVE_DEFECTS_FROM_RUN, {
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
            `unlinked:${(args.issueIds as string[]).join(",")}`,
          ),
        },
      ],
    };
  },
});
