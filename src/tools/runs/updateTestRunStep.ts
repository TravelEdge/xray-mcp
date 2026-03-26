import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { UPDATE_RUN_STEP } from "./queries.js";

registerTool({
  name: "xray_update_test_run_step",
  description:
    "Perform a full update of a test run step: status, comment, evidence, and defects in one call.",
  accessLevel: "write",
  inputSchema: z.object({
    runId: z.string().describe("The internal Xray test run ID"),
    stepId: z.string().describe("The internal Xray step ID within the run"),
    status: z
      .enum(["PASS", "FAIL", "TODO", "EXECUTING", "ABORTED"])
      .optional()
      .describe("New status for the step"),
    comment: z.string().optional().describe("New comment text for the step"),
    evidence: z
      .array(
        z.object({
          filename: z.string(),
          mimeType: z.string(),
          data: z.string().describe("Base64-encoded file content"),
        }),
      )
      .optional()
      .describe("Evidence files to attach to the step"),
    defects: z
      .array(z.string())
      .optional()
      .describe("Jira issue keys to link as defects (e.g. ['PROJ-789'])"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const runId = args.runId as string;
    const stepId = args.stepId as string;

    await client.executeGraphQL<{ updateTestRunStep: string }>(UPDATE_RUN_STEP, {
      runId,
      stepId,
      status: args.status ?? null,
      comment: args.comment ?? null,
      evidence: args.evidence ?? null,
      defects: args.defects ?? null,
    });

    const parts: string[] = [];
    if (args.status) parts.push(`s:${String(args.status)}`);
    if (args.comment) parts.push("comment updated");
    if (args.evidence) parts.push(`${(args.evidence as unknown[]).length} evidence file(s)`);
    if (args.defects) parts.push(`${(args.defects as unknown[]).length} defect(s) linked`);
    const details = parts.length > 0 ? parts.join(", ") : undefined;

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation(
            "UPDATED",
            `run:${runId}/step:${stepId}`,
            details,
          ),
        },
      ],
    };
  },
});
