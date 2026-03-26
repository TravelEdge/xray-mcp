import { z } from "zod";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, selectQuery } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { LIST_RUNS_BY_ID_TOON, LIST_RUNS_BY_ID_FULL } from "./queries.js";

registerTool({
  name: "xray_list_test_runs_by_id",
  description:
    "Get multiple test runs by their internal Xray run IDs in a single request.",
  accessLevel: "read",
  inputSchema: z.object({
    ids: z
      .array(z.string())
      .min(1)
      .describe("Array of internal Xray test run IDs"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const format = (args.format as string) ?? "toon";
    const query = selectQuery(format, LIST_RUNS_BY_ID_TOON, LIST_RUNS_BY_ID_FULL);

    const data = await client.executeGraphQL<{
      getTestRunsById: unknown[];
    }>(query, { ids: args.ids });

    const results = data.getTestRunsById ?? [];

    if (format === "json") {
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(results, null, 2) },
        ],
      };
    }

    const formatter = new ToonFormatter(format as "toon" | "summary");
    const lines = [
      `Test Runs (${results.length}):`,
      ...results.map((r) => formatter.format("test_run", r)),
    ];

    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  },
});
