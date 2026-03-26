import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { ADD_EVIDENCE_TO_STEP } from "./queries.js";

registerTool({
  name: "xray_add_evidence_to_step",
  description:
    "Attach evidence to a specific step within a test run. " +
    "Pass base64-encoded file content with filename and mimeType. " +
    "Use the Read tool or user attachment to obtain base64 content before calling this tool.",
  accessLevel: "write",
  inputSchema: z.object({
    runId: z.string().describe("Test run internal ID"),
    stepId: z.string().describe("Test run step internal ID"),
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
    // Pitfall 7: map mimeType (LLM-friendly name) to mediaType (Xray GraphQL field name)
    await client.executeGraphQL(ADD_EVIDENCE_TO_STEP, {
      runId: args.runId,
      stepId: args.stepId,
      evidence: [
        {
          data: args.content,
          filename: args.filename,
          mediaType: args.mimeType,
        },
      ],
    });
    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation(
            "UPDATED",
            `${String(args.runId)}/step:${String(args.stepId)}`,
            `evidence:${String(args.filename)}`,
          ),
        },
      ],
    };
  },
});
