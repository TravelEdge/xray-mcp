import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { RENAME_FOLDER } from "./queries.js";

registerTool({
  name: "xray_rename_folder",
  description: "Rename a folder in the Xray repository hierarchy.",
  accessLevel: "write",
  inputSchema: z.object({
    projectId: z.string().describe("Jira project ID, e.g. '10000'"),
    path: z.string().describe("Current folder path, e.g. '/Regression/Login'"),
    newName: z.string().describe("New name for the folder"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, ctx) => {
    const client = args._client as XrayClient;
    const data = await client.executeGraphQL<{
      renameFolder: { folder: { name: string; path: string; testsCount: number }; warnings?: string[] };
    }>(RENAME_FOLDER, {
      projectId: args.projectId,
      path: args.path,
      newName: args.newName,
    });
    const folder = data.renameFolder?.folder;
    if (!folder) {
      return {
        content: [{ type: "text" as const, text: "ERR:RENAME_FAILED Failed to rename folder" }],
      };
    }
    if (ctx.format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data.renameFolder, null, 2) }],
      };
    }
    const formatter = new ToonFormatter(ctx.format);
    const folderText = formatter.format("folder", folder);
    const text = writeConfirmation("UPDATED", folder.path, folderText);
    return { content: [{ type: "text" as const, text }] };
  },
});
