import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { ADD_TESTS_TO_SET } from "./queries.js";

interface AddTestsData {
  addTestsToTestSet: {
    addedTests: string[];
    warnings?: string[];
  };
}

const schema = z.object({
  issueId: z.string().describe("Jira issue ID of the test set (e.g. '10042')"),
  testIssueIds: z.array(z.string()).min(1).describe("Array of test issue IDs to add to the set"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_add_tests_to_set",
  description: "Add tests to an existing test set. Tests are referenced by their Jira issue IDs.",
  accessLevel: "write",
  inputSchema: schema,
  async handler(args, _ctx) {
    const { issueId, testIssueIds, format } = schema.parse(args);
    const client = args._client as XrayClient;

    const data = await client.executeGraphQL<AddTestsData>(ADD_TESTS_TO_SET, {
      issueId,
      testIssueIds,
    });

    const added = data.addTestsToTestSet.addedTests;

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data.addTestsToTestSet, null, 2) }],
      };
    }

    const details = `added:${added.length} tests`;
    const text = writeConfirmation("UPDATED", issueId, details);
    return { content: [{ type: "text" as const, text }] };
  },
});
