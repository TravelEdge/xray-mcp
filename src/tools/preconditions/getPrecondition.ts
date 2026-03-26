import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, selectQuery } from "../shared/formatHelpers.js";
import { GET_PRECONDITION_FULL, GET_PRECONDITION_TOON } from "./queries.js";

registerTool({
  name: "xray_get_precondition",
  description:
    "Get an Xray precondition by issue ID, including precondition type, definition, and linked tests. " +
    "For Jira issue fields (reporter, priority, labels) use the Atlassian MCP server.",
  accessLevel: "read",
  inputSchema: z.object({
    issueId: z.string().describe("Precondition issue key, e.g. PROJ-123"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, ctx) => {
    const client = args._client as XrayClient;
    const query = selectQuery(ctx.format, GET_PRECONDITION_TOON, GET_PRECONDITION_FULL);
    const data = await client.executeGraphQL<{ getPrecondition: unknown }>(query, {
      issueId: args.issueId,
    });
    if (!data.getPrecondition) {
      const formatter = new ToonFormatter(ctx.format);
      return { content: [{ type: "text" as const, text: formatter.format("precondition", null) }] };
    }
    const formatter = new ToonFormatter(ctx.format);
    const text = formatter.format("precondition", data.getPrecondition);
    return { content: [{ type: "text" as const, text }] };
  },
});
