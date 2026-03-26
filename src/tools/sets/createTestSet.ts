import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { CREATE_SET } from "./queries.js";

interface CreateSetData {
  createTestSet: {
    testSet: {
      issueId: string;
      jira?: { key?: string; summary?: string };
    } | null;
    warnings?: string[];
  };
}

const schema = z.object({
  jira: z
    .record(z.unknown())
    .describe(
      'Jira fields JSON object (must include project key and summary, e.g. { "fields": { "project": { "key": "PROJ" }, "summary": "My set" } })',
    ),
  testIssueIds: z
    .array(z.string())
    .optional()
    .describe("Optional array of test issue IDs to add to the set"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_create_test_set",
  description: "Create a new test set in a Jira project. Optionally include initial tests.",
  accessLevel: "write",
  inputSchema: schema,
  async handler(args, _ctx) {
    const { jira, testIssueIds, format } = schema.parse(args);
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<CreateSetData>(CREATE_SET, {
      jira,
      testIssueIds: testIssueIds ?? null,
    });

    const created = data.createTestSet.testSet;
    if (!created) {
      return {
        content: [
          { type: "text" as const, text: "ERR:CREATE_FAILED Test set creation returned no data" },
        ],
      };
    }

    const key = created.jira?.key ?? created.issueId;
    const summary = created.jira?.summary;
    const details = summary ? `s:${summary}` : undefined;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data.createTestSet, null, 2) }],
      };
    }

    const text = writeConfirmation("CREATED", key, details);
    return { content: [{ type: "text" as const, text }] };
  },
});
