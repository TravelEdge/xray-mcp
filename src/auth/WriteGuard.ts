import type { AccessLevel, AuthContext, CredentialMode } from "../types/index.js";
import { XrayAuthError } from "../types/index.js";

/**
 * Enforces credential mode access control at tool dispatch time.
 *
 * Three modes per AUTH-06 through AUTH-09:
 * - strict (default): Every operation requires user-provided credentials
 * - shared-reads: Reads use shared server credentials; writes require user credentials
 * - fully-shared: One shared credential set serves all operations
 *
 * Created once per server instance (stdio: once at startup; HTTP: per-request for credential isolation).
 */
export class WriteGuard {
  constructor(private readonly mode: CredentialMode) {}

  /**
   * Checks whether the requested access level is permitted given the current user auth context.
   * Throws XrayAuthError with actionable hints if access is denied.
   *
   * @param accessLevel - "read" or "write"
   * @param userAuth - The per-user AuthContext (null if not provided via env/header)
   */
  checkAccess(accessLevel: AccessLevel, userAuth: AuthContext | null): void {
    switch (this.mode) {
      case "fully-shared":
        // AUTH-09: all operations allowed with shared credentials
        return;

      case "shared-reads":
        // AUTH-08: reads use shared creds, writes require user creds
        if (accessLevel === "read") return;
        if (!userAuth) {
          throw new XrayAuthError(
            "ERR:AUTH_WRITE_DENIED Write operations require user credentials in shared-reads mode\n-> Provide XRAY_CLIENT_ID and XRAY_CLIENT_SECRET via request headers",
          );
        }
        return;

      default:
        // AUTH-07: all operations require user credentials (strict mode)
        if (!userAuth) {
          throw new XrayAuthError(
            `ERR:AUTH_REQUIRED ${accessLevel === "write" ? "Write" : "Read"} operations require user credentials in strict mode\n-> Provide XRAY_CLIENT_ID and XRAY_CLIENT_SECRET`,
          );
        }
        return;
    }
  }
}
