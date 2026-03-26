import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { buildQueryParams, FORMAT_PARAM } from "../shared/formatHelpers.js";

const BASE_PATH = "/import/feature";

registerTool({
  name: "xray_import_feature_files",
  description:
    "Import Cucumber .feature files into Xray Cloud to create or update test cases. " +
    "Read the .feature file via your Read tool and pass the full content as a string. " +
    "The projectKey parameter is required to specify which Jira project to import tests into. " +
    "Note: If text/plain content type fails, the fallback is multipart/form-data wrapping.",
  accessLevel: "write",
  inputSchema: z.object({
    content: z.string().describe("Cucumber .feature file content as a string"),
    projectKey: z.string().describe("Jira project key (required)"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const { content, projectKey, format } = args as {
      content: string;
      projectKey: string;
      format: string;
    };

    const formatter = new ToonFormatter(format as "toon" | "json" | "summary");

    const queryString = buildQueryParams({
      projectKey,
    });

    // Feature file import: text/plain content type.
    // Note: If text/plain fails at integration test time, the fallback is to wrap in
    // buildMultipartBody({ name: "file", content, contentType: "text/plain" }).
    // Xray API may expect multipart/form-data for .feature files in some configurations.
    const result = await client.executeRestRaw(
      "POST",
      `${BASE_PATH}${queryString}`,
      content,
      "text/plain",
    );

    return {
      content: [{ type: "text" as const, text: formatter.format("import_result", result) }],
    };
  },
});
