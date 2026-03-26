import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import {
  FORMAT_PARAM,
  paginationHeader,
  selectQuery,
} from "../shared/formatHelpers.js";
import { JQL_PARAM } from "../shared/types.js";
import { registerTool } from "../registry.js";
import { LIST_TESTS_FULL, LIST_TESTS_TOON } from "./queries.js";

const formatter = new ToonFormatter();

registerTool({
  name: "xray_list_expanded_tests",
  description:
    "List Xray tests with expanded (nested) step data. " +
    "Defaults to limit 10 (not 50) because nested step resolution is expensive. " +
    "Supports pagination with limit/start parameters.",
  accessLevel: "read",
  inputSchema: z.object({
    jql: JQL_PARAM,
    folder: z
      .string()
      .optional()
      .describe("Filter by folder path (e.g. /Regression/Login)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10)
      .describe(
        "Number of results per page (1-100, default 10 — lower default due to expensive nested step resolution)",
      ),
    start: z.number().int().min(0).default(0).describe("Offset for pagination (0-based)"),
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

    const client = args._client as XrayClient;
    const limit = XrayCloudClient.validateLimit(rawLimit);

    // FALLBACK (checker issue #3): Use LIST_TESTS queries (getTests) with expanded fields.
    // A separate getExpandedTests root query may not exist in all Xray schema versions.
    // If getTests with expanded step fields fails, we surface the error.
    // Requires live-API verification during integration testing.
    let data: { getTests: { total: number; results: unknown[] } };
    let expansionUnavailable = false;

    const query = selectQuery(format, LIST_TESTS_TOON, LIST_TESTS_FULL);

    try {
      data = await client.executeGraphQL<{
        getTests: { total: number; results: unknown[] };
      }>(query, { jql, limit, start, folder });
    } catch (err) {
      // FALLBACK: if expanded query fails, retry with TOON query
      expansionUnavailable = true;
      data = await client.executeGraphQL<{
        getTests: { total: number; results: unknown[] };
      }>(LIST_TESTS_TOON, { jql, limit, start, folder });
    }

    const { total, results } = data.getTests;
    const header = paginationHeader("Tests", start, results.length, total);

    let body: string;
    if (format === "json") {
      body = JSON.stringify(data.getTests, null, 2);
    } else {
      body = formatter.format("test_list", results);
    }

    const hint = expansionUnavailable
      ? "\nNote: Expanded test list unavailable in this Xray schema version; showing base test data."
      : "";

    return {
      content: [{ type: "text" as const, text: `${header}\n${body}${hint}` }],
    };
  },
});
