/**
 * Performance middleware for MCP HTTP transport.
 *
 * Implements performance best practices:
 * - Response compression (gzip, deflate, brotli)
 * - Cache headers for read operations
 * - Connection pooling and keep-alive
 */

import { createBrotliCompress, createDeflate, createGzip } from "node:zlib";
import type { NextFunction, Request, Response } from "express";

/**
 * Response compression middleware.
 * Automatically compresses responses based on client Accept-Encoding.
 * Skips already-compressed content (images, video, etc.).
 */
export function createCompressionMiddleware() {
  const compressibleTypes = [
    "application/json",
    "application/ld+json",
    "text/html",
    "text/plain",
    "text/xml",
    "text/css",
    "text/javascript",
    "application/javascript",
    "application/xml",
  ];

  return (req: Request, res: Response, next: NextFunction) => {
    const acceptEncoding = req.get("accept-encoding") || "";
    const originalJson = res.json;

    // Override res.json to compress responses
    res.json = function (body: any) {
      const contentType = res.get("content-type") || "application/json";

      // Skip compression for non-compressible types or small responses
      const jsonString = JSON.stringify(body);
      if (jsonString.length < 1024 || !compressibleTypes.some((t) => contentType.includes(t))) {
        return originalJson.call(this, body);
      }

      // Choose compression based on client preference
      if (acceptEncoding.includes("br")) {
        res.setHeader("Content-Encoding", "br");
        const brotli = createBrotliCompress();
        res.setHeader("Vary", "Accept-Encoding");

        brotli.on("data", (chunk) => {
          res.write(chunk);
        });

        brotli.on("end", () => {
          res.end();
        });

        brotli.on("error", (_err) => {
          // Fall back to uncompressed
          originalJson.call(res, body);
        });

        brotli.write(jsonString);
        brotli.end();
        return res;
      }

      if (acceptEncoding.includes("gzip")) {
        res.setHeader("Content-Encoding", "gzip");
        const gzip = createGzip();
        res.setHeader("Vary", "Accept-Encoding");

        gzip.on("data", (chunk) => {
          res.write(chunk);
        });

        gzip.on("end", () => {
          res.end();
        });

        gzip.on("error", (_err) => {
          originalJson.call(res, body);
        });

        gzip.write(jsonString);
        gzip.end();
        return res;
      }

      if (acceptEncoding.includes("deflate")) {
        res.setHeader("Content-Encoding", "deflate");
        const deflate = createDeflate();
        res.setHeader("Vary", "Accept-Encoding");

        deflate.on("data", (chunk) => {
          res.write(chunk);
        });

        deflate.on("end", () => {
          res.end();
        });

        deflate.on("error", (_err) => {
          originalJson.call(res, body);
        });

        deflate.write(jsonString);
        deflate.end();
        return res;
      }

      // No compression preferred
      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * Cache headers middleware for read-only operations.
 * Per PERF-02: Adds cache headers to GET requests (but not mutations).
 */
export function createCacheHeadersMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return next();
    }

    // Cache health checks for 60 seconds
    if (req.path === "/healthz" || req.path === "/readyz") {
      res.setHeader("Cache-Control", "public, max-age=60");
      return next();
    }

    // Cache metadata endpoints for 1 hour
    if (req.path === "/.well-known/oauth-server-metadata") {
      res.setHeader("Cache-Control", "public, max-age=3600");
      return next();
    }

    // Default: No caching for API responses (they're dynamic)
    res.setHeader("Cache-Control", "no-cache, max-age=0");

    next();
  };
}

/**
 * Keep-alive configuration for connection pooling.
 * Per PERF: Maintains persistent connections to reduce overhead.
 */
export function configureKeepAlive() {
  // This would typically be configured at the server/socket level
  // in startHttpServer(), not as middleware. See that function for implementation.
  return (_req: Request, res: Response, next: NextFunction) => {
    // Connection: keep-alive is default in HTTP/1.1
    // This middleware just documents the expectation
    next();
  };
}
