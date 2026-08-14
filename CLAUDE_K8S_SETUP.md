# K8s Claude Desktop Setup (Zero Local Setup)

**TL;DR**: Copy 3 lines. Paste in Claude config. Restart. Done.

## How to Connect Claude Desktop to Your Team's K8s xray-mcp

### Step 1: Get Your Credentials

Ask your team lead for:
- **Xray Client ID** (looks like: `5913FB91E8B64317A204C435C7025BE1`)
- **Xray Client Secret** (looks like: `09c85a97076503f31c5ce6ff13c569a33a5c3a69752bd311a9be1f07b14fe92e`)
- **Server URL** (e.g., `xray-mcp.dev.triparcdev.com` or your internal domain)

### Step 2: Edit Claude Config

Open this file on your machine:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Step 3: Paste This (Replace the Values)

```json
{
  "mcpServers": {
    "xray": {
      "command": "curl",
      "args": [
        "-s",
        "-X",
        "POST",
        "https://YOUR_DOMAIN/mcp?client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET",
        "-H",
        "Content-Type: application/json",
        "-d",
        "@-"
      ],
      "transport": "stdio",
      "autoApprove": ["xray_get_*", "xray_list_*"]
    }
  }
}
```

**Replace:**
- `YOUR_DOMAIN` → `xray-mcp.dev.triparcdev.com` (or your domain)
- `YOUR_CLIENT_ID` → Your actual client ID
- `YOUR_CLIENT_SECRET` → Your actual secret

### Step 4: Restart Claude Desktop

- Close Claude Desktop completely
- Reopen it
- You should see "xray" in the MCP servers list ✅

---

## How It Works (No Local Setup Required)

```
Claude Desktop
    ↓
   curl (built-in to all OSes)
    ↓
K8s xray-mcp server (https://your-domain/mcp?creds)
    ↓
Xray Cloud API
```

**Why this is better:**
- ✅ **No npm/Node.js required** — curl is built-in
- ✅ **No local proxy** — connects directly to K8s
- ✅ **No configuration** — copy/paste and go
- ✅ **Same credentials everywhere** — all team members use same setup

---

## Testing It Works

In Claude, try:
```
Get me the test with key PROJ-123
```

Claude will call xray-mcp → you'll get your test details.

---

## Troubleshooting

### "MCP servers could not be loaded"
1. Check the JSON file is valid (use [jsonlint.com](https://jsonlint.com))
2. Verify you replaced `YOUR_DOMAIN` and `YOUR_CLIENT_ID`
3. Check the file path is correct for your OS
4. Restart Claude completely (not just the window)

### "Unauthorized" or "401"
1. Verify your client ID and secret are correct
2. Ask your team lead for the latest credentials
3. Check there are no extra spaces around the values

### "Connection refused"
1. Verify your domain is correct (can you reach it in browser?)
2. Check your firewall isn't blocking HTTPS
3. Verify the K8s service is running: `kubectl get svc xray-mcp`

---

## Team Deployment

**For admins** — distribute this file template:

```bash
# Create template with your domain/creds
cp CLAUDE_DESKTOP_CONFIG_K8S.json claude_desktop_config.json

# Edit with your values
nano claude_desktop_config.json

# Send to team via Slack/email/wiki
# They just copy to their Claude config directory
```

---

## Changing Credentials

If credentials rotate:
1. Update the client ID/secret in your Claude config
2. Restart Claude
3. Done (no re-deployment needed)

---

## Support

If it doesn't work, check:
- [ ] JSON file is valid (paste in jsonlint.com)
- [ ] File location is correct for your OS
- [ ] Domain is accessible from your network
- [ ] Credentials are copied exactly (no extra spaces)
- [ ] Claude Desktop was fully restarted

Contact your team admin if still stuck.
