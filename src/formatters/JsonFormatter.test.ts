import { describe, expect, it } from "vitest";
import { JsonFormatter } from "./JsonFormatter.js";

describe("JsonFormatter", () => {
  const fmt = new JsonFormatter();

  it("format returns JSON.stringify with 2-space indent", () => {
    const data = { id: "PROJ-1", name: "Test" };
    const result = fmt.format("test", data);
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  it('format with null data returns "null"', () => {
    expect(fmt.format("test", null)).toBe("null");
  });

  it("format with array data returns JSON array", () => {
    const data = [{ id: "1" }, { id: "2" }];
    const result = fmt.format("test_list", data);
    expect(result).toBe(JSON.stringify(data, null, 2));
    expect(result).toContain("[");
  });

  it("formatError with code, message, and hint returns JSON with all fields", () => {
    const result = fmt.formatError("AUTH_EXPIRED", "Token expired", "Check credentials");
    const parsed = JSON.parse(result);
    expect(parsed.code).toBe("AUTH_EXPIRED");
    expect(parsed.message).toBe("Token expired");
    expect(parsed.hint).toBe("Check credentials");
  });

  it("formatError without hint omits hint field from JSON", () => {
    const result = fmt.formatError("GQL_ERROR", "Bad query");
    const parsed = JSON.parse(result);
    expect(parsed.code).toBe("GQL_ERROR");
    expect(parsed.message).toBe("Bad query");
    expect(parsed.hint).toBeUndefined();
  });
});
