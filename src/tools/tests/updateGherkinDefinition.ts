import { z } from "zod";
import { XrayCloudClient } from "../../clients/XrayCloudClient.js";
import { FORMAT_PARAM, writeConfirmation } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { UPDATE_GHERKIN_DEFINITION } from "./queries.js";

registerTool({
  name: "xray_update_gherkin_definition",
  description: "Update the Gherkin (BDD) definition of a Cucumber-type Xray test.",
  accessLevel: "write",
  inputSchema: z.object({
    issueId: z.string().describe("The Jira issue ID of the test (e.g. PROJ-123)"),
    gherkin: z.string().describe("Full Gherkin scenario text (Feature/Scenario/Given/When/Then)"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const { issueId, gherkin } = args as { issueId: string; gherkin: string };
    const client = args._client as XrayCloudClient;

    await client.executeGraphQL(UPDATE_GHERKIN_DEFINITION, { issueId, gherkin });

    const text = writeConfirmation("UPDATED", issueId, "gherkin definition updated");
    return { content: [{ type: "text" as const, text }] };
  },
});
