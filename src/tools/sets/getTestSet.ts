import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, selectQuery } from "../shared/formatHelpers.js";
import { GET_SET_FULL, GET_SET_TOON } from "./queries.js";

const schema = z.object({
  issueId: z.string().describe("Jira issue ID of the test set (e.g. '10042')"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_get_test_set",
  description:
    "Get a test set with its associated tests. Test sets group tests for reuse across executions.",
  accessLevel: "read",
  inputSchema: schema,
  async handler(args, _ctx) {
    const { issueId, format } = schema.parse(args);
    const client = args._client as XrayClient;
    const query = selectQuery(format, GET_SET_TOON, GET_SET_FULL);

    const data = await client.executeGraphQL<{ getTestSet: unknown | null }>(query, { issueId });

    if (!data.getTestSet) {
      return {
        content: [
          { type: "text" as const, text: `ERR:NOT_FOUND No test set found for issueId ${issueId}` },
        ],
      };
    }

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data.getTestSet, null, 2) }],
      };
    }

    const formatter = new ToonFormatter(format);
    const text = formatter.format("test_set", data.getTestSet);
    return { content: [{ type: "text" as const, text }] };
  },
});
