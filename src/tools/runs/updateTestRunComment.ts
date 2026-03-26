import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { UPDATE_RUN_COMMENT } from "./queries.js";

registerTool({
  name: "xray_update_test_run_comment",
  description: "Update the comment on a test run.",
  accessLevel: "write",
  inputSchema: z.object({
    id: z.string().describe("The internal Xray test run ID"),
    comment: z.string().describe("New comment text for the test run"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const id = args.id as string;
    const comment = args.comment as string;

    await client.executeGraphQL<{ updateTestRunComment: string }>(UPDATE_RUN_COMMENT, {
      id,
      comment,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("UPDATED", `run:${id}`, `comment updated`),
        },
      ],
    };
  },
});
