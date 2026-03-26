import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { REMOVE_TESTS_FROM_SET } from "./queries.js";

interface RemoveTestsData {
  removeTestsFromTestSet: {
    removedTests: string[];
    warnings?: string[];
  };
}

const schema = z.object({
  issueId: z.string().describe("Jira issue ID of the test set (e.g. '10042')"),
  testIssueIds: z
    .array(z.string())
    .min(1)
    .describe("Array of test issue IDs to remove from the set"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_remove_tests_from_set",
  description: "Remove tests from a test set. Tests are referenced by their Jira issue IDs.",
  accessLevel: "write",
  inputSchema: schema,
  async handler(args, _ctx) {
    const { issueId, testIssueIds, format } = schema.parse(args);
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<RemoveTestsData>(REMOVE_TESTS_FROM_SET, {
      issueId,
      testIssueIds,
    });

    const removed = data.removeTestsFromTestSet.removedTests;

    if (format === "json") {
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(data.removeTestsFromTestSet, null, 2) },
        ],
      };
    }

    const details = `removed:${removed.length} tests`;
    const text = writeConfirmation("UPDATED", issueId, details);
    return { content: [{ type: "text" as const, text }] };
  },
});
