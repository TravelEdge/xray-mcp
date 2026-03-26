import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { REMOVE_TEST_STEP } from "./queries.js";

registerTool({
  name: "xray_remove_test_step",
  description: "Remove a specific step from a Manual Xray test by step ID.",
  accessLevel: "write",
  inputSchema: z.object({
    stepId: z.string().describe("The ID of the step to remove"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const { stepId } = args as { stepId: string };
    const client = args._client as XrayClient;

    await client.executeGraphQL(REMOVE_TEST_STEP, { stepId });

    const text = writeConfirmation("DELETED", stepId, `step:${stepId}`);
    return { content: [{ type: "text" as const, text }] };
  },
});
