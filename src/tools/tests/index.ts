// Side-effect barrel: importing this file registers all 13 test tool handlers
// with the TOOL_REGISTRY (D-25 pattern).

import "./getTestDetails.js";
import "./getExpandedTest.js";
import "./listTests.js";
import "./listExpandedTests.js";
import "./createTest.js";
import "./deleteTest.js";
import "./updateTestType.js";
import "./updateGherkinDefinition.js";
import "./updateUnstructuredDefinition.js";
import "./addTestStep.js";
import "./updateTestStep.js";
import "./removeTestStep.js";
import "./removeAllTestSteps.js";
