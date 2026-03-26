// Side-effect imports: each file calls registerTool() at module scope (D-25).
// 4 read tools
import "./getTestRun.js";
import "./getTestRunById.js";
import "./listTestRuns.js";
import "./listTestRunsById.js";
// 10 write tools (created in Task 2)
import "./updateTestRunStatus.js";
import "./updateTestRunComment.js";
import "./updateTestRun.js";
import "./resetTestRun.js";
import "./updateStepStatus.js";
import "./updateStepComment.js";
import "./updateTestRunStep.js";
import "./updateExampleStatus.js";
import "./updateIterationStatus.js";
import "./setTestRunTimer.js";
