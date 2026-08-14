/**
 * REST API Router for xray-mcp
 *
 * Wraps MCP tools as REST endpoints for external integrations.
 * Per RESTAPI-01: All endpoints use the same auth and validation as MCP.
 * Per RESTAPI-02: Follows REST conventions (GET /tests, POST /tests, etc.)
 * Per RESTAPI-03: Returns JSON with consistent error format.
 */

import type { Express, Request, Response } from "express";
import { CredentialStore } from "../auth/index.js";
import type { ToolContext } from "../types/index.js";
import { TOOL_REGISTRY } from "../tools/registry.js";
import { createServer } from "./createServer.js";

/**
 * Mount REST API routes to Express app.
 * Provides RESTful access to all 90 MCP tools.
 */
export function mountRestApi(app: Express): void {
  // /api/v1/health — Simple health check
  app.get("/api/v1/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", version: "1.0" });
  });

  // /api/v1/tools — List all available tools
  app.get("/api/v1/tools", (_req: Request, res: Response) => {
    const tools = TOOL_REGISTRY.map((tool) => ({
      name: tool.name,
      description: tool.description,
      accessLevel: tool.accessLevel,
    }));
    res.json({ tools, total: tools.length });
  });

  // /api/v1/tools/:toolName — Get tool details
  app.get("/api/v1/tools/:toolName", (req: Request, res: Response) => {
    const tool = TOOL_REGISTRY.find((t) => t.name === req.params.toolName);
    if (!tool) {
      return res.status(404).json({
        error: "not_found",
        error_description: `Tool ${req.params.toolName} not found`,
      });
    }
    res.json({
      name: tool.name,
      description: tool.description,
      accessLevel: tool.accessLevel,
    });
  });

  // /api/v1/call/:toolName — Call any MCP tool via REST
  app.post("/api/v1/call/:toolName", async (req: Request, res: Response) => {
    try {
      const { toolName } = req.params;
      const { args, format } = req.body;

      // Find tool
      const tool = TOOL_REGISTRY.find((t) => t.name === toolName);
      if (!tool) {
        return res.status(404).json({
          error: "not_found",
          error_description: `Tool ${toolName} not found`,
        });
      }

      // Validate input with Zod schema
      const validatedArgs = tool.inputSchema.parse(args || {});

      // Extract credentials from headers
      const credentialStore = new CredentialStore();
      const clientId = req.headers["x-xray-client-id"] as string | undefined;
      const clientSecret = req.headers["x-xray-client-secret"] as string | undefined;
      const auth = credentialStore.resolveFromHeaders({ clientId, clientSecret });

      // Build tool context
      const ctx: ToolContext = {
        auth,
        format: (format as "toon" | "json" | "summary") || "json",
      };

      // Call the handler
      const result = await tool.handler(validatedArgs, ctx);
    } catch (error) {
      const statusCode = error instanceof Error && "statusCode" in error ? (error as any).statusCode : 400;
      res.status(statusCode).json({
        error: "bad_request",
        error_description: error instanceof Error ? error.message : "Tool execution failed",
        tool: req.params.toolName,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // /api/v1/tests — Test operations (convenience endpoints)
  app.get("/api/v1/tests", async (req: Request, res: Response) => {
    try {
      const projectKey = req.query.projectKey as string | undefined;
      if (!projectKey) {
        return res.status(400).json({
          error: "bad_request",
          error_description: "Missing required parameter: projectKey",
        });
      }

      // Call xray_list_tests tool
      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_list_tests");
      if (!tool) {
        return res.status(500).json({
          error: "server_error",
          error_description: "Tool xray_list_tests not found",
        });
      }

      const credentialStore = new CredentialStore();
      const clientId = req.headers["x-xray-client-id"] as string | undefined;
      const clientSecret = req.headers["x-xray-client-secret"] as string | undefined;
      const auth = credentialStore.resolveFromHeaders({ clientId, clientSecret });
      const server = createServer({ credentialOverride: auth });

      const ctx: ToolContext = {
        auth,
        format: "json",
      };

      const result = await tool.handler({ projectKey }, ctx);
      res.json({ tests: result, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Failed to list tests",
      });
    }
  });

  // /api/v1/tests/:testKey — Get test details
  app.get("/api/v1/tests/:testKey", async (req: Request, res: Response) => {
    try {
      const { testKey } = req.params;

      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_get_test");
      if (!tool) {
        return res.status(500).json({
          error: "server_error",
          error_description: "Tool xray_get_test not found",
        });
      }

      const credentialStore = new CredentialStore();
      const clientId = req.headers["x-xray-client-id"] as string | undefined;
      const clientSecret = req.headers["x-xray-client-secret"] as string | undefined;
      const auth = credentialStore.resolveFromHeaders({ clientId, clientSecret });
      const server = createServer({ credentialOverride: auth });

      const ctx: ToolContext = {
        auth,
        format: "json",
      };

      const result = await tool.handler({ testKey }, ctx);
      res.json({ test: result, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Failed to get test",
      });
    }
  });

  // /api/v1/runs — Test run operations
  app.get("/api/v1/runs", async (req: Request, res: Response) => {
    try {
      const executionKey = req.query.executionKey as string | undefined;
      if (!executionKey) {
        return res.status(400).json({
          error: "bad_request",
          error_description: "Missing required parameter: executionKey",
        });
      }

      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_list_test_runs");
      if (!tool) {
        return res.status(500).json({
          error: "server_error",
          error_description: "Tool xray_list_test_runs not found",
        });
      }

      const credentialStore = new CredentialStore();
      const clientId = req.headers["x-xray-client-id"] as string | undefined;
      const clientSecret = req.headers["x-xray-client-secret"] as string | undefined;
      const auth = credentialStore.resolveFromHeaders({ clientId, clientSecret });
      const server = createServer({ credentialOverride: auth });

      const ctx: ToolContext = {
        auth,
        format: "json",
      };

      const result = await tool.handler({ executionKey }, ctx);
      res.json({ runs: result, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Failed to list runs",
      });
    }
  });

  // /api/v1/runs/:runId — Get test run details
  app.get("/api/v1/runs/:runId", async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;

      const tool = TOOL_REGISTRY.find((t) => t.name === "xray_get_test_run");
      if (!tool) {
        return res.status(500).json({
          error: "server_error",
          error_description: "Tool xray_get_test_run not found",
        });
      }

      const credentialStore = new CredentialStore();
      const clientId = req.headers["x-xray-client-id"] as string | undefined;
      const clientSecret = req.headers["x-xray-client-secret"] as string | undefined;
      const auth = credentialStore.resolveFromHeaders({ clientId, clientSecret });
      const server = createServer({ credentialOverride: auth });

      const ctx: ToolContext = {
        auth,
        format: "json",
      };

      const result = await tool.handler({ testRunId: runId }, ctx);
      res.json({ run: result, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Failed to get run",
      });
    }
  });
}
