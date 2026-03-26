import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, selectQuery } from "../shared/formatHelpers.js";
import { GET_RUN_FULL, GET_RUN_TOON } from "./queries.js";

registerTool({
  name: "xray_get_test_run",
  description:
    "Get a test run by test issue key and test execution issue key. Returns the run status, comment, and timing.",
  accessLevel: "read",
  inputSchema: z.object({
    testIssueId: z.string().describe("The Jira issue key of the test (e.g. 'PROJ-123')"),
    testExecIssueId: z
      .string()
      .describe("The Jira issue key of the test execution (e.g. 'PROJ-456')"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const format = (args.format as string) ?? "toon";
    const query = selectQuery(format, GET_RUN_TOON, GET_RUN_FULL);

    const data = await client.executeGraphQL<{ getTestRun: unknown }>(query, {
      testIssueId: args.testIssueId,
      testExecIssueId: args.testExecIssueId,
    });

    if (!data.getTestRun) {
      return {
        content: [
          {
            type: "text" as const,
            text: `(no test run found for testIssueId=${String(args.testIssueId)}, testExecIssueId=${String(args.testExecIssueId)})`,
          },
        ],
      };
    }

    const text =
      format === "json"
        ? JSON.stringify(data.getTestRun, null, 2)
        : new ToonFormatter(format as "toon" | "summary").format("test_run", data.getTestRun);

    return { content: [{ type: "text" as const, text }] };
  },
});
