import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { registerTool } from "../registry.js";
import { FORMAT_PARAM, selectQuery } from "../shared/formatHelpers.js";
import { GET_RUN_BY_ID_FULL, GET_RUN_BY_ID_TOON } from "./queries.js";

registerTool({
  name: "xray_get_test_run_by_id",
  description:
    "Get a test run by its internal Xray run ID. Use xray_get_test_run if you have test+execution keys instead.",
  accessLevel: "read",
  inputSchema: z.object({
    id: z.string().describe("The internal Xray test run ID (e.g. 'run-42')"),
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const format = (args.format as string) ?? "toon";
    const query = selectQuery(format, GET_RUN_BY_ID_TOON, GET_RUN_BY_ID_FULL);

    const data = await client.executeGraphQL<{ getTestRunById: unknown }>(query, { id: args.id });

    if (!data.getTestRunById) {
      return {
        content: [
          {
            type: "text" as const,
            text: `(no test run found for id=${String(args.id)})`,
          },
        ],
      };
    }

    const text =
      format === "json"
        ? JSON.stringify(data.getTestRunById, null, 2)
        : new ToonFormatter(format as "toon" | "summary").format("test_run", data.getTestRunById);

    return { content: [{ type: "text" as const, text }] };
  },
});
