import { z } from "zod";
import { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { UPDATE_PRECONDITION } from "./queries.js";

registerTool({
  name: "xray_update_precondition",
  description:
    "Update an existing Xray precondition's type and/or definition. " +
    "At least one of preconditionType or definition must be provided.",
  accessLevel: "write",
  inputSchema: z.object({
    issueId: z.string().describe("Precondition issue key, e.g. PROJ-123"),
    preconditionType: z
      .enum(["Manual", "Cucumber", "Generic"])
      .optional()
      .describe("New precondition type"),
    definition: z.string().optional().describe("New precondition definition/steps text"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayCloudClient;
    await client.executeGraphQL(UPDATE_PRECONDITION, {
      issueId: args.issueId,
      preconditionType: args.preconditionType,
      definition: args.definition,
    });
    const parts: string[] = [];
    if (args.preconditionType) parts.push(`t:${args.preconditionType}`);
    if (args.definition) parts.push(`def:updated`);
    const details = parts.length > 0 ? parts.join(" | ") : undefined;
    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("UPDATED", args.issueId as string, details),
        },
      ],
    };
  },
});
