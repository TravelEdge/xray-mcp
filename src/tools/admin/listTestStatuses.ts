import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM } from "../shared/formatHelpers.js";
import { GET_STATUSES } from "./queries.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Project ID to get project-specific statuses. Omit for global statuses."),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_list_test_statuses",
  description:
    "List available test statuses in Xray. Optionally scope to a specific project to get project-specific statuses.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, ctx) => {
    const { projectId, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    // MUST pass projectId as variable to query — allows optional project scoping (MEDIUM review concern)
    const data = await client.executeGraphQL<{ getStatuses: unknown[] }>(GET_STATUSES, {
      projectId,
    });

    const statuses = data.getStatuses ?? [];

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
