import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";

const inputSchema = z.object({
  issueKeys: z
    .array(z.string())
    .min(1)
    .describe("Test issue keys to export, e.g. ['PROJ-1', 'PROJ-2']"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_export_cucumber_features",
  description:
    "Export Cucumber feature files for the given test issue keys. " +
    "Returns the feature file content inline. " +
    "For multiple tests, feature files are separated by '--- FILE: {key}.feature ---' headers.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, _ctx) => {
    const { issueKeys } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    // CRITICAL: Use semicolon (;) as key separator — Xray API requires this (not comma).
    // Per D-18: return content inline as text in TOON response.
    const keysParam = issueKeys.join(";");
    const text = await client.executeRestText("GET", `/export/cucumber?keys=${keysParam}`);

    return { content: [{ type: "text" as const, text }] };
  },
});
