import { z } from "zod";
import { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import {
  FORMAT_PARAM,
  paginationHeader,
  selectQuery,
} from "../shared/formatHelpers.js";
import { JQL_PARAM, PAGINATION_PARAMS } from "../shared/types.js";
import { registerTool } from "../registry.js";
import { LIST_TESTS_FULL, LIST_TESTS_TOON } from "./queries.js";

const formatter = new ToonFormatter();

registerTool({
  name: "xray_list_tests",
  description:
    "List Xray tests with optional JQL filter and folder path. " +
    "Supports pagination with limit/start parameters.",
  accessLevel: "read",
  inputSchema: z.object({
    jql: JQL_PARAM,
    folder: z
      .string()
      .optional()
      .describe("Filter by folder path (e.g. /Regression/Login)"),
    ...PAGINATION_PARAMS,
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const {
      jql,
      folder,
      limit: rawLimit,
      start,
      format,
    } = args as {
      jql?: string;
      folder?: string;
      limit: number;
      start: number;
      format: string;
    };

    const client = args._client as XrayCloudClient;
    const limit = XrayCloudClient.validateLimit(rawLimit);

    const query = selectQuery(format, LIST_TESTS_TOON, LIST_TESTS_FULL);
    const data = await client.executeGraphQL<{
      getTests: { total: number; results: unknown[] };
    }>(query, { jql, limit, start, folder });

    const { total, results } = data.getTests;
    const header = paginationHeader("Tests", start, results.length, total);

    let body: string;
    if (format === "json") {
      body = JSON.stringify(data.getTests, null, 2);
    } else {
      body = formatter.format("test_list", results);
    }

    return { content: [{ type: "text" as const, text: `${header}\n${body}` }] };
  },
});
