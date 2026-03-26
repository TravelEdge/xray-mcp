import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { REMOVE_ISSUES_FROM_FOLDER } from "./queries.js";

registerTool({
  name: "xray_remove_issues_from_folder",
  description: "Remove issues (preconditions) from a folder in the Xray repository hierarchy.",
  accessLevel: "write",
  inputSchema: z.object({
    projectId: z.string().describe("Jira project ID, e.g. '10000'"),
    path: z.string().describe("Folder path, e.g. '/Regression/Login'"),
    issueIds: z
      .array(z.string())
      .describe("Array of issue IDs (preconditions) to remove from the folder"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    await client.executeGraphQL<{ removeIssuesFromFolder: boolean }>(REMOVE_ISSUES_FROM_FOLDER, {
      projectId: args.projectId,
      path: args.path,
      issueIds: args.issueIds,
    });
    const count = Array.isArray(args.issueIds) ? (args.issueIds as string[]).length : 0;
    const text = writeConfirmation(
      "UPDATED",
      `${String(args.projectId)}:${String(args.path)}`,
      `removed ${count} issues`,
    );
    return { content: [{ type: "text" as const, text }] };
  },
});
