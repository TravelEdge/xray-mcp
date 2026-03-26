import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { UPDATE_STEP_COMMENT } from "./queries.js";

registerTool({
  name: "xray_update_step_comment",
  description: "Update the comment on a specific step within a test run.",
  accessLevel: "write",
  inputSchema: z.object({
    testRunId: z.string().describe("The internal Xray test run ID"),
    stepId: z.string().describe("The internal Xray step ID within the run"),
    comment: z.string().describe("New comment text for the step"),
    iterationRank: z
      .string()
      .optional()
      .describe("Rank of the iteration to update (for parameterized tests)"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const testRunId = args.testRunId as string;
    const stepId = args.stepId as string;
    const comment = args.comment as string;

    await client.executeGraphQL<{ updateTestRunStepComment: string }>(UPDATE_STEP_COMMENT, {
      testRunId,
      stepId,
      comment,
      iterationRank: args.iterationRank ?? null,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("UPDATED", `run:${testRunId}/step:${stepId}`, "comment updated"),
        },
      ],
    };
  },
});
