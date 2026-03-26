import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM } from "../shared/formatHelpers.js";
import { GET_STEP_STATUSES } from "./queries.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Project ID to get project-specific step statuses. Omit for global statuses."),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_list_step_statuses",
  description:
    "List available test step statuses in Xray. Optionally scope to a specific project to get project-specific step statuses.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, ctx) => {
    const { projectId, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    // MUST pass projectId as variable to query — allows optional project scoping (MEDIUM review concern)
    const data = await client.executeGraphQL<{ getStepStatuses: unknown[] }>(GET_STEP_STATUSES, {
      projectId,
    });

    const statuses = data.getStepStatuses ?? [];

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(statuses, null, 2) }],
      };
    }

    const formatter = new ToonFormatter(format);
    const text = formatter.format("statuses", statuses);
    return { content: [{ type: "text" as const, text }] };
  },
});
