import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { FORMAT_PARAM, selectQuery } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { GET_COVERABLE_ISSUE_TOON, GET_COVERABLE_ISSUE_FULL } from "./queries.js";

const inputSchema = z.object({
  issueId: z.string().describe("Jira issue ID or key (story, bug, etc.) to get coverage for"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_get_coverable_issue",
  description:
    "Get test coverage status for a Jira issue (story, bug, etc.). " +
    "Returns whether the issue is covered by tests and the coverage percentage. " +
    "For Jira issue details, use the Atlassian MCP server instead.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, ctx) => {
    const { issueId, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const query = selectQuery(format, GET_COVERABLE_ISSUE_TOON, GET_COVERABLE_ISSUE_FULL);
    const data = await client.executeGraphQL<{ getCoverableIssue: unknown }>(query, { issueId });

    if (!data.getCoverableIssue) {
      return {
        content: [
          {
            type: "text" as const,
            text: `ERR:NOT_FOUND Coverable issue ${issueId} not found\n-> Verify the issue key is correct`,
          },
        ],
      };
    }

    if (format === "json") {
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(data.getCoverableIssue, null, 2) },
        ],
      };
    }

    const formatter = new ToonFormatter(format);
    const text = formatter.format("coverage", data.getCoverableIssue);
    return { content: [{ type: "text" as const, text }] };
  },
});
