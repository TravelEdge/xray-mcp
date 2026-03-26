import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, paginationHeader, selectQuery } from "../shared/formatHelpers.js";
import { JQL_PARAM, PAGINATION_PARAMS } from "../shared/types.js";
import { LIST_COVERABLE_ISSUES_FULL, LIST_COVERABLE_ISSUES_TOON } from "./queries.js";

const inputSchema = z.object({
  jql: JQL_PARAM,
  ...PAGINATION_PARAMS,
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_list_coverable_issues",
  description:
    "List Jira issues that can have test coverage (stories, bugs, etc.) with their current coverage status. " +
    "For Jira issue fields, use the Atlassian MCP server instead.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, ctx) => {
    const { jql, limit, start, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const query = selectQuery(format, LIST_COVERABLE_ISSUES_TOON, LIST_COVERABLE_ISSUES_FULL);
    const data = await client.executeGraphQL<{
      getCoverableIssues: { total: number; results: unknown[] };
    }>(query, { jql, limit, start });

    const page = data.getCoverableIssues;
    const header = paginationHeader("Coverable Issues", start, page.results.length, page.total);

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: `${header}\n${JSON.stringify(page, null, 2)}` }],
      };
    }

    const formatter = new ToonFormatter(format);
    const lines = [header, ...page.results.map((r) => formatter.format("coverage", r))];
    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  },
});
