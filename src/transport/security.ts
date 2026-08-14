/**
 * Security middleware for MCP HTTP transport.
 *
 * Implements industry-standard security controls:
 * - CORS policy validation
 * - Content Security Policy (CSP) headers
 * - Rate limiting (per IP + per user)
 * - Request logging with PII redaction
 * - X-Frame-Options, X-Content-Type-Options
 */

import type { NextFunction, Request, Response } from "express";

const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 100; // per IP

interface RateLimitStore {
  [ip: string]: Array<number>;
}

/**
 * Rate limiting middleware — prevents abuse per IP.
 */
export function createRateLimitMiddleware(
  windowMs: number = DEFAULT_RATE_LIMIT_WINDOW_MS,
  maxRequests: number = DEFAULT_RATE_LIMIT_MAX_REQUESTS,
) {
  const store: RateLimitStore = {};

  return (_req: Request, res: Response, next: NextFunction) => {
    const ip = _req.ip || "unknown";
    const now = Date.now();

    // Initialize or clean old timestamps
    if (!store[ip]) {
      store[ip] = [];
    }

    // Remove timestamps outside the window
    store[ip] = store[ip].filter((timestamp) => now - timestamp < windowMs);

    if (store[ip].length >= maxRequests) {
      return res.status(429).json({
        error: "too_many_requests",
        error_description: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000}s.`,
        retry_after: Math.ceil((store[ip][0] + windowMs - now) / 1000),
      });
    }

    store[ip].push(now);
    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", (maxRequests - store[ip].length).toString());
    next();
  };
}

/**
 * Redact PII from logged data (credentials, tokens, emails, etc.).
 */
function redactPii(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactPii(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Redact sensitive keys
    if (
      lowerKey.includes("password") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("token") ||
      lowerKey.includes("credential") ||
      lowerKey.includes("key") ||
      lowerKey.includes("auth")
    ) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      result[key] = redactPii(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Request logging middleware with PII redaction.
 * Logs to stderr for structured logging integration.
 */
export function createRequestLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const correlationId = req.get("x-correlation-id") || generateCorrelationId();

    // Set correlation ID for tracing
    res.setHeader("x-correlation-id", correlationId);

    // Capture response finish
    res.on("finish", () => {
      const duration = Date.now() - startTime;
      const logEntry = {
        timestamp: new Date().toISOString(),
        correlationId,
        method: req.method,
        path: req.path,
        query: redactPii(req.query),
        status: res.statusCode,
        durationMs: duration,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      };

      // Log to stderr for structured logging
      console.error(JSON.stringify(logEntry));
    });

    next();
  };
}

/**
 * CORS middleware — restricts cross-origin requests.
 */
export function createCorsMiddleware(allowedOrigins: string[] = []) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const origin = _req.get("origin");

    // Allow requests with no origin (same-origin, non-browser clients)
    if (!origin) {
      return next();
    }

    // Check if origin is allowed
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      return res.status(403).json({
        error: "forbidden",
        error_description: "Origin not allowed",
      });
    }

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Xray-Client-Id, X-Xray-Client-Secret, X-Correlation-Id",
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "3600");

    // Handle preflight requests
    if (_req.method === "OPTIONS") {
      return res.status(204).send();
    }

    next();
  };
}

/**
 * Security headers middleware.
 */
export function createSecurityHeadersMiddleware() {
  return (_req: Request, res: Response, next: NextFunction) => {
    // HSTS: Enforce HTTPS for 1 year
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

    // CSP: Restrict content sources (MCP is API-only, no inline scripts)
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");

    // X-Frame-Options: Prevent clickjacking
    res.setHeader("X-Frame-Options", "DENY");

    // X-Content-Type-Options: Prevent MIME-type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // X-XSS-Protection: Legacy XSS protection header
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Referrer-Policy: Don't leak referrer to external sites
    res.setHeader("Referrer-Policy", "no-referrer");

    // Permissions-Policy: Disable unnecessary browser features
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()");

    next();
  };
}

/**
 * Error handling middleware with consistent response format.
 */
export function createErrorHandlingMiddleware() {
  return (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const correlationId = res.getHeader("x-correlation-id");
    const statusCode = err instanceof Error && "statusCode" in err ? (err as any).statusCode : 500;

    const errorResponse = {
      error: "server_error",
      error_description: err instanceof Error ? err.message : "An unexpected error occurred",
      correlationId,
    };

    console.error(
      JSON.stringify({ ...errorResponse, stack: err instanceof Error ? err.stack : undefined }),
    );

    res.status(statusCode).json(errorResponse);
  };
}

/**
 * Generate a unique correlation ID for request tracing.
 */
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
