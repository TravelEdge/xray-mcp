import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { UPDATE_RUN_STEP } from "./queries.js";

registerTool({
  name: "xray_update_test_run_step",
  description:
    "Perform a full update of a test run step via UpdateTestRunStepInput: status, comment, evidence, and defects in one call.",
  accessLevel: "write",
  inputSchema: z.object({
    testRunId: z.string().describe("The internal Xray test run ID"),
    stepId: z.string().describe("The internal Xray step ID within the run"),
    updateData: z
      .object({
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
      })
      .optional()
      .describe("Update data for the step (status, comment, evidence, defects)"),
    iterationRank: z
      .string()
      .optional()
      .describe("Rank of the iteration to update (for parameterized tests)"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const testRunId = args.testRunId as string;
    const stepId = args.stepId as string;

    await client.executeGraphQL<{
      updateTestRunStep: {
        addedDefects: string[];
        removedDefects: string[];
        addedEvidence: string[];
        removedEvidence: string[];
        warnings: string[];
      };
    }>(UPDATE_RUN_STEP, {
      testRunId,
      stepId,
      updateData: args.updateData ?? null,
      iterationRank: args.iterationRank ?? null,
    });

    const parts: string[] = [];
    const updateData = args.updateData as Record<string, unknown> | undefined;
    if (updateData?.status) parts.push(`s:${String(updateData.status)}`);
    if (updateData?.comment) parts.push("comment updated");
    if (updateData?.evidence)
      parts.push(`${(updateData.evidence as unknown[]).length} evidence file(s)`);
    if (updateData?.defects)
      parts.push(`${(updateData.defects as unknown[]).length} defect(s) linked`);
    const details = parts.length > 0 ? parts.join(", ") : undefined;

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("UPDATED", `run:${testRunId}/step:${stepId}`, details),
        },
      ],
    };
  },
});
