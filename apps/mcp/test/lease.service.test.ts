import { describe, expect, it } from "vitest";

import type { AcquireLeaseInput, LeaseRecord, ReleaseLeaseInput, RenewLeaseInput } from "../src/domain/lease.js";
import { LeaseValidationError } from "../src/services/lease/errors.js";
import { LeaseService } from "../src/services/lease/lease-service.js";
import type { LeaseStore } from "../src/services/lease/store.js";

class StubLeaseStore implements LeaseStore {
  readonly backend = "memory" as const;

  async acquire(input: AcquireLeaseInput): Promise<LeaseRecord> {
    return {
      documentId: input.documentId,
      agentId: input.agentId,
      leaseToken: "lease-token",
      acquiredAt: new Date(0).toISOString(),
      expiresAt: new Date(input.ttlSeconds * 1000).toISOString(),
      backend: this.backend
    };
  }

  async renew(input: RenewLeaseInput): Promise<LeaseRecord> {
    return {
      documentId: input.documentId,
      agentId: "agent-a",
      leaseToken: input.leaseToken,
      acquiredAt: new Date(0).toISOString(),
      expiresAt: new Date(input.ttlSeconds * 1000).toISOString(),
      backend: this.backend
    };
  }

  async release(input: ReleaseLeaseInput): Promise<LeaseRecord> {
    return {
      documentId: input.documentId,
      agentId: "agent-a",
      leaseToken: input.leaseToken,
      acquiredAt: new Date(0).toISOString(),
      expiresAt: new Date(60_000).toISOString(),
      backend: this.backend
    };
  }

  async getActive(_documentId: string): Promise<LeaseRecord | null> {
    return null;
  }
}

describe("LeaseService", () => {
  it("uses default ttl when ttlSeconds is omitted", async () => {
    const service = new LeaseService(new StubLeaseStore(), {
      defaultTtlSeconds: 600,
      maxTtlSeconds: 7200
    });

    const lease = await service.acquire({
      documentId: "doc-1",
      agentId: "agent-a"
    });

    expect(new Date(lease.expiresAt).getTime()).toBe(600_000);
  });

  it("throws validation error when ttlSeconds exceeds max", async () => {
    const service = new LeaseService(new StubLeaseStore(), {
      defaultTtlSeconds: 600,
      maxTtlSeconds: 3600
    });

    await expect(
      service.acquire({
        documentId: "doc-1",
        agentId: "agent-a",
        ttlSeconds: 3601
      })
    ).rejects.toBeInstanceOf(LeaseValidationError);
  });

  it("throws validation error when document id is blank", async () => {
    const service = new LeaseService(new StubLeaseStore(), {
      defaultTtlSeconds: 600,
      maxTtlSeconds: 3600
    });

    await expect(
      service.acquire({
        documentId: " ",
        agentId: "agent-a",
        ttlSeconds: 60
      })
    ).rejects.toBeInstanceOf(LeaseValidationError);
  });
});
