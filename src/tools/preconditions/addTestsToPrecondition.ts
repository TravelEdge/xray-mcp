import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { ADD_TESTS_TO_PRECONDITION } from "./queries.js";

interface AddTestsResult {
  addTestsToPrecondition: {
    addedTests: string[];
    warning?: string;
  };
}

registerTool({
  name: "xray_add_tests_to_precondition",
  description:
    "Link one or more tests to an Xray precondition. " +
    "The precondition will appear as a setup requirement for the linked tests.",
  accessLevel: "write",
  inputSchema: z.object({
    issueId: z.string().describe("Precondition issue key, e.g. PROJ-123"),
    testIssueIds: z
      .array(z.string())
      .min(1)
      .describe("Issue keys of tests to link to this precondition"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const data = await client.executeGraphQL<AddTestsResult>(ADD_TESTS_TO_PRECONDITION, {
      issueId: args.issueId,
      testIssueIds: args.testIssueIds,
    });
    const added = data.addTestsToPrecondition.addedTests ?? [];
    const details = `added:${added.length} tests`;
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
