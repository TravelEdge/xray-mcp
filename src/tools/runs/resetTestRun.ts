import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { RESET_RUN } from "./queries.js";

registerTool({
  name: "xray_reset_test_run",
  description:
    "WARNING: Resets test run to initial state, clearing all status, comments, and step results. This action cannot be undone.",
  accessLevel: "write",
  inputSchema: z.object({
    id: z.string().describe("The internal Xray test run ID to reset"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const id = args.id as string;

    await client.executeGraphQL<{ resetTestRun: string }>(RESET_RUN, { id });

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("UPDATED", `run:${id}`, "reset to initial state"),
        },
      ],
    };
  },
});
