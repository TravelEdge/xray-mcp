import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { REMOVE_ENVIRONMENTS_FROM_EXECUTION } from "./queries.js";

interface RemoveEnvsResponse {
  removeTestEnvironmentsFromTestExecution: {
    issueId: string;
    testEnvironments: string[];
  };
}

const inputSchema = z.object({
  issueId: z.string().describe("Test execution issue key, e.g. PROJ-456"),
  environments: z
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
    const { issueId, environments, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<RemoveEnvsResponse>(
      REMOVE_ENVIRONMENTS_FROM_EXECUTION,
      { issueId, environments },
    );

    const result = data.removeTestEnvironmentsFromTestExecution;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation(
            "UPDATED",
            issueId,
            `envs:[${result.testEnvironments.join(",")}]`,
          ),
        },
      ],
    };
  },
});
