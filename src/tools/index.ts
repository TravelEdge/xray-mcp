// Re-export registry utilities (keep existing)
export { registerTool, TOOL_ACCESS_MAP, TOOL_REGISTRY } from "./registry.js";

// Side-effect imports: each entity index.ts imports its tool files,
// triggering registerTool() calls at module scope (D-25).
import "./tests/index.js";
import "./executions/index.js";
import "./plans/index.js";
import "./sets/index.js";
import "./runs/index.js";
import "./preconditions/index.js";
import "./folders/index.js";
import "./evidence/index.js";
import "./imports/index.js";
import "./admin/index.js";
