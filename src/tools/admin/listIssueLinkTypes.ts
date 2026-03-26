import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { GET_ISSUE_LINK_TYPES } from "./queries.js";

const inputSchema = z.object({
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_list_issue_link_types",
  description:
    "List available issue link types in Xray. " +
    "Note: For Jira's native link types, use the Atlassian MCP server instead. " +
    "This returns Xray-specific link types used for test-to-requirement coverage.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, ctx) => {
    const { format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<{
      getIssueLinkTypes: Array<{ name: string; inward: string; outward: string }>;
    }>(GET_ISSUE_LINK_TYPES);

    const linkTypes = data.getIssueLinkTypes ?? [];

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(linkTypes, null, 2) }],
      };
    }

    // Format as key-value pairs: name | inward -> outward
    const lines = linkTypes.map(
      (lt) => `${lt.name} | inward: ${lt.inward} | outward: ${lt.outward}`,
    );
    const text = lines.length > 0 ? lines.join("\n") : "(no link types found)";
    return { content: [{ type: "text" as const, text }] };
  },
});
