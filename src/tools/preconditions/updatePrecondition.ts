import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
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
    data: z
      .object({
        preconditionType: z
          .object({ name: z.string() })
          .optional()
          .describe('New precondition type, e.g. { "name": "Cucumber" }'),
        definition: z.string().optional().describe("New precondition definition/steps text"),
      })
      .describe("Fields to update on the precondition"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    await client.executeGraphQL(UPDATE_PRECONDITION, {
      issueId: args.issueId,
      data: args.data,
    });
    const updateData = args.data as {
      preconditionType?: { name: string };
      definition?: string;
    };
    const parts: string[] = [];
    if (updateData.preconditionType) parts.push(`t:${updateData.preconditionType.name}`);
    if (updateData.definition) parts.push(`def:updated`);
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
