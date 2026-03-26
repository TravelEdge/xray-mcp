import { z } from "zod";

/** Reusable format parameter for every tool (QUAL-02, TOON-01, TOON-05). */
export const FORMAT_PARAM = z
  .enum(["toon", "json", "summary"])
  .default("toon")
  .describe("Response format: toon (compact, default), json (full), summary (one-line)");

/** Format write confirmation for mutations per D-21.
 *  Example: writeConfirmation("CREATED", "PROJ-456", "t:Manual | login flow")
 *  Returns: "OK:CREATED PROJ-456 | t:Manual | login flow"
 */
export function writeConfirmation(
  action: "CREATED" | "UPDATED" | "DELETED",
  key: string,
  details?: string,
): string {
  return details ? `OK:${action} ${key} | ${details}` : `OK:${action} ${key}`;
}

/** Build pagination header per D-20.
 *  Example: paginationHeader("Tests", 0, 50, 234)
 *  Returns: "Tests (1-50 of 234) | next: start=50"
 */
export function paginationHeader(
  entityLabel: string,
  start: number,
  count: number,
  total: number,
): string {
  const end = start + count;
  const nextHint = end < total ? ` | next: start=${end}` : "";
  return `${entityLabel} (${start + 1}-${end} of ${total})${nextHint}`;
}

/** Select TOON or FULL query variant based on format (GQL-05, D-23). */
export function selectQuery<T>(format: string, toonQuery: T, fullQuery: T): T {
  return format === "json" ? fullQuery : toonQuery;
}

/** Build URL query string from optional params using URLSearchParams.
 *  Addresses review concern: use URLSearchParams instead of string concatenation.
 *  Example: buildQueryParams({ projectKey: "PROJ", testExecKey: undefined })
 *  Returns: "?projectKey=PROJ" (omits undefined values)
 */
export function buildQueryParams(params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, value);
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : "";
}

/** Part descriptor for multipart body construction. */
export interface MultipartPart {
  name: string;
  content: string;
  contentType: string;
}

/** Build a multipart/form-data body using string concatenation with a fixed boundary.
 *  Avoids FormData/Blob which have inconsistent behavior in Node.js 22.
 *  Used by import tools that need multipart mode for testExecInfo (REST-02).
 *
 *  Example:
 *    const { body, contentType } = buildMultipartBody([
 *      { name: "results", content: xmlContent, contentType: "application/xml" },
 *      { name: "info", content: JSON.stringify({ summary: "..." }), contentType: "application/json" },
 *    ]);
 *
 *  Returns: { body: string (multipart body), contentType: "multipart/form-data; boundary=xray-boundary" }
 */
export function buildMultipartBody(parts: MultipartPart[]): { body: string; contentType: string } {
  const boundary = "xray-boundary";
  const lines: string[] = [];
  for (const part of parts) {
    lines.push(`--${boundary}\r\n`);
    lines.push(`Content-Disposition: form-data; name="${part.name}"\r\n`);
    lines.push(`Content-Type: ${part.contentType}\r\n\r\n`);
    lines.push(`${part.content}\r\n`);
  }
  lines.push(`--${boundary}--`);
  return {
    body: lines.join(""),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}
