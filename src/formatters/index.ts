import type { FormatType } from "../types/index.js";
import type { Formatter } from "./FormatterInterface.js";
import { JsonFormatter } from "./JsonFormatter.js";
import { ToonFormatter } from "./ToonFormatter.js";

export type { Formatter } from "./FormatterInterface.js";
export { JsonFormatter } from "./JsonFormatter.js";
export { statusIcon, ToonFormatter } from "./ToonFormatter.js";

// Singleton instances — shared across calls (stateless formatters)
const toonFormatter = new ToonFormatter();
const jsonFormatter = new JsonFormatter();

/**
 * Factory function: return the appropriate Formatter for the given FormatType.
 * "summary" format uses ToonFormatter in single-line mode (new instance per call).
 * "toon" and "json" return shared singleton instances.
 */
export function getFormatter(format: FormatType): Formatter {
  switch (format) {
    case "json":
      return jsonFormatter;
    case "summary":
      return new ToonFormatter("summary");
    default:
      return toonFormatter;
  }
}
