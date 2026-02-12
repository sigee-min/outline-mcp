import { describe, expect, it } from "vitest";

import { loadConfig, parseAllowedActions } from "../src/config.js";

describe("parseAllowedActions", () => {
  it("parses valid action lists", () => {
    const actions = parseAllowedActions("read,write,delete,admin");
    expect(actions.has("read")).toBe(true);
    expect(actions.has("write")).toBe(true);
    expect(actions.has("delete")).toBe(true);
    expect(actions.has("admin")).toBe(true);
  });

  it("throws on invalid actions", () => {
    expect(() => parseAllowedActions("read,owner")).toThrow(/unsupported action/i);
  });

  it("throws when no valid actions are provided", () => {
    expect(() => parseAllowedActions(" , ")).toThrow(/must include at least one action/i);
  });

  it("resolves lease strategy auto to memory when attribute id is missing", () => {
    const config = loadConfig({
      OUTLINE_API_KEY: "test-key",
      OUTLINE_BASE_URL: "https://app.getoutline.com",
      OUTLINE_LEASE_STRATEGY: "auto"
    });

    expect(config.lease.strategy).toBe("memory");
  });

  it("resolves lease strategy auto to data_attribute when attribute id exists", () => {
    const config = loadConfig({
      OUTLINE_API_KEY: "test-key",
      OUTLINE_BASE_URL: "https://app.getoutline.com",
      OUTLINE_LEASE_STRATEGY: "auto",
      OUTLINE_LEASE_ATTRIBUTE_ID: "attr-123"
    });

    expect(config.lease.strategy).toBe("data_attribute");
    expect(config.lease.attributeId).toBe("attr-123");
  });

  it("enables capability probe by default", () => {
    const config = loadConfig({
      OUTLINE_API_KEY: "test-key",
      OUTLINE_BASE_URL: "https://app.getoutline.com"
    });

    expect(config.capabilityProbeEnabled).toBe(true);
  });

  it("allows disabling capability probe", () => {
    const config = loadConfig({
      OUTLINE_API_KEY: "test-key",
      OUTLINE_BASE_URL: "https://app.getoutline.com",
      OUTLINE_ENABLE_CAPABILITY_PROBE: "false"
    });

    expect(config.capabilityProbeEnabled).toBe(false);
  });

  it("strips trailing slash from OUTLINE_BASE_URL", () => {
    const config = loadConfig({
      OUTLINE_API_KEY: "test-key",
      OUTLINE_BASE_URL: "https://archive.sigee.xyz/"
    });

    expect(config.baseUrl).toBe("https://archive.sigee.xyz");
  });

  it("clamps default lease ttl to max lease ttl", () => {
    const config = loadConfig({
      OUTLINE_API_KEY: "test-key",
      OUTLINE_BASE_URL: "https://app.getoutline.com",
      OUTLINE_LEASE_DEFAULT_TTL_SECONDS: "9999",
      OUTLINE_LEASE_MAX_TTL_SECONDS: "1200"
    });

    expect(config.lease.defaultTtlSeconds).toBe(1200);
    expect(config.lease.maxTtlSeconds).toBe(1200);
  });

  it("throws when OUTLINE_API_KEY is missing", () => {
    expect(() =>
      loadConfig({
        OUTLINE_BASE_URL: "https://app.getoutline.com"
      })
    ).toThrow(/OUTLINE_API_KEY/i);
  });
});
