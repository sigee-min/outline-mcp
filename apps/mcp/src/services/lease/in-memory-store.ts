import { randomUUID } from "node:crypto";

import type {
  AcquireLeaseInput,
  LeaseRecord,
  ReleaseLeaseInput,
  RenewLeaseInput
} from "../../domain/lease.js";
import { LeaseConflictError, LeaseNotFoundError } from "./errors.js";
import type { LeaseStore } from "./store.js";

function nowDate(): Date {
  return new Date();
}

function isExpired(lease: LeaseRecord, at: Date): boolean {
  return new Date(lease.expiresAt).getTime() <= at.getTime();
}

export class InMemoryLeaseStore implements LeaseStore {
  readonly backend = "memory" as const;

  private readonly leases = new Map<string, LeaseRecord>();

  async acquire(input: AcquireLeaseInput): Promise<LeaseRecord> {
    const currentTime = nowDate();
    const existing = await this.getActive(input.documentId);

    if (existing && existing.agentId !== input.agentId) {
      throw new LeaseConflictError(existing);
    }

    const nextLease: LeaseRecord = {
      documentId: input.documentId,
      agentId: input.agentId,
      leaseToken: randomUUID(),
      reason: input.reason,
      acquiredAt: currentTime.toISOString(),
      expiresAt: new Date(currentTime.getTime() + input.ttlSeconds * 1000).toISOString(),
      backend: this.backend
    };

    this.leases.set(input.documentId, nextLease);
    return nextLease;
  }

  async renew(input: RenewLeaseInput): Promise<LeaseRecord> {
    const existing = await this.getActive(input.documentId);

    if (!existing) {
      throw new LeaseNotFoundError();
    }

    if (existing.leaseToken !== input.leaseToken) {
      throw new LeaseNotFoundError("LEASE_NOT_FOUND: lease token does not match active lease");
    }

    const currentTime = nowDate();
    const renewed: LeaseRecord = {
      ...existing,
      expiresAt: new Date(currentTime.getTime() + input.ttlSeconds * 1000).toISOString()
    };

    this.leases.set(input.documentId, renewed);
    return renewed;
  }

  async release(input: ReleaseLeaseInput): Promise<LeaseRecord> {
    const existing = await this.getActive(input.documentId);

    if (!existing) {
      throw new LeaseNotFoundError();
    }

    if (existing.leaseToken !== input.leaseToken) {
      throw new LeaseNotFoundError("LEASE_NOT_FOUND: lease token does not match active lease");
    }

    this.leases.delete(input.documentId);
    return existing;
  }

  async getActive(documentId: string): Promise<LeaseRecord | null> {
    const existing = this.leases.get(documentId);
    if (!existing) {
      return null;
    }

    const currentTime = nowDate();
    if (isExpired(existing, currentTime)) {
      this.leases.delete(documentId);
      return null;
    }

    return existing;
  }
}
