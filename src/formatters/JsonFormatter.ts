import type { EntityType } from "../types/index.js";
import type { Formatter } from "./FormatterInterface.js";

/**
 * JSON passthrough formatter — returns full JSON.stringify of data.
 * Useful for debugging, programmatic consumption, or when TOON is not desired.
 * Satisfies TOON-05 (JSON fallback format).
 */
export class JsonFormatter implements Formatter {
  format(_entityType: EntityType, data: unknown): string {
    return JSON.stringify(data, null, 2);
  }

  formatError(code: string, message: string, hint?: string): string {
    const error: Record<string, string> = { code, message };
    if (hint) error.hint = hint;
    return JSON.stringify(error, null, 2);
  }
}
