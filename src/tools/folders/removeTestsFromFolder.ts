import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { REMOVE_TESTS_FROM_FOLDER } from "./queries.js";

registerTool({
  name: "xray_remove_tests_from_folder",
  description: "Remove tests from a folder in the Xray repository hierarchy.",
  accessLevel: "write",
  inputSchema: z.object({
    projectId: z.string().describe("Jira project ID, e.g. '10000'"),
    testIssueIds: z.array(z.string()).describe("Array of test issue IDs to remove from the folder"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    await client.executeGraphQL<{ removeTestsFromFolder: boolean }>(REMOVE_TESTS_FROM_FOLDER, {
      projectId: args.projectId,
      testIssueIds: args.testIssueIds,
    });
    const count = Array.isArray(args.testIssueIds) ? (args.testIssueIds as string[]).length : 0;
    const text = writeConfirmation("UPDATED", String(args.projectId), `removed ${count} tests`);
    return { content: [{ type: "text" as const, text }] };
  },
});
