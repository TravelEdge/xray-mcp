import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { UPDATE_EXAMPLE_STATUS } from "./queries.js";

registerTool({
  name: "xray_update_example_status",
  description:
    "Update the status of a specific example (BDD/data-driven test row) within a test run.",
  accessLevel: "write",
  inputSchema: z.object({
    exampleId: z.string().describe("The internal Xray example ID"),
    status: z
      .enum(["PASS", "FAIL", "TODO", "EXECUTING", "ABORTED"])
      .describe("New status for the example"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const exampleId = args.exampleId as string;
    const status = args.status as string;

    await client.executeGraphQL<{ updateTestRunExampleStatus: string }>(UPDATE_EXAMPLE_STATUS, {
      exampleId,
      status,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("UPDATED", `example:${exampleId}`, `s:${status}`),
        },
      ],
    };
  },
});
