import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, paginationHeader, selectQuery } from "../shared/formatHelpers.js";
import { JQL_PARAM, PAGINATION_PARAMS } from "../shared/types.js";
import { LIST_EXECUTIONS_FULL, LIST_EXECUTIONS_TOON } from "./queries.js";

interface ExecutionResult {
  issueId: string;
  jira?: Record<string, unknown>;
  testEnvironments?: string[];
}

interface ListExecutionsResponse {
  getTestExecutions: {
    total: number;
    results: ExecutionResult[];
  };
}

const inputSchema = z.object({
  jql: JQL_PARAM,
  ...PAGINATION_PARAMS,
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_list_test_executions",
  description:
    "List test executions with optional JQL filter and pagination. " +
    "For Jira issue fields, use the Atlassian MCP server instead.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, _ctx) => {
    const { jql, limit, start, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;
    const query = selectQuery(format, LIST_EXECUTIONS_TOON, LIST_EXECUTIONS_FULL);
    const data = await client.executeGraphQL<ListExecutionsResponse>(query, {
      jql,
      limit,
      start,
    });

    const { total, results } = data.getTestExecutions;

    if (format === "json") {
      const header = paginationHeader("Executions", start, results.length, total);
      return {
        content: [
          {
            type: "text" as const,
            text: `${header}\n${JSON.stringify(results, null, 2)}`,
          },
        ],
      };
    }

    const formatter = new ToonFormatter(format);
    const lines: string[] = [paginationHeader("Executions", start, results.length, total)];
    for (const exec of results) {
      lines.push(formatter.format("test_execution", exec));
    }
    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  },
});
