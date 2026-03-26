import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { REMOVE_ENVIRONMENTS_FROM_EXECUTION } from "./queries.js";

interface RemoveEnvsResponse {
  removeTestEnvironmentsFromTestExecution: string;
}

const inputSchema = z.object({
  issueId: z.string().describe("Test execution issue key, e.g. PROJ-456"),
  testEnvironments: z
    .array(z.string())
    .min(1)
    .describe("Environment names to remove, e.g. ['Chrome']"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_remove_environments_from_execution",
  description: "Remove test environments from a test execution.",
  accessLevel: "write",
  inputSchema,
  handler: async (args, _ctx) => {
    const { issueId, testEnvironments, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<RemoveEnvsResponse>(
      REMOVE_ENVIRONMENTS_FROM_EXECUTION,
      { issueId, testEnvironments },
    );

    const result = data.removeTestEnvironmentsFromTestExecution;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ removed: result }, null, 2) }],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("UPDATED", issueId, `removed:[${testEnvironments.join(",")}]`),
        },
      ],
    };
  },
});
