# Xray MCP REST API

The REST API provides programmatic HTTP access to all 90 MCP tools for external integrations, CI/CD pipelines, webhooks, and non-LLM clients.

## Quick Start

### Base URL
```
https://xray-mcp.dev.triparcdev.com
```

### Authentication

All requests require either:

**Option 1: Header-based (Recommended)**
```bash
curl -X POST https://xray-mcp.dev.triparcdev.com/api/v1/call/xray_get_test \
  -H "X-Xray-Client-Id: YOUR_CLIENT_ID" \
  -H "X-Xray-Client-Secret: YOUR_CLIENT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"args": {"testKey": "PROJ-123"}}'
```

**Option 2: OAuth2 (for browser/web apps)**
```bash
# Step 1: Get authorization code
curl "https://xray-mcp.dev.triparcdev.com/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=https://myapp.com/callback&code_challenge=CHALLENGE&code_challenge_method=S256&state=STATE"

# Step 2: Exchange for access token
curl -X POST https://xray-mcp.dev.triparcdev.com/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTH_CODE",
    "client_id": "YOUR_CLIENT_ID",
    "redirect_uri": "https://myapp.com/callback",
    "code_verifier": "VERIFIER"
  }'

# Step 3: Use token
curl -X POST https://xray-mcp.dev.triparcdev.com/api/v1/call/xray_get_test \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"args": {"testKey": "PROJ-123"}}'
```

## Core Endpoints

### Health Check
```bash
GET /api/v1/health
```

Response:
```json
{
  "status": "ok",
  "version": "1.0"
}
```

### List All Tools
```bash
GET /api/v1/tools
```

Response:
```json
{
  "tools": [
    {
      "name": "xray_get_test",
      "description": "Get test details",
      "accessLevel": "read"
    },
    ...
  ],
  "total": 90
}
```

### Get Tool Details
```bash
GET /api/v1/tools/:toolName

# Example
GET /api/v1/tools/xray_get_test
```

Response:
```json
{
  "name": "xray_get_test",
  "description": "Get test details",
  "accessLevel": "read"
}
```

### Execute Any Tool
```bash
POST /api/v1/call/:toolName

# Example
POST /api/v1/call/xray_get_test
```

Headers:
```
X-Xray-Client-Id: YOUR_CLIENT_ID
X-Xray-Client-Secret: YOUR_CLIENT_SECRET
Content-Type: application/json
```

Request body:
```json
{
  "args": {
    "testKey": "PROJ-123"
  },
  "format": "json"
}
```

Response:
```json
{
  "tool": "xray_get_test",
  "status": "success",
  "result": {
    "key": "PROJ-123",
    "name": "Test Name",
    "status": "PASS",
    ...
  },
  "timestamp": "2024-01-15T14:30:00Z"
}
```

## Convenience Endpoints

### List Tests
```bash
GET /api/v1/tests?projectKey=PROJ
```

Response:
```json
{
  "tests": [
    { "key": "PROJ-1", "name": "Test 1", ... },
    { "key": "PROJ-2", "name": "Test 2", ... }
  ],
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### Get Test Details
```bash
GET /api/v1/tests/:testKey
```

Response:
```json
{
  "test": {
    "key": "PROJ-123",
    "name": "Login test",
    "status": "PASS",
    ...
  },
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### List Test Runs
```bash
GET /api/v1/runs?executionKey=PROJ-EXEC-1
```

Response:
```json
{
  "runs": [
    { "id": "run-1", "testKey": "PROJ-123", "status": "PASS", ... },
    { "id": "run-2", "testKey": "PROJ-124", "status": "FAIL", ... }
  ],
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### Get Test Run Details
```bash
GET /api/v1/runs/:runId
```

Response:
```json
{
  "run": {
    "id": "run-1",
    "testKey": "PROJ-123",
    "status": "PASS",
    "duration": 1234,
    ...
  },
  "timestamp": "2024-01-15T14:30:00Z"
}
```

## Response Formats

The API supports three response formats via the `format` parameter:

### 1. JSON (Default)
```json
{
  "tool": "xray_get_test",
  "status": "success",
  "result": {
    "key": "PROJ-123",
    "name": "Test Name",
    "status": "PASS"
  }
}
```

### 2. TOON (Token-Optimized)
```
xray_get_test: PROJ-123 / Test Name [PASS]
```

Use `"format": "toon"` in request body.

### 3. Summary (One-liner)
```
Test PROJ-123 (Test Name) is PASS
```

Use `"format": "summary"` in request body.

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "error_code",
  "error_description": "Human-readable error message",
  "tool": "tool_name",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `not_found` | 404 | Tool or resource not found |
| `bad_request` | 400 | Invalid input or missing required parameter |
| `unauthorized` | 401 | Missing or invalid credentials |
| `forbidden` | 403 | Insufficient permissions |
| `rate_limited` | 429 | Rate limit exceeded (100 req/60s) |
| `server_error` | 500 | Internal server error |

## Examples

### Node.js

```javascript
const https = require('https');

async function callTool(toolName, args) {
  const options = {
    hostname: 'xray-mcp.dev.triparcdev.com',
    path: `/api/v1/call/${toolName}`,
    method: 'POST',
    headers: {
      'X-Xray-Client-Id': process.env.XRAY_CLIENT_ID,
      'X-Xray-Client-Secret': process.env.XRAY_CLIENT_SECRET,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(JSON.stringify({ args, format: 'json' }));
    req.end();
  });
}

// Usage
await callTool('xray_get_test', { testKey: 'PROJ-123' });
```

### Python

```python
import requests
import os

def call_tool(tool_name, args, format='json'):
    """Call an xray-mcp tool via REST API."""
    url = f'https://xray-mcp.dev.triparcdev.com/api/v1/call/{tool_name}'
    
    headers = {
        'X-Xray-Client-Id': os.environ['XRAY_CLIENT_ID'],
        'X-Xray-Client-Secret': os.environ['XRAY_CLIENT_SECRET'],
        'Content-Type': 'application/json'
    }
    
    payload = {
        'args': args,
        'format': format
    }
    
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()

# Usage
result = call_tool('xray_get_test', {'testKey': 'PROJ-123'})
print(result['result'])
```

### cURL

```bash
# Set environment variables
export XRAY_CLIENT_ID="your-client-id"
export XRAY_CLIENT_SECRET="your-client-secret"

# Get a test
curl -X POST https://xray-mcp.dev.triparcdev.com/api/v1/call/xray_get_test \
  -H "X-Xray-Client-Id: $XRAY_CLIENT_ID" \
  -H "X-Xray-Client-Secret: $XRAY_CLIENT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "args": {"testKey": "PROJ-123"},
    "format": "json"
  }' | jq .

# List tests
curl -X GET "https://xray-mcp.dev.triparcdev.com/api/v1/tests?projectKey=PROJ" \
  -H "X-Xray-Client-Id: $XRAY_CLIENT_ID" \
  -H "X-Xray-Client-Secret: $XRAY_CLIENT_SECRET" | jq .
```

## Rate Limiting

The API enforces rate limiting: **100 requests per 60 seconds per IP**.

Check rate limit status in response headers:
- `RateLimit-Limit: 100` — Max requests per period
- `RateLimit-Remaining: 45` — Requests remaining
- `RateLimit-Reset: 1610701800` — Unix timestamp when limit resets

## Security

- All endpoints require authentication via headers
- Communication is always HTTPS
- Request logging includes correlation IDs (check server logs)
- Sensitive data (passwords, tokens, secrets) are automatically redacted in logs
- CORS restrictions apply based on `CORS_ALLOWED_ORIGINS` environment variable
- CSRF protection via same-site cookies for browser-based clients

## Performance

- Response compression: Gzip or Brotli (30-50% faster)
- Cache headers for health checks (60s) and metadata (1h)
- Keep-alive connections for HTTP/1.1
- ~1-2ms middleware overhead per request

## Available Tools

All 90 MCP tools are available via REST API:

### Tests (10 tools)
- xray_list_tests
- xray_get_test
- xray_create_test
- xray_update_test
- xray_delete_test
- xray_search_tests
- xray_get_test_status_metrics
- xray_add_test_step
- xray_remove_test_step
- xray_reorder_test_steps

### Test Runs (12 tools)
- xray_list_test_runs
- xray_get_test_run
- xray_create_test_run
- xray_update_test_run
- xray_delete_test_run
- ... (and 7 more)

### Executions (15 tools)
### Plans (12 tools)
### Test Sets (8 tools)
### Preconditions (8 tools)
### Folders (10 tools)
### Evidence (12 tools)
### Imports (10 tools)
### Admin (3 tools)

See `GET /api/v1/tools` for complete list with descriptions.

## Comparison: REST API vs MCP

| Feature | REST API | MCP |
|---------|----------|-----|
| Protocol | HTTP/HTTPS | Stdio or HTTP |
| Best for | External integrations, CI/CD, webhooks | LLM agents, AI assistants |
| Authentication | Headers, OAuth2 | Headers, environment variables |
| Response format | JSON, TOON, summary | Text, tree, list |
| Latency | Medium (~10-50ms) | Low (~1-5ms for stdio) |
| Browser-friendly | Yes | No (CORS issues) |
| Easy to script | Yes | Yes |

## Troubleshooting

### 401 Unauthorized
- Check credentials are set in headers
- Verify client ID and secret are correct
- Ensure OAuth2 tokens are not expired

### 404 Not Found
- Verify tool name is correct: `GET /api/v1/tools` to list
- Check resource IDs (testKey, runId, etc.) are valid

### 429 Too Many Requests
- Wait for rate limit to reset (see `RateLimit-Reset` header)
- Batch requests or implement exponential backoff

### CORS Error
- API is configured for specific origins via `CORS_ALLOWED_ORIGINS`
- Contact admin if your domain needs to be added

## Deployment

Deploy the REST API by:
1. Starting the HTTP server: `npm run start:http`
2. Configuring environment variables (see DEPLOYMENT.md)
3. Pointing clients to the base URL

The REST API runs on the same HTTP transport as MCP, so no additional configuration is needed.
