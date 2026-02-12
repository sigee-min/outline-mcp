import { z } from "zod";

const actionSchema = z.enum(["read", "write", "delete", "admin"]);
const leaseStrategySchema = z.enum(["auto", "memory", "data_attribute"]);

const envSchema = z.object({
  OUTLINE_API_KEY: z.string().min(1, "OUTLINE_API_KEY is required"),
  OUTLINE_BASE_URL: z.url().default("https://app.getoutline.com"),
  OUTLINE_ALLOWED_ACTIONS: z.string().default("read,write,delete"),
  OUTLINE_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  OUTLINE_RETRY_COUNT: z.coerce.number().int().min(0).default(2),
  OUTLINE_ENABLE_CAPABILITY_PROBE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  OUTLINE_LEASE_STRATEGY: leaseStrategySchema.default("auto"),
  OUTLINE_LEASE_ATTRIBUTE_ID: z.string().min(1).optional(),
  OUTLINE_LEASE_DEFAULT_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  OUTLINE_LEASE_MAX_TTL_SECONDS: z.coerce.number().int().positive().default(7200)
});

export type AllowedAction = z.infer<typeof actionSchema>;
export type LeaseStrategy = z.infer<typeof leaseStrategySchema>;

export type AppConfig = {
  apiKey: string;
  baseUrl: string;
  allowedActions: Set<AllowedAction>;
  requestTimeoutMs: number;
  retryCount: number;
  capabilityProbeEnabled: boolean;
  lease: {
    strategy: Exclude<LeaseStrategy, "auto">;
    defaultTtlSeconds: number;
    maxTtlSeconds: number;
    attributeId?: string;
  };
};

export function parseAllowedActions(raw: string): Set<AllowedAction> {
  const tokens = raw
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) {
    throw new Error("OUTLINE_ALLOWED_ACTIONS must include at least one action");
  }

  const actions = new Set<AllowedAction>();

  for (const token of tokens) {
    const parsed = actionSchema.safeParse(token);
    if (!parsed.success) {
      throw new Error(
        `OUTLINE_ALLOWED_ACTIONS has unsupported action \"${token}\". Allowed values: read, write, delete, admin`
      );
    }
    actions.add(parsed.data);
  }

  return actions;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  const leaseStrategy =
    parsed.OUTLINE_LEASE_STRATEGY === "auto"
      ? parsed.OUTLINE_LEASE_ATTRIBUTE_ID
        ? "data_attribute"
        : "memory"
      : parsed.OUTLINE_LEASE_STRATEGY;

  const defaultTtlSeconds = Math.min(
    parsed.OUTLINE_LEASE_DEFAULT_TTL_SECONDS,
    parsed.OUTLINE_LEASE_MAX_TTL_SECONDS
  );

  return {
    apiKey: parsed.OUTLINE_API_KEY,
    baseUrl: parsed.OUTLINE_BASE_URL.replace(/\/$/, ""),
    allowedActions: parseAllowedActions(parsed.OUTLINE_ALLOWED_ACTIONS),
    requestTimeoutMs: parsed.OUTLINE_REQUEST_TIMEOUT_MS,
    retryCount: parsed.OUTLINE_RETRY_COUNT,
    capabilityProbeEnabled: parsed.OUTLINE_ENABLE_CAPABILITY_PROBE,
    lease: {
      strategy: leaseStrategy,
      defaultTtlSeconds,
      maxTtlSeconds: parsed.OUTLINE_LEASE_MAX_TTL_SECONDS,
      attributeId: parsed.OUTLINE_LEASE_ATTRIBUTE_ID
    }
  };
}
