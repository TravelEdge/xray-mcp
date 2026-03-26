import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { UPDATE_RUN_STATUS } from "./queries.js";

registerTool({
  name: "xray_update_test_run_status",
  description: "Update the status of a test run.",
  accessLevel: "write",
  inputSchema: z.object({
    id: z.string().describe("The internal Xray test run ID"),
    status: z
      .enum(["PASS", "FAIL", "TODO", "EXECUTING", "ABORTED"])
      .describe("New status for the test run"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const id = args.id as string;
    const status = args.status as string;

    await client.executeGraphQL<{ updateTestRunStatus: string }>(UPDATE_RUN_STATUS, { id, status });

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("UPDATED", `run:${id}`, `s:${status}`),
        },
      ],
    };
  },
});
