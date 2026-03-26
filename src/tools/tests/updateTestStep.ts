import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { UPDATE_TEST_STEP } from "./queries.js";

registerTool({
  name: "xray_update_test_step",
  description: "Update an existing step in a Manual Xray test.",
  accessLevel: "write",
  inputSchema: z.object({
    issueId: z.string().describe("The Jira issue ID of the test (e.g. PROJ-123)"),
    stepId: z.string().describe("The ID of the step to update"),
    action: z.string().optional().describe("Updated step action text"),
    data: z.string().optional().describe("Updated step test data"),
    result: z.string().optional().describe("Updated expected step result"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const { issueId, stepId, action, data, result } = args as {
      issueId: string;
      stepId: string;
      action?: string;
      data?: string;
      result?: string;
    };
    const client = args._client as XrayClient;

    await client.executeGraphQL(UPDATE_TEST_STEP, { issueId, stepId, action, data, result });

    const text = writeConfirmation("UPDATED", issueId, `step:${stepId}`);
    return { content: [{ type: "text" as const, text }] };
  },
});
