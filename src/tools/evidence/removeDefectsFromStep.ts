import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { REMOVE_DEFECTS_FROM_STEP } from "./queries.js";

registerTool({
  name: "xray_remove_defects_from_step",
  description: "Unlink Jira issues (defects) from a specific step within a test run.",
  accessLevel: "write",
  inputSchema: z.object({
    testRunId: z.string().describe("Test run internal ID"),
    stepId: z.string().describe("Test run step internal ID"),
    issues: z.array(z.string()).describe("Jira issue keys to unlink as defects"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    await client.executeGraphQL(REMOVE_DEFECTS_FROM_STEP, {
      testRunId: args.testRunId,
      stepId: args.stepId,
      issues: args.issues,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation(
            "UPDATED",
            `${String(args.testRunId)}/step:${String(args.stepId)}`,
            `unlinked:${(args.issues as string[]).join(",")}`,
          ),
        },
      ],
    };
  },
});
