import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, selectQuery } from "../shared/formatHelpers.js";
import { LIST_DATASETS_FULL, LIST_DATASETS_TOON } from "./queries.js";

const inputSchema = z.object({
  testIssueIds: z.array(z.string()).optional().describe("Filter by test issue IDs"),
  testExecIssueIds: z.array(z.string()).optional().describe("Filter by test execution issue IDs"),
  testPlanIssueIds: z.array(z.string()).optional().describe("Filter by test plan issue IDs"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_list_datasets",
  description: "List test datasets, optionally filtered by test, execution, or plan issue IDs.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, ctx) => {
    const { testIssueIds, testExecIssueIds, testPlanIssueIds, format } = args as z.infer<
      typeof inputSchema
    >;
    const client = args._client as XrayClient;

    const query = selectQuery(format, LIST_DATASETS_TOON, LIST_DATASETS_FULL);
    const data = await client.executeGraphQL<{
      getDatasets: unknown[];
    }>(query, { testIssueIds, testExecIssueIds, testPlanIssueIds });

    const datasets = data.getDatasets ?? [];

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(datasets, null, 2) }],
      };
    }

    const formatter = new ToonFormatter(format);
    const header = `Datasets: ${datasets.length} returned`;
    const lines = [header, ...datasets.map((r) => formatter.format("dataset", r))];
    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  },
});
