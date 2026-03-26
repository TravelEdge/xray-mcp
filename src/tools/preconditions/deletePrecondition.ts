import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { DELETE_PRECONDITION } from "./queries.js";

registerTool({
  name: "xray_delete_precondition",
  description:
    "Delete an Xray precondition permanently. This also unlinks it from all associated tests. " +
    "This action cannot be undone.",
  accessLevel: "write",
  inputSchema: z.object({
    issueId: z.string().describe("Precondition issue key to delete, e.g. PROJ-123"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    await client.executeGraphQL(DELETE_PRECONDITION, { issueId: args.issueId });
    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("DELETED", args.issueId as string),
        },
      ],
    };
  },
});
