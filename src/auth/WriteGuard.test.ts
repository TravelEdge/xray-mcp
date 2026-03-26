import { describe, expect, it } from "vitest";
import type { AuthContext } from "../types/index.js";
import { XrayAuthError } from "../types/index.js";
import { WriteGuard } from "./WriteGuard.js";

// Valid AuthContext for tests
const validAuth: AuthContext = {
  credentials: {
    xrayClientId: "test-id",
    xrayClientSecret: "test-secret",
    xrayRegion: "global",
  },
  source: "env",
};

describe("WriteGuard - strict mode", () => {
  const guard = new WriteGuard("strict");

  it("throws when checkAccess('write', null) — no user creds", () => {
    expect(() => guard.checkAccess("write", null)).toThrow(XrayAuthError);
    expect(() => guard.checkAccess("write", null)).toThrow("ERR:AUTH_REQUIRED");
  });

  it("throws when checkAccess('read', null) — no user creds", () => {
    expect(() => guard.checkAccess("read", null)).toThrow(XrayAuthError);
    expect(() => guard.checkAccess("read", null)).toThrow("ERR:AUTH_REQUIRED");
  });

  it("succeeds for checkAccess('write', validAuth)", () => {
    expect(() => guard.checkAccess("write", validAuth)).not.toThrow();
  });

  it("succeeds for checkAccess('read', validAuth)", () => {
    expect(() => guard.checkAccess("read", validAuth)).not.toThrow();
  });
});

describe("WriteGuard - shared-reads mode", () => {
  const guard = new WriteGuard("shared-reads");

  it("succeeds for checkAccess('read', null) — uses shared creds", () => {
    expect(() => guard.checkAccess("read", null)).not.toThrow();
  });

  it("throws for checkAccess('write', null) — write requires user creds", () => {
    expect(() => guard.checkAccess("write", null)).toThrow(XrayAuthError);
    expect(() => guard.checkAccess("write", null)).toThrow("ERR:AUTH_WRITE_DENIED");
  });

  it("succeeds for checkAccess('write', validAuth)", () => {
    expect(() => guard.checkAccess("write", validAuth)).not.toThrow();
  });
});

describe("WriteGuard - fully-shared mode", () => {
  const guard = new WriteGuard("fully-shared");

  it("succeeds for checkAccess('write', null)", () => {
    expect(() => guard.checkAccess("write", null)).not.toThrow();
  });

  it("succeeds for checkAccess('read', null)", () => {
    expect(() => guard.checkAccess("read", null)).not.toThrow();
  });
});
