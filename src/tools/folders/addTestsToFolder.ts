import { z } from "zod";
import type { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { ADD_TESTS_TO_FOLDER } from "./queries.js";

registerTool({
  name: "xray_add_tests_to_folder",
  description: "Add tests to a folder in the Xray repository hierarchy.",
  accessLevel: "write",
  inputSchema: z.object({
    projectId: z.string().describe("Jira project ID, e.g. '10000'"),
    path: z.string().describe("Folder path, e.g. '/Regression/Login'"),
    testIssueIds: z.array(z.string()).describe("Array of test issue IDs to add to the folder"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayCloudClient;
    const data = await client.executeGraphQL<{
      addTestsToFolder: { folder: { name: string; path: string; testsCount: number }; warnings?: string[] };
    }>(ADD_TESTS_TO_FOLDER, {
      projectId: args.projectId,
      path: args.path,
      testIssueIds: args.testIssueIds,
    });
    const folder = data.addTestsToFolder?.folder;
    const path = folder?.path ?? String(args.path);
    const count = Array.isArray(args.testIssueIds) ? (args.testIssueIds as string[]).length : 0;
    const text = writeConfirmation("UPDATED", path, `added ${count} tests`);
    return { content: [{ type: "text" as const, text }] };
  },
});
