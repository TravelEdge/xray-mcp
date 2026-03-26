import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, selectQuery } from "../shared/formatHelpers.js";
import {
  GET_EXPANDED_TEST_FULL,
  GET_EXPANDED_TEST_TOON,
  GET_TEST_FULL,
  GET_TEST_TOON,
} from "./queries.js";

const formatter = new ToonFormatter();

/** Check if any step in the response has callTestStep data. */
function hasCallTestStepData(testData: Record<string, unknown>): boolean {
  const steps = (testData.steps as unknown[] | undefined) ?? [];
  return steps.some((s) => (s as Record<string, unknown>).callTestStep != null);
}

registerTool({
  name: "xray_get_expanded_test",
  description:
    "Get an Xray test with call-test steps resolved (nested step expansion). " +
    "For Jira issue fields, use the Atlassian MCP server instead.",
  accessLevel: "read",
  inputSchema: z.object({
    issueId: z.string().describe("The Jira issue ID of the test (e.g. PROJ-123)"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, ctx) => {
    const { issueId, format } = args as { issueId: string; format: string };
    const client = args._client as XrayClient;

    const expandedQuery = selectQuery(format, GET_EXPANDED_TEST_TOON, GET_EXPANDED_TEST_FULL);
    let data: { getTest: unknown };
    let expansionUnavailable = false;

    try {
      data = await client.executeGraphQL<{ getTest: unknown }>(expandedQuery, { issueId });
    } catch {
      // FALLBACK: expanded query failed — retry with standard query
      expansionUnavailable = true;
      const fallbackQuery = selectQuery(format, GET_TEST_TOON, GET_TEST_FULL);
      data = await client.executeGraphQL<{ getTest: unknown }>(fallbackQuery, { issueId });
    }

    if (!data.getTest) {
      return {
        content: [
          {
            type: "text" as const,
            text: formatter.formatError(
              "NOT_FOUND",
              `Test not found: ${issueId}`,
              "Verify the issue ID exists in Xray",
            ),
          },
        ],
      };
    }

    // Check if callTestStep fields are actually populated
    const testRecord = data.getTest as Record<string, unknown>;
    if (!expansionUnavailable && !hasCallTestStepData(testRecord)) {
      expansionUnavailable = true;
    }

    const baseText =
      format === "json"
        ? JSON.stringify(data.getTest, null, 2)
        : formatter.format("test", data.getTest);

    const hint = expansionUnavailable
      ? "\nNote: Call-test step expansion unavailable in this Xray schema version; showing base steps."
      : "";

    return { content: [{ type: "text" as const, text: baseText + hint }] };
  },
});
