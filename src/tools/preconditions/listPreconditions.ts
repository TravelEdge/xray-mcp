import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, paginationHeader, selectQuery } from "../shared/formatHelpers.js";
import { JQL_PARAM, PAGINATION_PARAMS } from "../shared/types.js";
import { LIST_PRECONDITIONS_FULL, LIST_PRECONDITIONS_TOON } from "./queries.js";

interface PreconditionResult {
  issueId: string;
  preconditionType?: { name?: string };
  definition?: string;
  jira?: { key?: string; summary?: string };
}

interface PreconditionsResponse {
  getPreconditions: {
    total: number;
    results: PreconditionResult[];
  };
}

registerTool({
  name: "xray_list_preconditions",
  description:
    "List Xray preconditions with optional JQL filter and pagination. " +
    "Preconditions define setup conditions that must be met before tests execute.",
  accessLevel: "read",
  inputSchema: z.object({
    jql: JQL_PARAM,
    ...PAGINATION_PARAMS,
    format: FORMAT_PARAM,
  }),
  handler: async (args, ctx) => {
    const client = args._client as XrayClient;
    const query = selectQuery(ctx.format, LIST_PRECONDITIONS_TOON, LIST_PRECONDITIONS_FULL);
    const data = await client.executeGraphQL<PreconditionsResponse>(query, {
      jql: args.jql,
      limit: args.limit,
      start: args.start,
    });
    const { total, results } = data.getPreconditions;
    const formatter = new ToonFormatter(ctx.format);
    const header = paginationHeader("Preconditions", args.start as number, results.length, total);
    const lines = [header, ...results.map((r) => formatter.format("precondition", r))];
    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  },
});
