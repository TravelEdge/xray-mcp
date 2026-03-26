import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { CREATE_PLAN } from "./queries.js";

interface CreatePlanResponse {
  createTestPlan: {
    testPlan: {
      issueId: string;
      jira?: { key?: string };
    };
  };
}

const inputSchema = z.object({
  jira: z
    .record(z.unknown())
    .describe(
      'Jira field payload (JSON object) — must include at minimum the project key and summary, e.g. {"fields":{"project":{"key":"PROJ"},"summary":"My Plan"}}',
    ),
  savedFilter: z
    .string()
    .optional()
    .describe("Optional saved filter ID to associate with the test plan"),
  testIssueIds: z
    .array(z.string())
    .optional()
    .describe("Optional list of test issue IDs to add to the plan immediately"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_create_test_plan",
  description:
    "Create a new Xray test plan via Jira JSON payload. Optionally add tests immediately on creation.",
  accessLevel: "write",
  inputSchema,
  handler: async (args, _ctx) => {
    const { jira, savedFilter, testIssueIds, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<CreatePlanResponse>(CREATE_PLAN, {
      jira,
      savedFilter,
      testIssueIds,
    });

    const plan = data.createTestPlan?.testPlan;
    if (!plan) {
      return {
        content: [
          { type: "text" as const, text: "ERR:CREATE_FAILED Test plan creation returned no data" },
        ],
      };
    }
    const key = plan.jira?.key ?? plan.issueId;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(plan, null, 2) }],
      };
    }

    const text = writeConfirmation("CREATED", key, "");
    return { content: [{ type: "text" as const, text }] };
  },
});
