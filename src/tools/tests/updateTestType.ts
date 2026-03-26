import { z } from "zod";
import { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { UPDATE_TEST_TYPE } from "./queries.js";

registerTool({
  name: "xray_update_test_type",
  description: "Change the test type of an Xray test (Manual, Cucumber, Generic).",
  accessLevel: "write",
  inputSchema: z.object({
    issueId: z.string().describe("The Jira issue ID of the test (e.g. PROJ-123)"),
    testType: z
      .enum(["Manual", "Cucumber", "Generic"])
      .describe("New test type to set"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const { issueId, testType } = args as { issueId: string; testType: string };
    const client = args._client as XrayCloudClient;

    await client.executeGraphQL(UPDATE_TEST_TYPE, { issueId, testType });

    const text = writeConfirmation("UPDATED", issueId, `t:${testType}`);
    return { content: [{ type: "text" as const, text }] };
  },
});
