import type { AppConfig, AllowedAction } from "../../src/config.js";
import type { ToolContext } from "../../src/server/context.js";
import type { ServerCapabilities } from "../../src/server/capabilities.js";

function createNoopClient(): Record<string, never> {
  return {} as Record<string, never>;
}

function createNoopLeaseService(): Record<string, never> {
  return {} as Record<string, never>;
}

export function createTestConfig(allowedActions: AllowedAction[] = ["read", "write", "delete"]): AppConfig {
  return {
    apiKey: "test-api-key",
    baseUrl: "https://outline.example.com",
    allowedActions: new Set(allowedActions),
    requestTimeoutMs: 1000,
    retryCount: 1,
    capabilityProbeEnabled: true,
    lease: {
      strategy: "memory",
      defaultTtlSeconds: 600,
      maxTtlSeconds: 7200
    }
  };
}

export function createCapabilities(state: "available" | "unknown" | "unavailable" = "available"): ServerCapabilities {
  return {
    comments: { endpoint: "comments.list", state },
    revisionInfo: { endpoint: "revisions.info", state },
    templatize: { endpoint: "documents.templatize", state },
    dataAttributes: { endpoint: "dataAttributes.list", state }
  };
}

export function createToolContext(
  overrides: Partial<ToolContext> & {
    allowedActions?: AllowedAction[];
  } = {}
): ToolContext {
  const config =
    overrides.config ??
    createTestConfig(overrides.allowedActions ?? ["read", "write", "delete"]);

  return {
    config,
    client: (overrides.client ?? createNoopClient()) as ToolContext["client"],
    leaseService: (overrides.leaseService ?? createNoopLeaseService()) as ToolContext["leaseService"],
    capabilities: overrides.capabilities ?? createCapabilities("available")
  };
}
