import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { REMOVE_DEFECTS_FROM_STEP } from "./queries.js";

registerTool({
  name: "xray_remove_defects_from_step",
  description: "Unlink Jira issues (defects) from a specific step within a test run.",
  accessLevel: "write",
  inputSchema: z.object({
    runId: z.string().describe("Test run internal ID"),
    stepId: z.string().describe("Test run step internal ID"),
    issueIds: z.array(z.string()).describe("Jira issue keys to unlink as defects"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    await client.executeGraphQL(REMOVE_DEFECTS_FROM_STEP, {
      runId: args.runId,
      stepId: args.stepId,
      issueIds: args.issueIds,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation(
            "UPDATED",
            `${String(args.runId)}/step:${String(args.stepId)}`,
            `unlinked:${(args.issueIds as string[]).join(",")}`,
          ),
        },
      ],
    };
  },
});
