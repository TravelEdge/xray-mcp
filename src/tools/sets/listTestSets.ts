import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, paginationHeader, selectQuery } from "../shared/formatHelpers.js";
import { JQL_PARAM, PAGINATION_PARAMS } from "../shared/types.js";
import { LIST_SETS_FULL, LIST_SETS_TOON } from "./queries.js";

interface TestSetSummary {
  issueId: string;
  jira?: { key?: string; summary?: string };
  tests?: { total?: number; results?: Array<{ issueId: string }> };
}

interface ListSetsData {
  getTestSets: {
    total: number;
    results: TestSetSummary[];
  };
}

const schema = z.object({
  jql: JQL_PARAM,
  ...PAGINATION_PARAMS,
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_list_test_sets",
  description:
    "List test sets with optional JQL filter and pagination. Returns sets with associated test counts.",
  accessLevel: "read",
  inputSchema: schema,
  async handler(args, _ctx) {
    const { jql, limit, start, format } = schema.parse(args);
    const client = args._client as XrayClient;
    const query = selectQuery(format, LIST_SETS_TOON, LIST_SETS_FULL);

    const data = await client.executeGraphQL<ListSetsData>(query, { jql, limit, start });

    const { total, results } = data.getTestSets;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data.getTestSets, null, 2) }],
      };
    }

    const header = paginationHeader("Test Sets", start, results.length, total);
    const formatter = new ToonFormatter(format);
    const lines = [header, ...results.map((s) => formatter.format("test_set", s))];
    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  },
});
