import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { CREATE_PRECONDITION } from "./queries.js";

interface CreatePreconditionResponse {
  createPrecondition: {
    issueId: string;
    jira?: { key?: string };
  };
}

registerTool({
  name: "xray_create_precondition",
  description:
    "Create a new Xray precondition issue. Preconditions define setup requirements (e.g. user logged in, " +
    "database seeded) that must be satisfied before tests can execute.",
  accessLevel: "write",
  inputSchema: z.object({
    projectKey: z.string().describe("Jira project key, e.g. PROJ"),
    summary: z.string().describe("Summary/title of the precondition"),
    preconditionType: z
      .enum(["Manual", "Cucumber", "Generic"])
      .default("Manual")
      .describe("Precondition type (default: Manual)"),
    definition: z.string().optional().describe("Precondition definition/steps text"),
    testIssueIds: z
      .array(z.string())
      .optional()
      .describe("Issue IDs of tests to link to this precondition"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const data = await client.executeGraphQL<CreatePreconditionResponse>(CREATE_PRECONDITION, {
      projectKey: args.projectKey,
      summary: args.summary,
      preconditionType: args.preconditionType,
      definition: args.definition,
      testIssueIds: args.testIssueIds,
    });
    const key = data.createPrecondition.jira?.key ?? data.createPrecondition.issueId;
    const details = `t:${args.preconditionType} | ${args.summary}`;
    return { content: [{ type: "text" as const, text: writeConfirmation("CREATED", key, details) }] };
  },
});
