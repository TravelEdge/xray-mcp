import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { ADD_TEST_STEP } from "./queries.js";

registerTool({
  name: "xray_add_test_step",
  description: "Add a new step to a Manual Xray test.",
  accessLevel: "write",
  inputSchema: z.object({
    issueId: z.string().describe("The Jira issue ID of the test (e.g. PROJ-123)"),
    step: z
      .object({
        action: z.string().describe("Step action text"),
        data: z.string().optional().describe("Step test data"),
        result: z.string().optional().describe("Expected step result"),
      })
      .describe("Step data to add"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const { issueId, step } = args as {
      issueId: string;
      step: { action: string; data?: string; result?: string };
    };
    const client = args._client as XrayClient;

    const resp = await client.executeGraphQL<{
      addTestStep: { id: string };
    }>(ADD_TEST_STEP, { issueId, step });

    const stepId = resp.addTestStep.id;
    const text = writeConfirmation("CREATED", issueId, `step:${stepId}`);
    return { content: [{ type: "text" as const, text }] };
  },
});
