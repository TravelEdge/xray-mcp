import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { buildQueryParams, FORMAT_PARAM } from "../shared/formatHelpers.js";

const BASE_PATH = "/import/execution/behave";

registerTool({
  name: "xray_import_behave",
  description:
    "Import Behave JSON test results. Read the Behave JSON output file and pass the full content here. " +
    "Note: Behave import does not support multipart mode — execution metadata is embedded in the Behave JSON format. " +
    "Use this tool to push Python Behave BDD test results into Xray Cloud.",
  accessLevel: "write",
  inputSchema: z.object({
    content: z.string().describe("Behave JSON results as a string"),
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

    // Behave import: JSON body via executeRestRaw with application/json
    // Multipart mode is NOT supported for Behave — same as Cucumber, metadata embedded in format
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
