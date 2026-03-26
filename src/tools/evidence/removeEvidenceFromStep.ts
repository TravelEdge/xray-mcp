import { z } from "zod";
import type { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { REMOVE_EVIDENCE_FROM_STEP } from "./queries.js";

registerTool({
  name: "xray_remove_evidence_from_step",
  description: "Remove evidence attachments from a specific step within a test run.",
  accessLevel: "write",
  inputSchema: z.object({
    runId: z.string().describe("Test run internal ID"),
    stepId: z.string().describe("Test run step internal ID"),
    evidenceIds: z.array(z.string()).describe("Evidence IDs to remove from the step"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayCloudClient;
    await client.executeGraphQL(REMOVE_EVIDENCE_FROM_STEP, {
      runId: args.runId,
      stepId: args.stepId,
      evidenceIds: args.evidenceIds,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation(
            "UPDATED",
            `${String(args.runId)}/step:${String(args.stepId)}`,
            `removed:${(args.evidenceIds as string[]).length} evidence`,
          ),
        },
      ],
    };
  },
});
