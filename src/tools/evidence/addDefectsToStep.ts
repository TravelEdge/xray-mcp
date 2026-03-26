import { z } from "zod";
import type { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { ADD_DEFECTS_TO_STEP } from "./queries.js";

registerTool({
  name: "xray_add_defects_to_step",
  description:
    "Link Jira issues as defects to a specific step within a test run. " +
    "For Jira issue fields, use the Atlassian MCP server instead.",
  accessLevel: "write",
  inputSchema: z.object({
    runId: z.string().describe("Test run internal ID"),
    stepId: z.string().describe("Test run step internal ID"),
    issueIds: z.array(z.string()).describe("Jira issue keys to link as defects, e.g. ['PROJ-123']"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayCloudClient;
    await client.executeGraphQL(ADD_DEFECTS_TO_STEP, {
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
            `defects:${(args.issueIds as string[]).join(",")}`,
          ),
        },
      ],
    };
  },
});
