import { z } from "zod";

/** Reusable pagination parameters for list tools (D-20). */
export const PAGINATION_PARAMS = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe("Number of results per page (1-100, default 50)"),
  start: z.number().int().min(0).default(0).describe("Offset for pagination (0-based)"),
};

/** Reusable JQL filter parameter for list tools. */
export const JQL_PARAM = z
  .string()
  .optional()
  .describe("JQL query to filter results (e.g. 'project = PROJ AND status = TODO')");
