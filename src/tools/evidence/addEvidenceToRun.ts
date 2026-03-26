import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { ADD_EVIDENCE_TO_RUN } from "./queries.js";

registerTool({
  name: "xray_add_evidence_to_run",
  description:
    "Attach evidence to a test run. " +
    "Pass base64-encoded file content with filename and mimeType. " +
    "Evidence can be screenshots, PDFs, or log files. " +
    "Use the Read tool or user attachment to obtain base64 content before calling this tool.",
  accessLevel: "write",
  inputSchema: z.object({
    id: z.string().describe("Test run internal ID"),
    content: z
      .string()
      .max(10_000_000)
      .describe("Base64-encoded file content (screenshot, PDF, log). Max ~7.5MB decoded."),
    filename: z.string().describe("Filename with extension, e.g. screenshot.png"),
    mimeType: z.string().describe("MIME type, e.g. image/png, application/pdf, text/plain"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    await client.executeGraphQL(ADD_EVIDENCE_TO_RUN, {
      id: args.id,
      evidence: [
        {
          data: args.content,
          filename: args.filename,
          mimeType: args.mimeType,
        },
      ],
    });
    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("UPDATED", String(args.id), `evidence:${String(args.filename)}`),
        },
      ],
    };
  },
});
