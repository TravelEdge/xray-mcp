import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { CREATE_FOLDER } from "./queries.js";

registerTool({
  name: "xray_create_folder",
  description: "Create a new folder in the Xray repository hierarchy.",
  accessLevel: "write",
  inputSchema: z.object({
    projectId: z.string().describe("Jira project ID, e.g. '10000'"),
    path: z
      .string()
      .describe(
        "Full folder path including the new folder name as the last segment, e.g. '/Regression/Login'",
      ),
    format: FORMAT_PARAM,
  }),
  handler: async (args, ctx) => {
    const client = args._client as XrayClient;
    const data = await client.executeGraphQL<{
      createFolder: {
        folder: { name: string; path: string; testsCount: number };
        warnings?: string[];
      };
    }>(CREATE_FOLDER, {
      projectId: args.projectId,
      path: args.path,
    });
    const folder = data.createFolder?.folder;
    if (!folder) {
      return {
        content: [{ type: "text" as const, text: "ERR:CREATE_FAILED Failed to create folder" }],
      };
    }
    if (ctx.format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data.createFolder, null, 2) }],
      };
    }
    const formatter = new ToonFormatter(ctx.format);
    const folderText = formatter.format("folder", folder);
    const text = writeConfirmation("CREATED", folder.path, folderText);
    return { content: [{ type: "text" as const, text }] };
  },
});
