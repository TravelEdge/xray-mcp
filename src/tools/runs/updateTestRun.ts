import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { UPDATE_RUN } from "./queries.js";

registerTool({
  name: "xray_update_test_run",
  description:
    "Perform a full update of a test run: status, comment, assignee, and custom fields in one call.",
  accessLevel: "write",
  inputSchema: z.object({
    id: z.string().describe("The internal Xray test run ID"),
    status: z
      .enum(["PASS", "FAIL", "TODO", "EXECUTING", "ABORTED"])
      .optional()
      .describe("New status for the test run"),
    comment: z.string().optional().describe("New comment text"),
    assignee: z
      .string()
      .optional()
      .describe("Assignee user account ID or username"),
    customFields: z
      .record(z.unknown())
      .optional()
      .describe("Custom field values as key-value pairs"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const id = args.id as string;

    await client.executeGraphQL<{ updateTestRun: string }>(UPDATE_RUN, {
      id,
      status: args.status ?? null,
      comment: args.comment ?? null,
      assignee: args.assignee ?? null,
      customFields: args.customFields ?? null,
    });

    const parts: string[] = [];
    if (args.status) parts.push(`s:${String(args.status)}`);
    if (args.comment) parts.push("comment updated");
    if (args.assignee) parts.push(`assignee:${String(args.assignee)}`);
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
