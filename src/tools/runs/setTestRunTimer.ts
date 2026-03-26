import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { SET_RUN_TIMER } from "./queries.js";

registerTool({
  name: "xray_set_test_run_timer",
  description:
    "Control the execution timer for a test run. Set running=true to start, running=false to stop, reset=true to reset.",
  accessLevel: "write",
  inputSchema: z.object({
    testRunId: z.string().describe("The internal Xray test run ID"),
    running: z.boolean().optional().describe("Set to true to start the timer, false to stop it"),
    reset: z.boolean().optional().describe("Set to true to reset the timer"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const testRunId = args.testRunId as string;

    await client.executeGraphQL<{ setTestRunTimer: string }>(SET_RUN_TIMER, {
      testRunId,
      running: args.running ?? null,
      reset: args.reset ?? null,
    });

    const parts: string[] = [];
    if (args.running === true) parts.push("running:true");
    if (args.running === false) parts.push("running:false");
    if (args.reset === true) parts.push("reset:true");
    const detail = parts.length > 0 ? parts.join(", ") : "timer updated";

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("UPDATED", `run:${testRunId}`, detail),
        },
      ],
    };
  },
});
