import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { UPDATE_EXAMPLE_STATUS } from "./queries.js";

registerTool({
  name: "xray_update_example_status",
  description:
    "Update the status of a specific example (BDD/data-driven test row) within a test run.",
  accessLevel: "write",
  inputSchema: z.object({
    runId: z.string().describe("The internal Xray test run ID"),
    exampleIndex: z
      .number()
      .int()
      .min(0)
      .describe("Zero-based index of the example in the test run"),
    status: z
      .enum(["PASS", "FAIL", "TODO", "EXECUTING", "ABORTED"])
      .describe("New status for the example"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const runId = args.runId as string;
    const exampleIndex = args.exampleIndex as number;
    const status = args.status as string;

    await client.executeGraphQL<{ updateExampleStatus: string }>(
      UPDATE_EXAMPLE_STATUS,
      { runId, exampleIndex, status },
    );

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation(
            "UPDATED",
            `run:${runId}/example:${exampleIndex}`,
            `s:${status}`,
          ),
        },
      ],
    };
  },
});
