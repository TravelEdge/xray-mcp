# MCP Usage Guide — How to Use with Your Deployed Helm Chart

Your Helm Chart is running the xray-mcp HTTP server. Here's how to use it with your Xray client ID and secret.

---

## Quick Start (Most Common)

### If you deployed with `fully-shared` mode (recommended for team servers):

**Setup (one-time):**
```bash
# Configure Claude Desktop (macOS: ~/Library/Application Support/Claude/claude_desktop_config.json)
# or Windows: %APPDATA%\Claude\claude_desktop_config.json

{
  "mcpServers": {
    "xray": {
      "transport": "http",
      "url": "http://your-helm-server:3000/mcp",
      "autoApprove": ["xray_get_*", "xray_list_*"]
    }
  }
}
```

**That's it!** The server uses its own credentials (which you provided to Helm during deployment).

---

### If you deployed with `strict` or `shared-reads` mode:

**Setup (one-time):**
```bash
# Configure Claude Desktop

{
  "mcpServers": {
    "xray": {
      "transport": "http",
      "url": "http://your-helm-server:3000/mcp",
      "headers": {
        "X-Xray-Client-Id": "your-client-id",
        "X-Xray-Client-Secret": "your-client-secret"
      },
      "autoApprove": ["xray_get_*", "xray_list_*"]
    }
  }
}
```

**Note**: In `shared-reads` mode:
- Read operations use the server's credentials (faster, shared cache)
- Write operations require YOUR credentials in headers

---

## Understanding Credential Modes

| Mode | Use Case | How It Works |
|------|----------|-------------|
| **fully-shared** | Team server where everyone uses same Xray account | Server uses its own env var credentials for all operations. Headers ignored. |
| **shared-reads** | Team server with per-user write access | Reads use server credentials (shared cache). Writes require user credentials in headers. |
| **strict** | Multi-tenant or per-user isolation | Every operation requires credentials in headers. No shared state. |

---

## How MCP Works with HTTP Transport

### Step 1: Claude Desktop connects to your server
```
Claude Desktop
    ↓
POST http://your-helm-server:3000/mcp
(with X-Xray-Client-Id and X-Xray-Client-Secret headers if strict/shared-reads mode)
```

### Step 2: Server resolves credentials
```
If fully-shared mode:
  → Use XRAY_CLIENT_ID and XRAY_CLIENT_SECRET from env vars

If strict/shared-reads mode:
  → Extract from X-Xray-Client-Id and X-Xray-Client-Secret headers
```

### Step 3: Server authenticates with Xray Cloud
```
Server → POST https://xray.cloud.getxray.app/api/v2/authenticate
         body: { client_id, client_secret }
         ↓
         200 OK: JWT token (cached for 24h)
```

### Step 4: Server calls Xray API with JWT
```
Server → GET https://xray.cloud.getxray.app/graphql
         Authorization: Bearer <JWT>
         ↓
         Returns test data, etc.
```

### Step 5: Server formats response (TOON by default)
```
TEST XTP-123 [✔ PASS] "My test title" (manual)
steps: 3 | precond: 1
```

### Step 6: Claude Desktop receives response
```
Claude → Use the data in conversation
```

---

## Example: Using MCP in Claude Desktop

### 1. Configure the server (using `fully-shared` mode)

`~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "xray": {
      "transport": "http",
      "url": "https://xray-mcp.yourcompany.com/mcp",
      "autoApprove": ["xray_get_*", "xray_list_*"]
    }
  }
}
```

### 2. Restart Claude Desktop

### 3. Use in conversation

**You:** "Get test case XTP-123"

**Claude Desktop MCP:**
```
→ Calls tool: xray_get_test
  args: { testKey: "XTP-123", format: "toon" }
  
→ Server receives request
  → Credentials: from env vars (fully-shared mode)
  → Authenticates with Xray Cloud
  → Queries GraphQL API
  → Formats response as TOON
  
← Returns: "TEST XTP-123 [✔ PASS] ..."
```

**Claude:** "Here's test XTP-123: [formatted response]. It's currently passing..."

---

## Health Check Your Deployment

Before using MCP, verify your server is healthy:

```bash
# Liveness check (always passes)
curl http://your-helm-server:3000/healthz
→ { "status": "ok", "transport": "http" }

# Readiness check (verifies Xray API connectivity)
curl http://your-helm-server:3000/readyz
→ { "status": "ready", "xray": "reachable" }
  or
→ { "status": "ok", "xray": "not configured" }
```

If readiness returns "not configured", your server doesn't have credentials. Check:
```bash
# Verify Helm deployment has credentials
kubectl get secret <release>-xray-credentials -o yaml

# Verify env vars are set
kubectl exec -it <pod-name> -- env | grep XRAY
```

---

## OAuth2/PKCE Authorization Flow (Advanced)

If you need token-based authentication instead of direct credentials:

### 1. Initiate authorization
```bash
GET http://your-helm-server:3000/authorize?
  response_type=code&
  client_id=your-app&
  redirect_uri=https://your-app/callback&
  code_challenge=E9Mrozoa2owUottQKZ8&
  code_challenge_method=S256&
  state=random-state
```

### 2. User approves → get authorization code
```
Redirect to: https://your-app/callback?code=auth-code&state=random-state
```

### 3. Exchange code for token
```bash
POST http://your-helm-server:3000/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "auth-code",
  "code_verifier": "E9Mrozoa2owUottQKZ8Z8eifzxjU0oi",
  "state": "random-state"
}
```

### 4. Response contains access token
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "state": "random-state"
}
```

### 5. Use token in MCP requests
```bash
POST http://your-helm-server:3000/mcp
Authorization: Bearer <access_token>
Content-Type: application/json

{ ...MCP request... }
```

---

## Security Features Now Enabled

✅ **Rate Limiting**: 100 requests/60s per IP
✅ **CORS Policy**: Configurable allowed origins
✅ **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
✅ **Request Logging**: JSON logs with correlation IDs
✅ **PII Redaction**: Credentials not logged
✅ **PKCE OAuth2**: Token-based auth for desktop apps
✅ **Response Compression**: Auto gzip/brotli

---

## Troubleshooting

### "Connection refused"
- Verify Helm pod is running: `kubectl get pods | grep xray-mcp`
- Check service: `kubectl get svc | grep xray-mcp`
- Check network connectivity to the server

### "401 Unauthorized"
- Verify credentials in headers (if `strict` or `shared-reads` mode)
- Check Xray Cloud credentials are valid
- Check `readyz` endpoint: is it showing "reachable"?

### "Rate limit exceeded"
- You're hitting 100 requests/60s limit
- Wait 60 seconds and retry
- Contact ops if this is a legitimate use case (can be adjusted)

### "CORS error"
- Add your origin to `CORS_ALLOWED_ORIGINS` env var
- Example: `CORS_ALLOWED_ORIGINS=https://claude.ai,https://your-domain.com`
- Redeploy Helm chart with new env vars

### "429 Too Many Requests"
- You're being rate-limited
- Response includes `Retry-After` header
- Wait and retry

---

## Environment Variables for Helm Deployment

```bash
# Core credentials
XRAY_CLIENT_ID=your-client-id
XRAY_CLIENT_SECRET=your-client-secret

# Credential mode (default: strict)
XRAY_CREDENTIAL_MODE=fully-shared  # or shared-reads, strict

# Region (default: global)
XRAY_REGION=global  # or us, eu, au

# HTTP transport
TRANSPORT=http
PORT=3000

# Security (new)
CORS_ALLOWED_ORIGINS=https://claude.ai,https://cursor.ai

# DNS rebinding protection
ALLOWED_HOSTS=xray-mcp.yourcompany.com
```

---

## Next Steps

1. **Verify your Helm deployment** is healthy
   ```bash
   curl http://your-helm-server:3000/readyz
   ```

2. **Choose credential mode** based on your use case
   - Team server? Use `fully-shared`
   - Multi-tenant? Use `strict` or `shared-reads`

3. **Configure Claude Desktop** with the MCP server URL and headers (if needed)

4. **Test in Claude**: Ask Claude to "Get test case XTP-123" or similar

5. **Monitor logs** for issues
   ```bash
   kubectl logs -f <pod-name> | grep correlationId
   ```

---

## More Information

- **Architecture**: See `ARCHITECTURE.md`
- **Standards**: See `STANDARDS.md` (new!)
- **All 90 tools**: See `TOOLS.md`
- **Contributing**: See `CONTRIBUTING.md`
