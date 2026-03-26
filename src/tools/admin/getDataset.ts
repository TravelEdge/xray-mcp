import { z } from "zod";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import { FORMAT_PARAM, selectQuery } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";
import { GET_DATASET_TOON, GET_DATASET_FULL } from "./queries.js";

const inputSchema = z.object({
  id: z.string().describe("Dataset ID to retrieve"),
  format: FORMAT_PARAM,
});

registerTool({
  name: "xray_get_dataset",
  description:
    "Get a test dataset by ID, including its parameters (columns) and rows of test data.",
  accessLevel: "read",
  inputSchema,
  handler: async (args, ctx) => {
    const { id, format } = args as z.infer<typeof inputSchema>;
    const client = args._client as XrayClient;

    const query = selectQuery(format, GET_DATASET_TOON, GET_DATASET_FULL);
    const data = await client.executeGraphQL<{ getDataset: unknown }>(query, { id });

    if (!data.getDataset) {
      return {
        content: [
          {
            type: "text" as const,
            text: `ERR:NOT_FOUND Dataset ${id} not found\n-> Verify the dataset ID is correct`,
          },
        ],
      };
    }

    if (format === "json") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data.getDataset, null, 2) }],
      };
    }

    const formatter = new ToonFormatter(format);
    const text = formatter.format("dataset", data.getDataset);
    return { content: [{ type: "text" as const, text }] };
  },
});
