import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
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
  projectKey: z.string().describe("Jira project key where the test plan will be created (e.g. 'PROJ')"),
  summary: z.string().describe("Summary/title for the new test plan"),
  testIssueIds: z
    .array(z.string())
    .optional()
    .describe("Optional list of test issue IDs to add to the plan immediately"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_create_test_plan",
  description:
    "Create a new Xray test plan in a Jira project. Optionally add tests immediately on creation.",
  accessLevel: "write",
  inputSchema,
  handler: async (args, _ctx) => {
    const { projectKey, summary, testIssueIds, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<CreatePlanResponse>(CREATE_PLAN, {
      projectKey,
      summary,
      testIssueIds,
    });

    const plan = data.createTestPlan.testPlan;
    const key = plan.jira?.key ?? plan.issueId;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(plan, null, 2) }],
      };
    }

    const details = `s:${summary}`;
    const text = writeConfirmation("CREATED", key, details);
    return { content: [{ type: "text" as const, text }] };
  },
});
