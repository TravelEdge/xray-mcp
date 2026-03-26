import { z } from "zod";
import { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { REMOVE_ALL_TEST_STEPS } from "./queries.js";

registerTool({
  name: "xray_remove_all_test_steps",
  description:
    "WARNING: This permanently removes ALL steps from the test. This action cannot be undone. " +
    "Use xray_remove_test_step to remove individual steps safely.",
  accessLevel: "write",
  inputSchema: z.object({
    issueId: z.string().describe("The Jira issue ID of the test (e.g. PROJ-123)"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const { issueId } = args as { issueId: string };
    const client = args._client as XrayCloudClient;

    await client.executeGraphQL(REMOVE_ALL_TEST_STEPS, { issueId });

    const text = writeConfirmation("DELETED", issueId, "all steps removed");
    return { content: [{ type: "text" as const, text }] };
  },
});
