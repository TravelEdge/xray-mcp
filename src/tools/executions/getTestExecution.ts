import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, selectQuery } from "../shared/formatHelpers.js";
import { GET_EXECUTION_FULL, GET_EXECUTION_TOON } from "./queries.js";

const inputSchema = z.object({
  issueId: z.string().describe("Test execution issue key, e.g. PROJ-456"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_get_test_execution",
  description:
    "Get test execution details including runs, environments, and linked test plan. " +
    "For Jira issue fields, use the Atlassian MCP server instead.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, _ctx) => {
    const { issueId, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;
    const query = selectQuery(format, GET_EXECUTION_TOON, GET_EXECUTION_FULL);
    const data = await client.executeGraphQL<{ getTestExecution: unknown }>(query, { issueId });

    if (!data.getTestExecution) {
      return { content: [{ type: "text" as const, text: "(no data)" }] };
    }

    if (format === "json") {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data.getTestExecution, null, 2),
          },
        ],
      };
    }

    const formatter = new ToonFormatter(format);
    const text = formatter.format("test_execution", data.getTestExecution);
    return { content: [{ type: "text" as const, text }] };
  },
});
