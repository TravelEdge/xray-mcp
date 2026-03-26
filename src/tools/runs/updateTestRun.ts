import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { UPDATE_RUN } from "./queries.js";

registerTool({
  name: "xray_update_test_run",
  description:
    "Perform a full update of a test run: comment, assignee, dates, executedBy, and custom fields in one call.",
  accessLevel: "write",
  inputSchema: z.object({
    id: z.string().describe("The internal Xray test run ID"),
    comment: z.string().optional().describe("New comment text"),
    assigneeId: z.string().optional().describe("Assignee user account ID"),
    startedOn: z.string().optional().describe("Start date/time in ISO 8601 format"),
    finishedOn: z.string().optional().describe("Finish date/time in ISO 8601 format"),
    executedById: z.string().optional().describe("Executed-by user account ID"),
    customFields: z
      .record(z.unknown())
      .optional()
      .describe("Custom field values as key-value pairs"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const id = args.id as string;

    await client.executeGraphQL<{ updateTestRun: { warnings: string[] } }>(UPDATE_RUN, {
      id,
      comment: args.comment ?? null,
      assigneeId: args.assigneeId ?? null,
      startedOn: args.startedOn ?? null,
      finishedOn: args.finishedOn ?? null,
      executedById: args.executedById ?? null,
      customFields: args.customFields ?? null,
    });

    const parts: string[] = [];
    if (args.comment) parts.push("comment updated");
    if (args.assigneeId) parts.push(`assignee:${String(args.assigneeId)}`);
    if (args.startedOn) parts.push(`startedOn:${String(args.startedOn)}`);
    if (args.finishedOn) parts.push(`finishedOn:${String(args.finishedOn)}`);
    if (args.executedById) parts.push(`executedBy:${String(args.executedById)}`);
    if (args.customFields) parts.push("customFields updated");
    const details = parts.length > 0 ? parts.join(", ") : undefined;

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("UPDATED", `run:${id}`, details),
        },
      ],
    };
  },
});
