import type { EntityType } from "../types/index.js";

/**
 * Interface for response formatters.
 * Implementations transform Xray API data into output strings for MCP tool responses.
 * Two implementations: ToonFormatter (compact TOON notation) and JsonFormatter (raw JSON).
 */
export interface Formatter {
  /**
   * Formats an Xray entity into an output string.
   *
   * @param entityType - Discriminator for entity template selection.
   * @param data - Raw entity data from Xray API response.
   * @returns Formatted string representation of the entity.
   */
  format(entityType: EntityType, data: unknown): string;

  /**
   * Formats an error into an output string.
   *
   * @param code - Error code (e.g., "AUTH_FAILED", "NOT_FOUND").
   * @param message - Human-readable error message.
   * @param hint - Optional actionable hint for the user (e.g., "Set XRAY_CLIENT_ID env var").
   * @returns Formatted error string.
   */
  formatError(code: string, message: string, hint?: string): string;
}
