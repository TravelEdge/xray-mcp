import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { DELETE_FOLDER } from "./queries.js";

registerTool({
  name: "xray_delete_folder",
  description:
    "WARNING: Deleting a folder may affect tests contained within it. " +
    "Delete a folder from the Xray repository hierarchy by project and path.",
  accessLevel: "write",
  inputSchema: z.object({
    projectId: z.string().describe("Jira project ID, e.g. '10000'"),
    path: z.string().describe("Folder path to delete, e.g. '/Regression/Login'"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    await client.executeGraphQL<{ deleteFolder: boolean }>(DELETE_FOLDER, {
      projectId: args.projectId,
      path: args.path,
    });
    const text = writeConfirmation("DELETED", `${String(args.projectId)}:${String(args.path)}`);
    return { content: [{ type: "text" as const, text }] };
  },
});
