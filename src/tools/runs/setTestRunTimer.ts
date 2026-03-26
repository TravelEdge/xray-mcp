import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { SET_RUN_TIMER } from "./queries.js";

registerTool({
  name: "xray_set_test_run_timer",
  description:
    "Start or stop the execution timer for a test run. Use 'start' when beginning execution and 'stop' when finished.",
  accessLevel: "write",
  inputSchema: z.object({
    id: z.string().describe("The internal Xray test run ID"),
    action: z
      .enum(["start", "stop"])
      .describe("Timer action: 'start' to begin timing, 'stop' to end timing"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const id = args.id as string;
    const action = args.action as string;

    await client.executeGraphQL<{ setTestRunTimer: string }>(SET_RUN_TIMER, {
      id,
      action,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("UPDATED", `run:${id}`, `timer:${action}`),
        },
      ],
    };
  },
});
