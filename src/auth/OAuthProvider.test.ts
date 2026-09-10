import { createHash, randomBytes } from "node:crypto";
import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { OAuthProvider } from "./OAuthProvider.js";

const register = (p: OAuthProvider) =>
  p.clientsStore.registerClient as NonNullable<typeof p.clientsStore.registerClient>;

const KEY = randomBytes(32).toString("base64");
const REDIRECT = "https://claude.ai/api/mcp/auth_callback";

function makeRes() {
  const res = {
    statusCode: 200,
    body: "",
    redirectedTo: "",
    status(c: number) {
      this.statusCode = c;
      return this;
    },
    type() {
      return this;
    },
    send(b: string) {
      this.body = b;
    },
    redirect(_c: number, url: string) {
      this.redirectedTo = url;
    },
  };
  return res as unknown as Response & typeof res;
}

async function registerAndLogin(
  provider: OAuthProvider,
  check = vi.fn().mockResolvedValue(undefined),
) {
  const client = await register(provider)({
    redirect_uris: [REDIRECT],
    token_endpoint_auth_method: "none",
  });
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const authRes = makeRes();
  await provider.authorize(
    client,
    { redirectUri: REDIRECT, codeChallenge: challenge, state: "s1" },
    authRes,
  );
  const request = /name="request" value="([^"]+)"/.exec(authRes.body)?.[1] as string;

  const loginRes = makeRes();
  await provider.login(
    { request, state: "s1", client_id: "xid", client_secret: "xsecret" },
    loginRes,
  );
  return { client, verifier, challenge, loginRes, check };
}

describe("OAuthProvider", () => {
  it("rejects a key that is not 32 bytes", () => {
    expect(() => new OAuthProvider("c2hvcnQ=", vi.fn())).toThrow(/32 bytes/);
  });

  it("registers clients statelessly: getClient round-trips through the sealed client_id", async () => {
    const p = new OAuthProvider(KEY, vi.fn());
    const c = await register(p)({
      redirect_uris: [REDIRECT],
      token_endpoint_auth_method: "client_secret_post",
      client_secret: "cs",
    });
    const got = await p.clientsStore.getClient(c.client_id);
    expect(got?.redirect_uris).toEqual([REDIRECT]);
    expect(got?.client_secret).toBe("cs");
    expect(await p.clientsStore.getClient("garbage")).toBeUndefined();
  });

  it("authorize renders the login form carrying a sealed request", async () => {
    const p = new OAuthProvider(KEY, vi.fn());
    const client = await register(p)({ redirect_uris: [REDIRECT] });
    const res = makeRes();
    await p.authorize(client, { redirectUri: REDIRECT, codeChallenge: "ch" }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('name="client_secret" type="password"');
    expect(res.body).toMatch(/name="request" value="[A-Za-z0-9_-]+"/);
  });

  it("login validates against Xray and redirects with code + state", async () => {
    const check = vi.fn().mockResolvedValue(undefined);
    const p = new OAuthProvider(KEY, check);
    const { loginRes } = await registerAndLogin(p, check);
    expect(check).toHaveBeenCalledWith("xid", "xsecret");
    const url = new URL(loginRes.redirectedTo);
    expect(url.origin + url.pathname).toBe(REDIRECT);
    expect(url.searchParams.get("state")).toBe("s1");
    expect(url.searchParams.get("code")).toBeTruthy();
  });

  it("login re-renders the form with 401 when Xray rejects the credentials", async () => {
    const p = new OAuthProvider(KEY, vi.fn().mockRejectedValue(new Error("nope")));
    const client = await register(p)({ redirect_uris: [REDIRECT] });
    const authRes = makeRes();
    await p.authorize(client, { redirectUri: REDIRECT, codeChallenge: "ch" }, authRes);
    const request = /name="request" value="([^"]+)"/.exec(authRes.body)?.[1] as string;
    const res = makeRes();
    await p.login({ request, client_id: "bad", client_secret: "bad" }, res);
    expect(res.statusCode).toBe(401);
    expect(res.body).toContain("rejected");
    expect(res.redirectedTo).toBe("");
  });

  it("login rejects a tampered or missing request blob", async () => {
    const p = new OAuthProvider(KEY, vi.fn());
    const res = makeRes();
    await p.login({ request: "AAAA", client_id: "x", client_secret: "y" }, res);
    expect(res.statusCode).toBe(400);
  });

  it("code exchange yields a token whose verification returns the user's Xray creds", async () => {
    const p = new OAuthProvider(KEY, vi.fn().mockResolvedValue(undefined));
    const { client, challenge, verifier, loginRes } = await registerAndLogin(p);
    const code = new URL(loginRes.redirectedTo).searchParams.get("code") as string;

    expect(await p.challengeForAuthorizationCode(client, code)).toBe(challenge);
    const tokens = await p.exchangeAuthorizationCode(client, code, verifier, REDIRECT);
    expect(tokens.token_type).toBe("bearer");
    expect(tokens.expires_in).toBe(24 * 60 * 60);

    const info = await p.verifyAccessToken(tokens.access_token);
    expect(info.clientId).toBe(client.client_id);
    expect(info.extra).toEqual({ xrayClientId: "xid", xrayClientSecret: "xsecret" });

    const refreshed = await p.exchangeRefreshToken(client, tokens.refresh_token as string);
    expect((await p.verifyAccessToken(refreshed.access_token)).extra).toEqual(info.extra);
  });

  it("rejects codes for a different client and redirect_uri mismatches", async () => {
    const p = new OAuthProvider(KEY, vi.fn().mockResolvedValue(undefined));
    const { client, verifier, loginRes } = await registerAndLogin(p);
    const code = new URL(loginRes.redirectedTo).searchParams.get("code") as string;
    const other = await register(p)({ redirect_uris: [REDIRECT] });

    await expect(p.challengeForAuthorizationCode(other, code)).rejects.toThrow(/Invalid/);
    await expect(
      p.exchangeAuthorizationCode(client, code, verifier, "https://evil/cb"),
    ).rejects.toThrow(/mismatch/);
  });

  it("does not accept one token type in place of another, nor a token from another key", async () => {
    const p = new OAuthProvider(KEY, vi.fn().mockResolvedValue(undefined));
    const { client, verifier, loginRes } = await registerAndLogin(p);
    const code = new URL(loginRes.redirectedTo).searchParams.get("code") as string;
    const tokens = await p.exchangeAuthorizationCode(client, code, verifier, REDIRECT);

    await expect(p.verifyAccessToken(tokens.refresh_token as string)).rejects.toThrow();
    await expect(p.verifyAccessToken(code)).rejects.toThrow();
    const otherKey = new OAuthProvider(randomBytes(32).toString("base64"), vi.fn());
    await expect(otherKey.verifyAccessToken(tokens.access_token)).rejects.toThrow();
  });

  it("expired tokens are rejected", async () => {
    const p = new OAuthProvider(KEY, vi.fn());
    const t = p.seal({ t: "access", cid: "a", cs: "b", client_id: "c" }, -1);
    await expect(p.verifyAccessToken(t)).rejects.toThrow(/expired/);
  });
});
