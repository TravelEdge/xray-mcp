import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { UPDATE_ITERATION_STATUS } from "./queries.js";

registerTool({
  name: "xray_update_iteration_status",
  description: "Update the status of a specific iteration (data-set test row) within a test run.",
  accessLevel: "write",
  inputSchema: z.object({
    testRunId: z.string().describe("The internal Xray test run ID"),
    iterationRank: z.string().describe("Rank of the iteration in the test run"),
    status: z
      .enum(["PASS", "FAIL", "TODO", "EXECUTING", "ABORTED"])
      .describe("New status for the iteration"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const testRunId = args.testRunId as string;
    const iterationRank = args.iterationRank as string;
    const status = args.status as string;

    await client.executeGraphQL<{ updateIterationStatus: string }>(UPDATE_ITERATION_STATUS, {
      testRunId,
      iterationRank,
      status,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation(
            "UPDATED",
            `run:${testRunId}/iteration:${iterationRank}`,
            `s:${status}`,
          ),
        },
      ],
    };
  },
});
