import { z } from "zod";
import { ToonFormatter } from "../../formatters/ToonFormatter.js";
import type { XrayClient } from "../../clients/XrayClientInterface.js";
import { FORMAT_PARAM } from "../shared/formatHelpers.js";
import { buildMultipartBody, buildQueryParams } from "../shared/formatHelpers.js";
import { registerTool } from "../registry.js";

/** Shared testExecInfo schema for multipart-capable import tools (REST-02). */
const TEST_EXEC_INFO = z
  .object({
    summary: z.string().optional().describe("Test execution summary"),
    description: z.string().optional().describe("Test execution description"),
    projectKey: z.string().optional().describe("Jira project key (overrides query param)"),
    testPlanKey: z.string().optional().describe("Test plan key to associate"),
    testEnvironments: z.array(z.string()).optional().describe("Test environment names"),
    fixVersion: z.string().optional().describe("Fix version name"),
    revision: z.string().optional().describe("Source code revision/commit hash"),
  })
  .optional()
  .describe(
    "Test execution metadata for multipart mode. When provided, import uses multipart/form-data to include execution-level fields (summary, description, version, etc.) that are not available in simple mode.",
  );

const BASE_PATH = "/import/execution";

registerTool({
  name: "xray_import_xray_json",
  description:
    "Import test results in Xray JSON format. Pass the full JSON content as a string. " +
    "Supports optional testExecInfo for execution-level metadata (summary, description, version). " +
    "Use this tool to push Xray-native JSON test results into Xray Cloud.",
  accessLevel: "write",
  inputSchema: z.object({
    content: z
      .string()
      .describe(
        "Xray JSON format test results as a string. Pass the complete JSON content.",
      ),
    projectKey: z.string().optional().describe("Jira project key"),
    testExecKey: z.string().optional().describe("Existing test execution key to update"),
    testPlanKey: z.string().optional().describe("Test plan key to associate results with"),
    testExecInfo: TEST_EXEC_INFO,
    format: FORMAT_PARAM,
  }),
  handler: async (args, _ctx) => {
    const client = args._client as XrayClient;
    const { content, projectKey, testExecKey, testPlanKey, testExecInfo, format } = args as {
      content: string;
      projectKey?: string;
      testExecKey?: string;
      testPlanKey?: string;
      testExecInfo?: {
        summary?: string;
        description?: string;
        projectKey?: string;
        testPlanKey?: string;
        testEnvironments?: string[];
        fixVersion?: string;
        revision?: string;
      };
      format: string;
    };

    const formatter = new ToonFormatter(format as "toon" | "json" | "summary");
    let result: unknown;

    if (testExecInfo) {
      // Multipart mode: results as "application/json" part, testExecInfo as "info" part
      const { body, contentType } = buildMultipartBody([
        { name: "results", content, contentType: "application/json" },
        { name: "info", content: JSON.stringify(testExecInfo), contentType: "application/json" },
      ]);
      result = await client.executeRestRaw("POST", BASE_PATH, body, contentType);
    } else {
      // Simple mode: Xray JSON is the only format using JSON body via regular executeRest
      const queryString = buildQueryParams({
        projectKey: projectKey as string | undefined,
        testExecKey: testExecKey as string | undefined,
        testPlanKey: testPlanKey as string | undefined,
      });
      result = await client.executeRest("POST", `${BASE_PATH}${queryString}`, JSON.parse(content));
    }

    return {
      content: [{ type: "text" as const, text: formatter.format("import_result", result) }],
    };
  },
});
