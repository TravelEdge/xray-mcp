import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { MOVE_FOLDER } from "./queries.js";

registerTool({
  name: "xray_move_folder",
  description: "Move a folder to a new location in the Xray repository hierarchy.",
  accessLevel: "write",
  inputSchema: z.object({
    projectId: z.string().describe("Jira project ID, e.g. '10000'"),
    path: z.string().describe("Current folder path, e.g. '/Regression/Login'"),
    destinationPath: z
      .string()
      .describe("Destination parent path, e.g. '/Smoke' to move folder under Smoke"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, ctx) => {
    const client = args._client as XrayClient;
    const data = await client.executeGraphQL<{
      moveFolder: { folder: { name: string; path: string; testsCount: number }; warnings?: string[] };
    }>(MOVE_FOLDER, {
      projectId: args.projectId,
      path: args.path,
      destinationPath: args.destinationPath,
    });
    const folder = data.moveFolder?.folder;
    if (!folder) {
      return {
        content: [{ type: "text" as const, text: "ERR:MOVE_FAILED Failed to move folder" }],
      };
    }
    if (ctx.format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data.moveFolder, null, 2) }],
      };
    }
    const formatter = new ToonFormatter(ctx.format);
    const folderText = formatter.format("folder", folder);
    const text = writeConfirmation("UPDATED", folder.path, folderText);
    return { content: [{ type: "text" as const, text }] };
  },
});
