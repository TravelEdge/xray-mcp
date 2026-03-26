import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { CREATE_PRECONDITION } from "./queries.js";

interface CreatePreconditionResponse {
  createPrecondition: {
    precondition: {
      issueId: string;
      jira?: { key?: string };
    };
    warnings?: string[];
  };
}

registerTool({
  name: "xray_create_precondition",
  description:
    "Create a new Xray precondition issue. Preconditions define setup requirements (e.g. user logged in, " +
    "database seeded) that must be satisfied before tests can execute.",
  accessLevel: "write",
  inputSchema: z.object({
    jira: z
      .record(z.unknown())
      .describe(
        'Jira fields JSON, e.g. { "fields": { "project": { "key": "PROJ" }, "summary": "My precondition" } }',
      ),
    preconditionType: z
      .object({ name: z.string() })
      .optional()
      .describe('Precondition type, e.g. { "name": "Manual" }'),
    definition: z.string().optional().describe("Precondition definition/steps text"),
    testIssueIds: z
      .array(z.string())
      .optional()
      .describe("Issue IDs of tests to link to this precondition"),
    folderPath: z.string().optional().describe("Folder path for the precondition"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const data = await client.executeGraphQL<CreatePreconditionResponse>(CREATE_PRECONDITION, {
      jira: args.jira,
      preconditionType: args.preconditionType,
      definition: args.definition,
      testIssueIds: args.testIssueIds,
      folderPath: args.folderPath,
    });
    const precondition = data.createPrecondition?.precondition;
    if (!precondition) {
      return {
        content: [
          {
            type: "text" as const,
            text: "ERR:CREATE_FAILED Precondition creation returned no data",
          },
        ],
      };
    }
    const key = precondition.jira?.key ?? precondition.issueId;
    const typeName = (args.preconditionType as { name: string } | undefined)?.name ?? "Manual";
    const details = `t:${typeName} | precondition`;
    return {
      content: [{ type: "text" as const, text: writeConfirmation("CREATED", key, details) }],
    };
  },
});
