import { z } from "zod";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM, selectQuery } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { GET_PLAN_TOON, GET_PLAN_FULL } from "./queries.js";

const inputSchema = z.object({
  issueId: z.string().describe("Jira issue ID of the test plan (e.g. '12345')"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_get_test_plan",
  description:
    "Get a single Xray test plan by issue ID, including its tests and test executions. Returns plan details in TOON (compact) or JSON format.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, _ctx) => {
    const { issueId, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const query = selectQuery(format, GET_PLAN_TOON, GET_PLAN_FULL);
    const data = await client.executeGraphQL<{ getTestPlan: unknown }>(query, { issueId });

    if (!data.getTestPlan) {
      return { content: [{ type: "text" as const, text: "(no data)" }] };
    }

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data.getTestPlan, null, 2) }],
      };
    }

    const formatter = new ToonFormatter(format);
    const text = formatter.format("test_plan", data.getTestPlan);
    return { content: [{ type: "text" as const, text }] };
  },
});
