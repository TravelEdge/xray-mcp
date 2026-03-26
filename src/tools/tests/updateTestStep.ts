import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { UPDATE_TEST_STEP } from "./queries.js";

registerTool({
  name: "xray_update_test_step",
  description: "Update an existing step in a Manual Xray test.",
  accessLevel: "write",
  inputSchema: z.object({
    stepId: z.string().describe("The ID of the step to update"),
    step: z
      .object({
        action: z.string().optional().describe("Updated step action text"),
        data: z.string().optional().describe("Updated step test data"),
        result: z.string().optional().describe("Updated expected step result"),
      })
      .describe("Step fields to update"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const { stepId, step } = args as {
      stepId: string;
      step: { action?: string; data?: string; result?: string };
    };
    const client = args._client as XrayClient;

    await client.executeGraphQL(UPDATE_TEST_STEP, { stepId, step });

    const text = writeConfirmation("UPDATED", stepId, `step:${stepId}`);
    return { content: [{ type: "text" as const, text }] };
  },
});
