import type { EntityType } from "../types/index.js";

export interface Formatter {
  format(entityType: EntityType, data: unknown): string;
  formatError(code: string, message: string, hint?: string): string;
}
