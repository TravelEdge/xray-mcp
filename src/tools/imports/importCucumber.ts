import { z } from "zod";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM } from "../shared/formatHelpers.js";
import { buildQueryParams } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";

const BASE_PATH = "/import/execution/cucumber";

registerTool({
  name: "xray_import_cucumber",
  description:
    "Import Cucumber JSON test results. Read the Cucumber JSON output file and pass the full content here. " +
    "Note: Cucumber import does not support multipart mode — execution metadata is embedded in the Cucumber JSON format. " +
    "Use this tool to push Cucumber BDD test results into Xray Cloud.",
  accessLevel: "write",
  inputSchema: z.object({
    content: z.string().describe("Cucumber JSON results as a string"),
    projectKey: z.string().optional().describe("Jira project key"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const { content, projectKey, format } = args as {
      content: string;
      projectKey?: string;
      format: string;
    };

    const formatter = new ToonFormatter(format as "toon" | "json" | "summary");

    const queryString = buildQueryParams({
      projectKey: projectKey as string | undefined,
    });

    // Cucumber import: JSON body via executeRestRaw with application/json
    // Multipart mode is NOT supported for Cucumber — metadata is embedded in Cucumber JSON format
    const result = await client.executeRestRaw(
      "POST",
      `${BASE_PATH}${queryString}`,
      content,
      "application/json",
    );

    return {
      content: [{ type: "text" as const, text: formatter.format("import_result", result) }],
    };
  },
});
