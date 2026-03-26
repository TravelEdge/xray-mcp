import { z } from "zod";
import { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { REMOVE_TESTS_FROM_PRECONDITION } from "./queries.js";

interface RemoveTestsResult {
  removeTestsFromPrecondition: {
    removedTests: string[];
    warning?: string;
  };
}

registerTool({
  name: "xray_remove_tests_from_precondition",
  description:
    "Unlink one or more tests from an Xray precondition. " +
    "The precondition will no longer appear as a setup requirement for the unlinked tests.",
  accessLevel: "write",
  inputSchema: z.object({
    issueId: z.string().describe("Precondition issue key, e.g. PROJ-123"),
    testIssueIds: z
      .array(z.string())
      .min(1)
      .describe("Issue keys of tests to unlink from this precondition"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayCloudClient;
    const data = await client.executeGraphQL<RemoveTestsResult>(REMOVE_TESTS_FROM_PRECONDITION, {
      issueId: args.issueId,
      testIssueIds: args.testIssueIds,
    });
    const removed = data.removeTestsFromPrecondition.removedTests ?? [];
    const details = `removed:${removed.length} tests`;
    return {
      content: [
        {
          type: "text" as const,
          text: writeConfirmation("UPDATED", args.issueId as string, details),
        },
      ],
    };
  },
});
