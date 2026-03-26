import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { XrayAuthError } from "../types/index.js";
import { CredentialStore } from "./CredentialStore.js";

describe("CredentialStore - resolveFromEnv", () => {
  let store: CredentialStore;

  beforeEach(() => {
    store = new CredentialStore();
    // Clean env before each test
    vi.stubEnv("XRAY_CLIENT_ID", "");
    vi.stubEnv("XRAY_CLIENT_SECRET", "");
    vi.stubEnv("XRAY_REGION", "");
    vi.stubEnv("XRAY_CREDENTIAL_MODE", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns AuthContext when XRAY_CLIENT_ID and XRAY_CLIENT_SECRET are set", () => {
    vi.stubEnv("XRAY_CLIENT_ID", "my-client-id");
    vi.stubEnv("XRAY_CLIENT_SECRET", "my-client-secret");

    const ctx = store.resolveFromEnv();
    expect(ctx.credentials.xrayClientId).toBe("my-client-id");
    expect(ctx.credentials.xrayClientSecret).toBe("my-client-secret");
    expect(ctx.source).toBe("env");
  });

  it("defaults region to 'global' when XRAY_REGION is not set", () => {
    vi.stubEnv("XRAY_CLIENT_ID", "my-client-id");
    vi.stubEnv("XRAY_CLIENT_SECRET", "my-client-secret");
    vi.stubEnv("XRAY_REGION", "");

    const ctx = store.resolveFromEnv();
    expect(ctx.credentials.xrayRegion).toBe("global");
  });

  it("uses XRAY_REGION env var when set", () => {
    vi.stubEnv("XRAY_CLIENT_ID", "my-client-id");
    vi.stubEnv("XRAY_CLIENT_SECRET", "my-client-secret");
    vi.stubEnv("XRAY_REGION", "eu");

    const ctx = store.resolveFromEnv();
    expect(ctx.credentials.xrayRegion).toBe("eu");
  });

  it("throws XrayAuthError with hint when XRAY_CLIENT_ID is missing", () => {
    vi.stubEnv("XRAY_CLIENT_ID", "");
    vi.stubEnv("XRAY_CLIENT_SECRET", "my-client-secret");

    expect(() => store.resolveFromEnv()).toThrow(XrayAuthError);
    expect(() => store.resolveFromEnv()).toThrow("ERR:AUTH_MISSING_CRED");
    expect(() => store.resolveFromEnv()).toThrow("XRAY_CLIENT_ID");
  });

  it("throws XrayAuthError with hint when XRAY_CLIENT_SECRET is missing", () => {
    vi.stubEnv("XRAY_CLIENT_ID", "my-client-id");
    vi.stubEnv("XRAY_CLIENT_SECRET", "");

    expect(() => store.resolveFromEnv()).toThrow(XrayAuthError);
    expect(() => store.resolveFromEnv()).toThrow("ERR:AUTH_MISSING_CRED");
    expect(() => store.resolveFromEnv()).toThrow("XRAY_CLIENT_SECRET");
  });
});

describe("CredentialStore - getCredentialMode", () => {
  let store: CredentialStore;

  beforeEach(() => {
    store = new CredentialStore();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to 'strict' when XRAY_CREDENTIAL_MODE is not set", () => {
    vi.stubEnv("XRAY_CREDENTIAL_MODE", "");
    expect(store.getCredentialMode()).toBe("strict");
  });

  it("returns 'strict' when XRAY_CREDENTIAL_MODE=strict", () => {
    vi.stubEnv("XRAY_CREDENTIAL_MODE", "strict");
    expect(store.getCredentialMode()).toBe("strict");
  });

  it("returns 'shared-reads' when XRAY_CREDENTIAL_MODE=shared-reads", () => {
    vi.stubEnv("XRAY_CREDENTIAL_MODE", "shared-reads");
    expect(store.getCredentialMode()).toBe("shared-reads");
  });

  it("returns 'fully-shared' when XRAY_CREDENTIAL_MODE=fully-shared", () => {
    vi.stubEnv("XRAY_CREDENTIAL_MODE", "fully-shared");
    expect(store.getCredentialMode()).toBe("fully-shared");
  });

  it("throws XrayAuthError for invalid credential mode", () => {
    vi.stubEnv("XRAY_CREDENTIAL_MODE", "invalid-mode");
    expect(() => store.getCredentialMode()).toThrow(XrayAuthError);
    expect(() => store.getCredentialMode()).toThrow("ERR:AUTH_INVALID_MODE");
  });
});
