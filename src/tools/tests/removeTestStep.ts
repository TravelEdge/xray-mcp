import { z } from "zod";
import { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { REMOVE_TEST_STEP } from "./queries.js";

registerTool({
  name: "xray_remove_test_step",
  description: "Remove a specific step from a Manual Xray test by step ID.",
  accessLevel: "write",
  inputSchema: z.object({
    issueId: z.string().describe("The Jira issue ID of the test (e.g. PROJ-123)"),
    stepId: z.string().describe("The ID of the step to remove"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const { issueId, stepId } = args as { issueId: string; stepId: string };
    const client = args._client as XrayCloudClient;

    await client.executeGraphQL(REMOVE_TEST_STEP, { issueId, stepId });

    const text = writeConfirmation("DELETED", issueId, `step:${stepId}`);
    return { content: [{ type: "text" as const, text }] };
  },
});
