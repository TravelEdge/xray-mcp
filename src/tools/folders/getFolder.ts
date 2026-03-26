import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, selectQuery } from "../shared/formatHelpers.js";
import { GET_FOLDER_FULL, GET_FOLDER_TOON } from "./queries.js";

registerTool({
  name: "xray_get_folder",
  description:
    "Get a folder in the Xray repository hierarchy by project and path. " +
    "Returns folder name, path, test count, and immediate subfolders.",
  accessLevel: "read",
  inputSchema: z.object({
    projectId: z.string().describe("Jira project ID, e.g. '10000'"),
    path: z.string().describe("Folder path, e.g. '/Regression/Login'"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, ctx) => {
    const client = args._client as XrayClient;
    const query = selectQuery(ctx.format, GET_FOLDER_TOON, GET_FOLDER_FULL);
    const data = await client.executeGraphQL<{ getFolder: unknown }>(query, {
      projectId: args.projectId,
      path: args.path,
    });
    if (!data.getFolder) {
      return {
        content: [
          {
            type: "text" as const,
            text: `ERR:NOT_FOUND Folder ${String(args.path)} not found in project ${String(args.projectId)}\n-> Verify the project ID and path are correct`,
          },
        ],
      };
    }
    if (ctx.format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data.getFolder, null, 2) }],
      };
    }
    const formatter = new ToonFormatter(ctx.format);
    const text = formatter.format("folder", data.getFolder);
    return { content: [{ type: "text" as const, text }] };
  },
});
