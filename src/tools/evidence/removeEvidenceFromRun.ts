import { z } from "zod";
import type { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { REMOVE_EVIDENCE_FROM_RUN } from "./queries.js";

registerTool({
  name: "xray_remove_evidence_from_run",
  description: "Remove evidence attachments from a test run by their evidence IDs.",
  accessLevel: "write",
  inputSchema: z.object({
    id: z.string().describe("Test run internal ID"),
    evidenceIds: z.array(z.string()).describe("Evidence IDs to remove from the test run"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayCloudClient;
    await client.executeGraphQL(REMOVE_EVIDENCE_FROM_RUN, {
      id: args.id,
      evidenceIds: args.evidenceIds,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation(
            "UPDATED",
            String(args.id),
            `removed:${(args.evidenceIds as string[]).length} evidence`,
          ),
        },
      ],
    };
  },
});
