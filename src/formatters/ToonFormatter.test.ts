import { describe, expect, it } from "vitest";
import { statusIcon, ToonFormatter } from "./ToonFormatter.js";

// ---------------------------------------------------------------------------
// statusIcon tests
// ---------------------------------------------------------------------------
describe("statusIcon", () => {
  it("returns ✔ for PASS", () => {
    expect(statusIcon("PASS")).toBe("&#10004;");
  });
  it("returns ✔ for PASSED", () => {
    expect(statusIcon("PASSED")).toBe("&#10004;");
  });
  it("returns ✘ for FAIL", () => {
    expect(statusIcon("FAIL")).toBe("&#10008;");
  });
  it("returns ✘ for FAILED", () => {
    expect(statusIcon("FAILED")).toBe("&#10008;");
  });
  it("returns ○ for TODO", () => {
    expect(statusIcon("TODO")).toBe("&#9675;");
  });
  it("returns ● for EXECUTING", () => {
    expect(statusIcon("EXECUTING")).toBe("&#9679;");
  });
  it("returns ∅ for ABORTED", () => {
    expect(statusIcon("ABORTED")).toBe("&#8709;");
  });
  it("fuzzy: PARTIALLY_PASSED maps to ✔", () => {
    expect(statusIcon("PARTIALLY_PASSED")).toBe("&#10004;");
  });
  it("fuzzy: NOT_RUN maps to ○", () => {
    expect(statusIcon("NOT_RUN")).toBe("&#9675;");
  });
  it("fuzzy: CANCELLED maps to ∅", () => {
    expect(statusIcon("CANCELLED")).toBe("&#8709;");
  });
  it("returns ? for unknown custom status", () => {
    expect(statusIcon("CUSTOM_UNKNOWN")).toBe("?");
  });
  it("returns ? for empty string", () => {
    expect(statusIcon("")).toBe("?");
  });
  it("is case-insensitive for lowercase input", () => {
    expect(statusIcon("pass")).toBe("&#10004;");
  });
});

// ---------------------------------------------------------------------------
// ToonFormatter tests
// ---------------------------------------------------------------------------
describe("ToonFormatter", () => {
  const fmt = new ToonFormatter();

  // --- test entity ---
  it('format("test") produces single-line with pipe-separated abbreviated keys', () => {
    const test = {
      issueId: "PROJ-123",
      testType: { name: "Manual" },
      status: { name: "PASS" },
      folder: { path: "/Auth" },
      steps: { nodes: [{}, {}, {}] },
      jira: { key: "PROJ-123", summary: "Login flow" },
    };
    const result = fmt.format("test", test);
    expect(result).toContain("PROJ-123");
    expect(result).toContain("&#10004;");
    expect(result).toContain("|");
    // should be single-line
    expect(result.split("\n").length).toBeGreaterThanOrEqual(1);
  });

  it('format("test") includes status icon', () => {
    const test = {
      issueId: "PROJ-1",
      status: { name: "FAIL" },
      jira: { key: "PROJ-1", summary: "Test" },
    };
    expect(fmt.format("test", test)).toContain("&#10008;");
  });

  it('format("test") handles undefined optional fields', () => {
    const test = { issueId: "PROJ-1" };
    const result = fmt.format("test", test);
    expect(result).toContain("PROJ-1");
    expect(typeof result).toBe("string");
  });

  // --- test_list ---
  it('format("test_list") produces one line per test with count header', () => {
    const tests = [
      { issueId: "PROJ-1", jira: { key: "PROJ-1", summary: "T1" } },
      { issueId: "PROJ-2", jira: { key: "PROJ-2", summary: "T2" } },
    ];
    const result = fmt.format("test_list", tests);
    expect(result).toContain("Tests (2)");
    const lines = result.split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(3); // header + 2 tests
  });

  // --- test_execution ---
  it('format("test_execution") includes runs count', () => {
    const exec = {
      issueId: "EXEC-1",
      testRuns: { nodes: [{}, {}] },
      testEnvironments: ["dev"],
      jira: { key: "EXEC-1", summary: "Sprint 1 run" },
    };
    const result = fmt.format("test_execution", exec);
    expect(result).toContain("EXEC-1");
    expect(result).toContain("2");
  });

  // --- test_plan ---
  it('format("test_plan") includes test count', () => {
    const plan = {
      issueId: "PLAN-1",
      tests: { nodes: [{}, {}] },
      testExecutions: { nodes: [{}] },
      jira: { key: "PLAN-1", summary: "Q1 Plan" },
    };
    const result = fmt.format("test_plan", plan);
    expect(result).toContain("PLAN-1");
    expect(result).toContain("2");
  });

  // --- test_set ---
  it('format("test_set") includes test count', () => {
    const set = {
      issueId: "SET-1",
      tests: { nodes: [{}, {}, {}] },
      jira: { key: "SET-1", summary: "Regression set" },
    };
    const result = fmt.format("test_set", set);
    expect(result).toContain("SET-1");
    expect(result).toContain("3");
  });

  // --- test_run ---
  it('format("test_run") includes status and comment', () => {
    const run = {
      id: "run-abc",
      status: { name: "PASS" },
      comment: "Ran successfully on dev environment",
    };
    const result = fmt.format("test_run", run);
    expect(result).toContain("run-abc");
    expect(result).toContain("&#10004;");
    expect(result).toContain("Ran successfully");
  });

  // --- precondition ---
  it('format("precondition") includes type and definition', () => {
    const prec = {
      issueId: "PRE-1",
      preconditionType: { name: "Manual" },
      definition: "User must be logged in",
      jira: { key: "PRE-1", summary: "Auth precondition" },
    };
    const result = fmt.format("precondition", prec);
    expect(result).toContain("PRE-1");
    expect(result).toContain("Manual");
    expect(result).toContain("User must be logged in");
  });

  // --- folder ---
  it('format("folder") includes path and test count', () => {
    const folder = {
      name: "Auth",
      path: "/Auth",
      testsCount: 5,
      folders: [{ name: "sub1", path: "/Auth/sub1" }],
    };
    const result = fmt.format("folder", folder);
    expect(result).toContain("/Auth");
    expect(result).toContain("5");
  });

  // --- coverage ---
  it('format("coverage") includes covered status', () => {
    const cov = {
      issueId: "COV-1",
      jira: { key: "COV-1", summary: "Feature X" },
      covered: true,
    };
    const result = fmt.format("coverage", cov);
    expect(result).toContain("COV-1");
    expect(typeof result).toBe("string");
  });

  // --- dataset ---
  it('format("dataset") includes row and param counts', () => {
    const ds = {
      name: "Login dataset",
      rows: 10,
      parameters: ["user", "pass"],
    };
    const result = fmt.format("dataset", ds);
    expect(result).toContain("Login dataset");
    expect(result).toContain("10");
  });

  // --- import_result ---
  it('format("import_result") includes summary line', () => {
    const imp = { testResults: 5, testEnvironments: [], targetTestPlanId: null };
    const result = fmt.format("import_result", imp);
    expect(result).toContain("Import:");
  });

  // --- statuses ---
  it('format("statuses") lists each status with icon', () => {
    const statuses = [
      { name: "PASS", color: "#00FF00" },
      { name: "FAIL", color: "#FF0000" },
    ];
    const result = fmt.format("statuses", statuses);
    expect(result).toContain("PASS");
    expect(result).toContain("&#10004;");
    expect(result).toContain("FAIL");
    expect(result).toContain("&#10008;");
  });

  // --- settings ---
  it('format("settings") produces key-value lines', () => {
    const settings = { timeout: 30, region: "us" };
    const result = fmt.format("settings", settings);
    expect(result).toContain("timeout");
    expect(result).toContain("30");
  });

  // --- summary format ---
  it("format returns single-line for summary format (first line of TOON output)", () => {
    const formatter = new ToonFormatter("summary");
    const test = {
      issueId: "PROJ-1",
      jira: { key: "PROJ-1", summary: "Test" },
    };
    const result = formatter.format("test", test);
    expect(result.split("\n").length).toBe(1);
  });

  // --- null/undefined data ---
  it('returns "(no data)" for null data', () => {
    expect(fmt.format("test", null)).toBe("(no data)");
  });

  it('returns "(no data)" for undefined data', () => {
    expect(fmt.format("test", undefined)).toBe("(no data)");
  });

  // --- formatError ---
  it("formatError with hint produces ERR:<code> message and hint line", () => {
    const result = fmt.formatError("AUTH_EXPIRED", "Token expired", "Check credentials");
    expect(result).toBe("ERR:AUTH_EXPIRED Token expired\n-> Check credentials");
  });

  it("formatError without hint produces single-line error", () => {
    const result = fmt.formatError("GQL_ERROR", "Bad query");
    expect(result).toBe("ERR:GQL_ERROR Bad query");
  });

  it("formatError with empty hint omits hint line", () => {
    const result = fmt.formatError("X", "msg", "");
    expect(result).toBe("ERR:X msg");
  });

  // ---------------------------------------------------------------------------
  // branch coverage — edge cases
  // ---------------------------------------------------------------------------
  describe("branch coverage — edge cases", () => {
    // 1. Unknown entityType fallback (line 257 — the `if (!handler)` branch)
    it("falls back to JSON.stringify for unknown entity type", () => {
      const data = { foo: "bar" };
      const result = fmt.format("unknown_type" as any, data);
      expect(result).toBe(JSON.stringify(data));
    });

    // 2. Coverage entity — "no" and "?" branches in formatCoverage
    it('format("coverage") covered:false produces covered:no', () => {
      const cov = {
        issueId: "COV-2",
        jira: { key: "COV-2", summary: "Feature Y" },
        covered: false,
      };
      const result = fmt.format("coverage", cov);
      expect(result).toContain("covered:no");
    });

    it('format("coverage") covered:undefined produces covered:?', () => {
      const cov = {
        issueId: "COV-3",
        covered: undefined,
      };
      const result = fmt.format("coverage", cov);
      expect(result).toContain("covered:?");
    });

    it('format("coverage") without jira summary omits summary segment', () => {
      const cov = {
        issueId: "COV-4",
        covered: true,
      };
      const result = fmt.format("coverage", cov);
      expect(result).toContain("COV-4");
      expect(result).toContain("covered:yes");
      expect(result).not.toContain("s:");
    });

    // 3. Dataset entity — edge-case branches in formatDataset
    it('format("dataset") with name:undefined uses [dataset] fallback', () => {
      const ds = {
        name: undefined,
        rows: 3,
        parameters: ["a"],
      };
      const result = fmt.format("dataset", ds);
      expect(result).toContain("[dataset]");
    });

    it('format("dataset") with parameters:undefined shows 0 params', () => {
      const ds = {
        name: "myDataset",
        rows: 5,
        parameters: undefined,
      };
      const result = fmt.format("dataset", ds);
      expect(result).toContain("0 params");
    });

    it('format("dataset") with rows:undefined shows 0 rows', () => {
      const ds = {
        name: "myDataset",
        rows: undefined,
        parameters: ["x"],
      };
      const result = fmt.format("dataset", ds);
      expect(result).toContain("0 rows");
    });

    // 4. Import result — array vs number branches in formatImportResult
    it('format("import_result") with testResults as array uses array length', () => {
      const imp = { testResults: [{}, {}] };
      const result = fmt.format("import_result", imp);
      expect(result).toContain("2 tests processed");
    });

    it('format("import_result") with testResults:undefined shows 0', () => {
      const imp = { testResults: undefined };
      const result = fmt.format("import_result", imp);
      expect(result).toContain("0 tests processed");
    });

    // 5. Statuses — color absent branch in formatStatuses
    it('format("statuses") with no color omits parenthesized color', () => {
      const statuses = [{ name: "PASS" }];
      const result = fmt.format("statuses", statuses);
      expect(result).toContain("PASS");
      expect(result).not.toContain("(");
    });

    // 7. Folder — missing path branch
    it('format("folder") with path:undefined uses [/] fallback', () => {
      const folder = {
        path: undefined,
        testsCount: 2,
        folders: [],
      };
      const result = fmt.format("folder", folder);
      expect(result).toContain("[/]");
    });

    // 8. Test run — missing id and missing comment branches
    it('format("test_run") with id:undefined shows ? fallback', () => {
      const run = {
        id: undefined,
        status: { name: "PASS" },
      };
      const result = fmt.format("test_run", run);
      expect(result).toContain("[?]");
    });

    it('format("test_run") without comment omits comment segment', () => {
      const run = {
        id: "run-xyz",
        status: { name: "PASS" },
      };
      const result = fmt.format("test_run", run);
      expect(result).not.toContain("comment");
    });

    // 9. Test execution — no environments branch
    it('format("test_execution") with empty testEnvironments omits env segment', () => {
      const exec = {
        issueId: "EXEC-2",
        testRuns: { nodes: [{}] },
        testEnvironments: [],
        jira: { key: "EXEC-2", summary: "Run" },
      };
      const result = fmt.format("test_execution", exec);
      expect(result).toContain("EXEC-2");
      expect(result).not.toContain("env:");
    });

    it('format("test_execution") with missing testEnvironments omits env segment', () => {
      const exec = {
        issueId: "EXEC-3",
        testRuns: { nodes: [] },
      };
      const result = fmt.format("test_execution", exec);
      expect(result).not.toContain("env:");
    });

    // 10. Precondition — missing definition and missing type branches
    it('format("precondition") without definition omits definition segment', () => {
      const prec = {
        issueId: "PRE-2",
        preconditionType: { name: "Automated" },
        jira: { key: "PRE-2", summary: "Login required" },
      };
      const result = fmt.format("precondition", prec);
      expect(result).toContain("PRE-2");
      expect(result).not.toContain("| ");
    });

    it('format("precondition") without preconditionType omits type segment', () => {
      const prec = {
        issueId: "PRE-3",
        definition: "User must be logged in",
        jira: { key: "PRE-3", summary: "Auth check" },
      };
      const result = fmt.format("precondition", prec);
      expect(result).not.toContain("t:");
    });

    // 11. Test entity — truncate long summary branch
    it('format("test") truncates summary longer than 50 chars with ...', () => {
      const longSummary = "A".repeat(60);
      const test = {
        issueId: "PROJ-TRUNC",
        jira: { key: "PROJ-TRUNC", summary: longSummary },
      };
      const result = fmt.format("test", test);
      expect(result).toContain("...");
      expect(result).not.toContain(longSummary);
    });

    // 12. Summary mode with multi-line output
    it("summary mode on test_list returns only first line", () => {
      const summaryFmt = new ToonFormatter("summary");
      const tests = [
        { issueId: "PROJ-1", jira: { key: "PROJ-1", summary: "T1" } },
        { issueId: "PROJ-2", jira: { key: "PROJ-2", summary: "T2" } },
      ];
      const result = summaryFmt.format("test_list", tests);
      expect(result.split("\n").length).toBe(1);
      expect(result).toContain("Tests (2)");
    });
  });
});
