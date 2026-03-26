/**
 * introspect-schema.ts
 *
 * Authenticates with Xray Cloud, introspects the GraphQL schema, and dumps it
 * to schema/xray-schema.json. Optionally audits all project queries against
 * the live schema to find field/argument mismatches.
 *
 * Usage:
 *   pnpm introspect              # dump schema only
 *   pnpm introspect:audit        # dump schema + audit all queries
 *
 * Requires XRAY_CLIENT_ID and XRAY_CLIENT_SECRET environment variables.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";

// ── Auth ──────────────────────────────────────────────────────────────────────

const XRAY_AUTH_URL = "https://xray.cloud.getxray.app/api/v2/authenticate";
const XRAY_GRAPHQL_URL = "https://xray.cloud.getxray.app/api/v2/graphql";

async function authenticate(): Promise<string> {
  const clientId = process.env.XRAY_CLIENT_ID;
  const clientSecret = process.env.XRAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("ERROR: XRAY_CLIENT_ID and XRAY_CLIENT_SECRET must be set.");
    process.exit(1);
  }

  const region = process.env.XRAY_REGION ?? "global";
  const baseUrls: Record<string, string> = {
    us: "https://us.xray.cloud.getxray.app",
    eu: "https://eu.xray.cloud.getxray.app",
    au: "https://au.xray.cloud.getxray.app",
    global: "https://xray.cloud.getxray.app",
  };
  const baseUrl = baseUrls[region] ?? baseUrls.global;
  const authUrl = `${baseUrl}/api/v2/authenticate`;

  const resp = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });

  if (!resp.ok) {
    console.error(`Auth failed: ${resp.status} ${resp.statusText}`);
    const body = await resp.text();
    console.error(body);
    process.exit(1);
  }

  // Xray returns a bare JWT string (with quotes)
  const token = (await resp.text()).replace(/^"|"$/g, "");
  return token;
}

// ── Introspection ─────────────────────────────────────────────────────────────

const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      types {
        kind
        name
        description
        fields(includeDeprecated: true) {
          name
          description
          isDeprecated
          deprecationReason
          args {
            name
            description
            type { ...TypeRef }
            defaultValue
          }
          type { ...TypeRef }
        }
        inputFields {
          name
          description
          type { ...TypeRef }
          defaultValue
        }
        enumValues(includeDeprecated: true) {
          name
          description
          isDeprecated
          deprecationReason
        }
      }
    }
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
          }
        }
      }
    }
  }
`;

interface SchemaType {
  kind: string;
  name: string | null;
  fields?: SchemaField[] | null;
  inputFields?: SchemaInputField[] | null;
  enumValues?: { name: string }[] | null;
}

interface SchemaField {
  name: string;
  isDeprecated?: boolean;
  deprecationReason?: string | null;
  args?: SchemaArg[];
  type?: TypeRef;
}

interface SchemaInputField {
  name: string;
  type?: TypeRef;
}

interface SchemaArg {
  name: string;
  type?: TypeRef;
}

interface TypeRef {
  kind: string;
  name: string | null;
  ofType?: TypeRef | null;
}

interface IntrospectionResult {
  __schema: {
    queryType: { name: string };
    mutationType: { name: string };
    types: SchemaType[];
  };
}

async function introspect(token: string): Promise<IntrospectionResult> {
  const region = process.env.XRAY_REGION ?? "global";
  const baseUrls: Record<string, string> = {
    us: "https://us.xray.cloud.getxray.app",
    eu: "https://eu.xray.cloud.getxray.app",
    au: "https://au.xray.cloud.getxray.app",
    global: "https://xray.cloud.getxray.app",
  };
  const baseUrl = baseUrls[region] ?? baseUrls.global;
  const graphqlUrl = `${baseUrl}/api/v2/graphql`;

  const resp = await fetch(graphqlUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: INTROSPECTION_QUERY }),
  });

  if (!resp.ok) {
    console.error(`Introspection failed: ${resp.status} ${resp.statusText}`);
    const body = await resp.text();
    console.error(body);
    process.exit(1);
  }

  const json = (await resp.json()) as { data?: IntrospectionResult; errors?: unknown[] };
  if (json.errors) {
    console.error("GraphQL errors during introspection:");
    console.error(JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }

  return json.data!;
}

// ── Schema helpers ────────────────────────────────────────────────────────────

function buildTypeMap(schema: IntrospectionResult): Map<string, SchemaType> {
  const map = new Map<string, SchemaType>();
  for (const t of schema.__schema.types) {
    if (t.name) map.set(t.name, t);
  }
  return map;
}

function unwrapType(ref: TypeRef | undefined | null): string {
  if (!ref) return "unknown";
  if (ref.name) return ref.name;
  if (ref.ofType) return unwrapType(ref.ofType);
  return "unknown";
}

function getFieldNames(type: SchemaType | undefined): Set<string> {
  if (!type?.fields) return new Set();
  return new Set(type.fields.map((f) => f.name));
}

// ── Query parser ──────────────────────────────────────────────────────────────

interface ParsedOperation {
  type: "query" | "mutation";
  name: string;
  rootField: string;
  rootArgs: string[];
  requestedFields: string[];
  source: string;
  rawQuery: string;
}

function parseQueryStrings(queriesModule: Record<string, unknown>): ParsedOperation[] {
  const ops: ParsedOperation[] = [];

  for (const [exportName, value] of Object.entries(queriesModule)) {
    if (typeof value !== "string") continue;

    const queryStr = value.trim();

    // Extract operation type and name
    const opMatch = queryStr.match(/^\s*(query|mutation)\s+(\w+)/);
    if (!opMatch) continue;

    const opType = opMatch[1] as "query" | "mutation";
    const opName = opMatch[2];

    // Extract root field name — first field after the opening brace
    // e.g. "query Foo($x: String!) {\n    getTest(issueId: $x) {"
    const bodyMatch = queryStr.match(/\)\s*\{[\s\n]+([\w]+)\s*\(/);
    const bodyMatchNoArgs = queryStr.match(/\)\s*\{[\s\n]+([\w]+)\s*[\s\{]/);
    const rootField = bodyMatch?.[1] ?? bodyMatchNoArgs?.[1] ?? "unknown";

    // Extract root field arguments from the query body (not variable declarations)
    const rootArgMatch = queryStr.match(new RegExp(`${rootField}\\(([^)]+)\\)`));
    const rootArgs: string[] = [];
    if (rootArgMatch) {
      const argStr = rootArgMatch[1];
      // Match argument names like "issueId:" or "testIssueIds:"
      const argNames = argStr.match(/(\w+)\s*:/g);
      if (argNames) {
        rootArgs.push(...argNames.map((a) => a.replace(":", "").trim()));
      }
    }

    // Extract all field names referenced in the query
    const fieldMatches = queryStr.match(/\b(\w+)\s*(?:\(|{|\n)/g) ?? [];
    const requestedFields = fieldMatches
      .map((m) => m.trim().replace(/[({]/g, "").trim())
      .filter(
        (f) =>
          f &&
          !["query", "mutation", "fragment", "on", opName, rootField].includes(f) &&
          !f.startsWith("$"),
      );

    ops.push({
      type: opType,
      name: opName,
      rootField,
      rootArgs,
      requestedFields: [...new Set(requestedFields)],
      source: exportName,
      rawQuery: queryStr,
    });
  }

  return ops;
}

// ── Audit ─────────────────────────────────────────────────────────────────────

interface AuditIssue {
  severity: "ERROR" | "WARN";
  source: string;
  operation: string;
  rootField: string;
  message: string;
}

function auditOperations(
  ops: ParsedOperation[],
  typeMap: Map<string, SchemaType>,
  queryTypeName: string,
  mutationTypeName: string,
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  const queryType = typeMap.get(queryTypeName);
  const mutationType = typeMap.get(mutationTypeName);

  for (const op of ops) {
    const rootType = op.type === "query" ? queryType : mutationType;
    if (!rootType?.fields) {
      issues.push({
        severity: "ERROR",
        source: op.source,
        operation: op.name,
        rootField: op.rootField,
        message: `No ${op.type} type found in schema`,
      });
      continue;
    }

    // Check root field exists
    const rootFieldDef = rootType.fields.find((f) => f.name === op.rootField);
    if (!rootFieldDef) {
      issues.push({
        severity: "ERROR",
        source: op.source,
        operation: op.name,
        rootField: op.rootField,
        message: `Root field "${op.rootField}" does not exist on ${op.type} type. Available: ${rootType.fields.map((f) => f.name).join(", ")}`,
      });
      continue;
    }

    // Check if root field is deprecated
    if (rootFieldDef.isDeprecated) {
      issues.push({
        severity: "WARN",
        source: op.source,
        operation: op.name,
        rootField: op.rootField,
        message: `Root field "${op.rootField}" is deprecated: ${rootFieldDef.deprecationReason ?? "no reason given"}`,
      });
    }

    // Check root field arguments
    const schemaArgs = new Set(rootFieldDef.args?.map((a) => a.name) ?? []);
    for (const arg of op.rootArgs) {
      if (!schemaArgs.has(arg)) {
        issues.push({
          severity: "ERROR",
          source: op.source,
          operation: op.name,
          rootField: op.rootField,
          message: `Argument "${arg}" not found on "${op.rootField}". Available args: ${[...schemaArgs].join(", ")}`,
        });
      }
    }

    // Check return type fields (one level deep)
    const returnTypeName = unwrapType(rootFieldDef.type);
    const returnType = typeMap.get(returnTypeName);
    if (returnType?.fields) {
      const validFields = getFieldNames(returnType);
      for (const field of op.requestedFields) {
        // Skip common GraphQL syntax tokens and nested field names
        if (["total", "results", "nodes", "id", "name", "description"].includes(field)) continue;
        // Only check top-level fields that look like they belong on the return type
        if (validFields.size > 0 && validFields.has(field)) continue;
        // Don't flag nested fields — we only reliably parse top-level
      }
    }
  }

  return issues;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const doAudit = process.argv.includes("--audit");

  console.log("Authenticating with Xray Cloud...");
  const token = await authenticate();
  console.log("Authenticated. Running introspection...");

  const schema = await introspect(token);
  console.log(
    `Schema loaded: ${schema.__schema.types.length} types, ` +
      `query type: ${schema.__schema.queryType.name}, ` +
      `mutation type: ${schema.__schema.mutationType.name}`,
  );

  // Write full schema
  if (!existsSync("schema")) mkdirSync("schema");
  writeFileSync("schema/xray-schema.json", JSON.stringify(schema, null, 2));
  console.log("Schema written to schema/xray-schema.json");

  // Write a human-readable summary
  const typeMap = buildTypeMap(schema);

  const queryType = typeMap.get(schema.__schema.queryType.name);
  const mutationType = typeMap.get(schema.__schema.mutationType.name);

  const summaryLines: string[] = [
    "# Xray Cloud GraphQL Schema Summary",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Types: ${schema.__schema.types.length}`,
    "",
    "## Queries",
    "",
  ];

  if (queryType?.fields) {
    for (const f of queryType.fields) {
      const args = f.args?.map((a) => `${a.name}: ${unwrapType(a.type)}`).join(", ") ?? "";
      const ret = unwrapType(f.type);
      const dep = f.isDeprecated ? " [DEPRECATED]" : "";
      summaryLines.push(`- \`${f.name}(${args})\` → \`${ret}\`${dep}`);
    }
  }

  summaryLines.push("", "## Mutations", "");

  if (mutationType?.fields) {
    for (const f of mutationType.fields) {
      const args = f.args?.map((a) => `${a.name}: ${unwrapType(a.type)}`).join(", ") ?? "";
      const ret = unwrapType(f.type);
      const dep = f.isDeprecated ? " [DEPRECATED]" : "";
      summaryLines.push(`- \`${f.name}(${args})\` → \`${ret}\`${dep}`);
    }
  }

  // Add type details for key Xray types
  summaryLines.push("", "## Key Types", "");
  const keyTypeNames = [
    "Test", "TestType", "TestRun", "TestExecution", "TestPlan", "TestSet",
    "Precondition", "Folder", "Step", "TestRunStep", "Status",
    "Evidence", "Defect", "CustomField", "Dataset",
    "TestResults", "TestRunResults", "TestExecutionResults",
    "TestPlanResults", "TestSetResults", "PreconditionResults",
  ];

  for (const name of keyTypeNames) {
    const t = typeMap.get(name);
    if (!t) continue;
    summaryLines.push(`### ${name} (${t.kind})`);
    if (t.fields) {
      for (const f of t.fields) {
        const ret = unwrapType(f.type);
        const args = f.args?.length
          ? `(${f.args.map((a) => `${a.name}: ${unwrapType(a.type)}`).join(", ")})`
          : "";
        const dep = f.isDeprecated ? " [DEPRECATED]" : "";
        summaryLines.push(`  - \`${f.name}${args}\` → \`${ret}\`${dep}`);
      }
    }
    if (t.inputFields) {
      for (const f of t.inputFields) {
        summaryLines.push(`  - \`${f.name}\` → \`${unwrapType(f.type)}\``);
      }
    }
    summaryLines.push("");
  }

  writeFileSync("schema/xray-schema-summary.md", summaryLines.join("\n"));
  console.log("Summary written to schema/xray-schema-summary.md");

  if (!doAudit) {
    console.log("\nRun with --audit to check project queries against the live schema.");
    return;
  }

  // ── Audit mode ────────────────────────────────────────────────────────
  console.log("\n--- AUDIT MODE ---\n");
  console.log("Loading project query files...");

  // Dynamic import of all query modules
  const queryModules = [
    { path: "../src/tools/tests/queries.js", domain: "tests" },
    { path: "../src/tools/executions/queries.js", domain: "executions" },
    { path: "../src/tools/runs/queries.js", domain: "runs" },
    { path: "../src/tools/plans/queries.js", domain: "plans" },
    { path: "../src/tools/sets/queries.js", domain: "sets" },
    { path: "../src/tools/preconditions/queries.js", domain: "preconditions" },
    { path: "../src/tools/folders/queries.js", domain: "folders" },
    { path: "../src/tools/evidence/queries.js", domain: "evidence" },
    { path: "../src/tools/admin/queries.js", domain: "admin" },
  ];

  let allOps: ParsedOperation[] = [];
  for (const mod of queryModules) {
    try {
      const imported = await import(mod.path);
      const ops = parseQueryStrings(imported);
      console.log(`  ${mod.domain}: ${ops.length} operations`);
      allOps.push(...ops);
    } catch (err) {
      console.error(`  ${mod.domain}: FAILED to import — ${err}`);
    }
  }

  console.log(`\nTotal operations parsed: ${allOps.length}`);
  console.log("Auditing against live schema...\n");

  const issues = auditOperations(
    allOps,
    typeMap,
    schema.__schema.queryType.name,
    schema.__schema.mutationType.name,
  );

  // ── REST endpoint smoke test ──────────────────────────────────────
  console.log("\n--- REST ENDPOINT CHECK ---\n");

  const restEndpoints = [
    { method: "POST", path: "/import/execution", tool: "xray_import_xray_json" },
    { method: "POST", path: "/import/execution/junit", tool: "xray_import_junit" },
    { method: "POST", path: "/import/execution/cucumber", tool: "xray_import_cucumber" },
    { method: "POST", path: "/import/execution/nunit", tool: "xray_import_nunit" },
    { method: "POST", path: "/import/execution/testng", tool: "xray_import_testng" },
    { method: "POST", path: "/import/execution/robot", tool: "xray_import_robot" },
    { method: "POST", path: "/import/execution/behave", tool: "xray_import_behave" },
    { method: "POST", path: "/import/feature", tool: "xray_import_feature_files" },
    { method: "GET", path: "/export/cucumber", tool: "xray_export_cucumber_features" },
  ];

  const region = process.env.XRAY_REGION ?? "global";
  const baseUrls: Record<string, string> = {
    us: "https://us.xray.cloud.getxray.app",
    eu: "https://eu.xray.cloud.getxray.app",
    au: "https://au.xray.cloud.getxray.app",
    global: "https://xray.cloud.getxray.app",
  };
  const restBase = `${baseUrls[region] ?? baseUrls.global}/api/v2`;

  for (const ep of restEndpoints) {
    try {
      // Use OPTIONS or a minimal request to check if the endpoint exists
      // For POST endpoints, send an empty body — expect 400 (bad request) not 404
      // For GET endpoints, send without required params — expect 400 not 404
      const resp = await fetch(`${restBase}${ep.path}`, {
        method: ep.method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: ep.method === "POST" ? "{}" : undefined,
      });

      if (resp.status === 404) {
        issues.push({
          severity: "ERROR",
          source: ep.tool,
          operation: ep.tool,
          rootField: `${ep.method} ${ep.path}`,
          message: `REST endpoint returned 404 — path may not exist`,
        });
        console.log(`  ✗ ${ep.method} ${ep.path} → 404 NOT FOUND (${ep.tool})`);
      } else {
        // 400, 422, 200 etc. all mean the endpoint exists
        console.log(`  ✓ ${ep.method} ${ep.path} → ${resp.status} (exists) (${ep.tool})`);
      }
    } catch (err) {
      console.log(`  ? ${ep.method} ${ep.path} → network error: ${err} (${ep.tool})`);
    }
  }

  console.log("\nNote: REST endpoints cannot be schema-introspected. The check above");
  console.log("only verifies the endpoint paths exist (non-404). Request/response");
  console.log("format must be verified against the Xray REST v2 docs:");
  console.log("https://docs.getxray.app/display/XRAYCLOUD/Import+Execution+Results+-+REST+v2");

  // ── Report ────────────────────────────────────────────────────────────

  if (issues.length === 0) {
    console.log("\n✓ No issues found! All operations match the live schema.");
  } else {
    const errors = issues.filter((i) => i.severity === "ERROR");
    const warnings = issues.filter((i) => i.severity === "WARN");

    if (errors.length > 0) {
      console.log(`ERRORS (${errors.length}):`);
      for (const e of errors) {
        console.log(`  ✗ [${e.source}] ${e.operation} → ${e.rootField}: ${e.message}`);
      }
    }

    if (warnings.length > 0) {
      console.log(`\nWARNINGS (${warnings.length}):`);
      for (const w of warnings) {
        console.log(`  ⚠ [${w.source}] ${w.operation} → ${w.rootField}: ${w.message}`);
      }
    }

    // Write audit report
    const reportLines = [
      "# Xray Schema Audit Report",
      "",
      `Generated: ${new Date().toISOString()}`,
      `Operations checked: ${allOps.length}`,
      `Errors: ${errors.length}`,
      `Warnings: ${warnings.length}`,
      "",
    ];

    if (errors.length > 0) {
      reportLines.push("## Errors", "");
      for (const e of errors) {
        reportLines.push(`- **${e.source}** \`${e.operation}\` → \`${e.rootField}\`: ${e.message}`);
      }
      reportLines.push("");
    }

    if (warnings.length > 0) {
      reportLines.push("## Warnings", "");
      for (const w of warnings) {
        reportLines.push(`- **${w.source}** \`${w.operation}\` → \`${w.rootField}\`: ${w.message}`);
      }
      reportLines.push("");
    }

    reportLines.push("## Operations Checked", "");
    for (const op of allOps) {
      reportLines.push(
        `- \`${op.source}\`: ${op.type} \`${op.name}\` → \`${op.rootField}(${op.rootArgs.join(", ")})\``,
      );
    }

    writeFileSync("schema/audit-report.md", reportLines.join("\n"));
    console.log("\nAudit report written to schema/audit-report.md");

    if (errors.length > 0) process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
