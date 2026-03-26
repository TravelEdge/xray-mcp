import { z } from "zod";
import type { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { ADD_ISSUES_TO_FOLDER } from "./queries.js";

registerTool({
  name: "xray_add_issues_to_folder",
  description:
    "Add issues (preconditions) to a folder in the Xray repository hierarchy.",
  accessLevel: "write",
  inputSchema: z.object({
    projectId: z.string().describe("Jira project ID, e.g. '10000'"),
    path: z.string().describe("Folder path, e.g. '/Regression/Login'"),
    issueIds: z.array(z.string()).describe("Array of issue IDs (preconditions) to add to the folder"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayCloudClient;
    const data = await client.executeGraphQL<{
      addIssuesToFolder: { folder: { name: string; path: string; testsCount: number }; warnings?: string[] };
    }>(ADD_ISSUES_TO_FOLDER, {
      projectId: args.projectId,
      path: args.path,
      issueIds: args.issueIds,
    });
    const folder = data.addIssuesToFolder?.folder;
    const path = folder?.path ?? String(args.path);
    const count = Array.isArray(args.issueIds) ? (args.issueIds as string[]).length : 0;
    const text = writeConfirmation("UPDATED", path, `added ${count} issues`);
    return { content: [{ type: "text" as const, text }] };
  },
});
