import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { UPDATE_STEP_STATUS } from "./queries.js";

registerTool({
  name: "xray_update_step_status",
  description: "Update the status of a specific step within a test run.",
  accessLevel: "write",
  inputSchema: z.object({
    runId: z.string().describe("The internal Xray test run ID"),
    stepId: z.string().describe("The internal Xray step ID within the run"),
    status: z
      .enum(["PASS", "FAIL", "TODO", "EXECUTING", "ABORTED"])
      .describe("New status for the step"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const runId = args.runId as string;
    const stepId = args.stepId as string;
    const status = args.status as string;

    await client.executeGraphQL<{ updateStepStatus: string }>(
      UPDATE_STEP_STATUS,
      { runId, stepId, status },
    );

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation(
            "UPDATED",
            `run:${runId}/step:${stepId}`,
            `s:${status}`,
          ),
        },
      ],
    };
  },
});
