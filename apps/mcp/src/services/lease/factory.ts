import type { AppConfig } from "../../config.js";
import type { OutlineClient } from "../../outline/client.js";
import { shouldEnableCapability, type ServerCapabilities } from "../../server/capabilities.js";
import { DataAttributeLeaseStore } from "./data-attribute-store.js";
import { InMemoryLeaseStore } from "./in-memory-store.js";
import { LeaseService } from "./lease-service.js";
import type { LeaseStore } from "./store.js";

function createLeaseStore(
  config: AppConfig,
  client: OutlineClient,
  capabilities: ServerCapabilities
): LeaseStore {
  if (config.lease.strategy === "data_attribute") {
    if (!shouldEnableCapability(capabilities.dataAttributes)) {
      return new InMemoryLeaseStore();
    }

    if (!config.lease.attributeId) {
      throw new Error(
        "OUTLINE_LEASE_ATTRIBUTE_ID is required when OUTLINE_LEASE_STRATEGY=data_attribute"
      );
    }

    return new DataAttributeLeaseStore(client, config.lease.attributeId);
  }

  return new InMemoryLeaseStore();
}

export function createLeaseService(
  config: AppConfig,
  client: OutlineClient,
  capabilities: ServerCapabilities
): LeaseService {
  const store = createLeaseStore(config, client, capabilities);
  return new LeaseService(store, {
    defaultTtlSeconds: config.lease.defaultTtlSeconds,
    maxTtlSeconds: config.lease.maxTtlSeconds
  });
}
