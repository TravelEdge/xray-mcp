import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, selectQuery } from "../shared/formatHelpers.js";
import { GET_DATASET_FULL, GET_DATASET_TOON } from "./queries.js";

const inputSchema = z.object({
  testIssueId: z.string().describe("Test issue ID to retrieve the dataset for"),
  testExecIssueId: z
    .string()
    .optional()
    .describe("Test execution issue ID (optional context filter)"),
  testPlanIssueId: z.string().optional().describe("Test plan issue ID (optional context filter)"),
  callTestIssueId: z.string().optional().describe("Call test issue ID (optional context filter)"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_get_dataset",
  description:
    "Get a test dataset by test issue ID, including its parameters (columns) and rows of test data.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, ctx) => {
    const { testIssueId, testExecIssueId, testPlanIssueId, callTestIssueId, format } =
      args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const query = selectQuery(format, GET_DATASET_TOON, GET_DATASET_FULL);
    const data = await client.executeGraphQL<{ getDataset: unknown }>(query, {
      testIssueId,
      testExecIssueId,
      testPlanIssueId,
      callTestIssueId,
    });

    if (!data.getDataset) {
      return {
        content: [
          {
            type: "text" as const,
            text: `ERR:NOT_FOUND Dataset for test ${testIssueId} not found\n-> Verify the test issue ID is correct`,
          },
        ],
      };
    }

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data.getDataset, null, 2) }],
      };
    }

    const formatter = new ToonFormatter(format);
    const text = formatter.format("dataset", data.getDataset);
    return { content: [{ type: "text" as const, text }] };
  },
});
