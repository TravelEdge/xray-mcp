import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { FORMAT_PARAM, paginationHeader, selectQuery } from "../shared/formatHelpers.js";
import { PAGINATION_PARAMS } from "../shared/types.js";
import { registerTool } from "../registry.js";
import { LIST_DATASETS_TOON, LIST_DATASETS_FULL } from "./queries.js";

const inputSchema = z.object({
  projectId: z.string().describe("Jira project ID or key to list datasets for"),
  ...PAGINATION_PARAMS,
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_list_datasets",
  description: "List test datasets for a project, including parameter counts and row counts.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, ctx) => {
    const { projectId, limit, start, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const query = selectQuery(format, LIST_DATASETS_TOON, LIST_DATASETS_FULL);
    const data = await client.executeGraphQL<{
      getDatasets: { total: number; results: unknown[] };
    }>(query, { projectId, limit, start });

    const page = data.getDatasets;
    const header = paginationHeader("Datasets", start, page.results.length, page.total);

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: `${header}\n${JSON.stringify(page, null, 2)}` }],
      };
    }

    const formatter = new ToonFormatter(format);
    const lines = [header, ...page.results.map((r) => formatter.format("dataset", r))];
    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  },
});
