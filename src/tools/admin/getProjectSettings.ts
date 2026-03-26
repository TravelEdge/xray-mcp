import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM } from "../shared/formatHelpers.js";
import { GET_PROJECT_SETTINGS } from "./queries.js";

const inputSchema = z.object({
  projectIdOrKey: z.string().describe("Jira project ID or key to get settings for"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_get_project_settings",
  description:
    "Get Xray configuration for a Jira project, including test types, test statuses, and step statuses.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, ctx) => {
    const { projectIdOrKey, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<{ getProjectSettings: unknown }>(
      GET_PROJECT_SETTINGS,
      { projectIdOrKey },
    );

    if (!data.getProjectSettings) {
      return {
        content: [
          {
            type: "text" as const,
            text: `ERR:NOT_FOUND Project settings for ${projectIdOrKey} not found\n-> Verify the project ID is correct`,
          },
        ],
      };
    }

    if (format === "json") {
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(data.getProjectSettings, null, 2) },
        ],
      };
    }

    const formatter = new ToonFormatter(format);
    const text = formatter.format("settings", data.getProjectSettings);
    return { content: [{ type: "text" as const, text }] };
  },
});
