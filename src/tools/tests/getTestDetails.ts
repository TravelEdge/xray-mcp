import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, selectQuery } from "../shared/formatHelpers.js";
import { GET_TEST_FULL, GET_TEST_TOON } from "./queries.js";

const formatter = new ToonFormatter();

registerTool({
  name: "xray_get_test_details",
  description:
    "Get full details of an Xray test by issue ID, including steps, type, status, and relations. " +
    "For Jira issue fields (assignee, components, etc.), use the Atlassian MCP server instead.",
  accessLevel: "read",
  inputSchema: z.object({
    issueId: z.string().describe("The Jira issue ID of the test (e.g. PROJ-123)"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, ctx) => {
    const { issueId, format } = args as { issueId: string; format: string };
    const client = (args._client as XrayClient) ?? undefined;

    const query = selectQuery(format, GET_TEST_TOON, GET_TEST_FULL);
    const data = await (client as XrayClient).executeGraphQL<{
      getTest: unknown;
    }>(query, { issueId });

    if (!data.getTest) {
      return {
        content: [
          {
            type: "text" as const,
            text: formatter.formatError(
              "NOT_FOUND",
              `Test not found: ${issueId}`,
              "Verify the issue ID exists in Xray",
            ),
          },
        ],
      };
    }

    const text =
      format === "json"
        ? JSON.stringify(data.getTest, null, 2)
        : formatter.format("test", data.getTest);

    return { content: [{ type: "text" as const, text }] };
  },
});
