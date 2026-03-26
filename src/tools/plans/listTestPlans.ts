import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, paginationHeader, selectQuery } from "../shared/formatHelpers.js";
import { JQL_PARAM, PAGINATION_PARAMS } from "../shared/types.js";
import { LIST_PLANS_FULL, LIST_PLANS_TOON } from "./queries.js";

interface PlanResult {
  issueId: string;
  jira?: Record<string, unknown>;
  tests?: { total?: number };
  testExecutions?: { total?: number };
  folders?: { path?: string };
}

interface ListPlansResponse {
  getTestPlans: {
    total: number;
    results: PlanResult[];
  };
}

const inputSchema = z.object({
  jql: JQL_PARAM,
  ...PAGINATION_PARAMS,
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_list_test_plans",
  description:
    "List Xray test plans with optional JQL filter and pagination. Returns paginated plan list with test and execution counts.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, _ctx) => {
    const { jql, limit, start, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const query = selectQuery(format, LIST_PLANS_TOON, LIST_PLANS_FULL);
    const data = await client.executeGraphQL<ListPlansResponse>(query, {
      jql,
      limit,
      start,
    });

    const { total, results } = data.getTestPlans;

    if (format === "json") {
      const header = paginationHeader("Test Plans", start, results.length, total);
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
    const lines: string[] = [paginationHeader("Test Plans", start, results.length, total)];
    for (const plan of results) {
      lines.push(formatter.format("test_plan", plan));
    }
    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  },
});
