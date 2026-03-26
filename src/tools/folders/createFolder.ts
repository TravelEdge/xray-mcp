import { z } from "zod";
import type { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { CREATE_FOLDER } from "./queries.js";

registerTool({
  name: "xray_create_folder",
  description: "Create a new folder in the Xray repository hierarchy.",
  accessLevel: "write",
  inputSchema: z.object({
    projectId: z.string().describe("Jira project ID, e.g. '10000'"),
    path: z.string().describe("Parent folder path, e.g. /Regression"),
    name: z.string().describe("Name for the new folder"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, ctx) => {
    const client = args._client as XrayCloudClient;
    const data = await client.executeGraphQL<{
      createFolder: { folder: { name: string; path: string; testsCount: number }; warnings?: string[] };
    }>(CREATE_FOLDER, {
      projectId: args.projectId,
      path: args.path,
      name: args.name,
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
