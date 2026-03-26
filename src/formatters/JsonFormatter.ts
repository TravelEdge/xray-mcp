import type { EntityType } from "../types/index.js";
import type { Formatter } from "./FormatterInterface.js";

/**
 * JSON passthrough formatter — returns full JSON.stringify of data.
 * Useful for debugging, programmatic consumption, or when TOON is not desired.
 * Satisfies TOON-05 (JSON fallback format).
 */
export class JsonFormatter implements Formatter {
  /**
   * Returns the full JSON representation of the entity data (2-space indented).
   * Entity type is ignored — all entities are serialized identically.
   *
   * @param _entityType - Unused; all entity types produce the same JSON output.
   * @param data - Raw entity data to serialize.
   * @returns JSON string with 2-space indentation.
   */
  format(_entityType: EntityType, data: unknown): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Returns the error as a JSON object with code, message, and optional hint fields.
   *
   * @param code - Error code string.
   * @param message - Error message.
   * @param hint - Optional actionable hint.
   * @returns JSON-serialized error object.
   */
  formatError(code: string, message: string, hint?: string): string {
    const error: Record<string, string> = { code, message };
    if (hint) error.hint = hint;
    return JSON.stringify(error, null, 2);
  }
}
