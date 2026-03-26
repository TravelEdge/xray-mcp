import { z } from "zod";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import {
  FORMAT_PARAM,
  paginationHeader,
  selectQuery,
} from "../shared/formatHelpers.js";
import { PAGINATION_PARAMS } from "../shared/types.js";
import { registerTool } from "../registry.js";
import { LIST_RUNS_TOON, LIST_RUNS_FULL } from "./queries.js";

registerTool({
  name: "xray_list_test_runs",
  description:
    "List all test runs for a given test issue, with optional environment filter and pagination.",
  accessLevel: "read",
  inputSchema: z.object({
    testIssueId: z
      .string()
      .describe("The Jira issue key of the test (e.g. 'PROJ-123')"),
    testEnvironments: z
      .array(z.string())
      .optional()
      .describe("Filter by test environment names (e.g. ['staging', 'prod'])"),
    ...PAGINATION_PARAMS,
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const format = (args.format as string) ?? "toon";
    const limit = (args.limit as number) ?? 50;
    const start = (args.start as number) ?? 0;
    const query = selectQuery(format, LIST_RUNS_TOON, LIST_RUNS_FULL);

    const data = await client.executeGraphQL<{
      getTestRuns: { total: number; results: unknown[] };
    }>(query, {
      testIssueId: args.testIssueId,
      limit,
      start,
      testEnvironments: args.testEnvironments ?? null,
    });

    const { total, results } = data.getTestRuns;

    if (format === "json") {
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(data.getTestRuns, null, 2) },
        ],
      };
    }

    const formatter = new ToonFormatter(format as "toon" | "summary");
    const header = paginationHeader("Test Runs", start, results.length, total);
    const lines = [
      header,
      ...results.map((r) => formatter.format("test_run", r)),
    ];

    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  },
});
