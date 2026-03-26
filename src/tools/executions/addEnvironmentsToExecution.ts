import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { ADD_ENVIRONMENTS_TO_EXECUTION } from "./queries.js";

interface AddEnvsResponse {
  addTestEnvironmentsToTestExecution: {
    issueId: string;
    testEnvironments: string[];
  };
}

const inputSchema = z.object({
  issueId: z.string().describe("Test execution issue key, e.g. PROJ-456"),
  environments: z
    .array(z.string())
    .min(1)
    .describe("Environment names to add, e.g. ['Chrome', 'Firefox']"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_add_environments_to_execution",
  description: "Add test environments to an existing test execution.",
  accessLevel: "write",
  inputSchema,
  handler: async (args, _ctx) => {
    const { issueId, environments, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<AddEnvsResponse>(ADD_ENVIRONMENTS_TO_EXECUTION, {
      issueId,
      environments,
    });

    const result = data.addTestEnvironmentsToTestExecution;

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
