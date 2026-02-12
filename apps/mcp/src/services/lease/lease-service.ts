import type { AcquireLeaseInput, ReleaseLeaseInput, RenewLeaseInput } from "../../domain/lease.js";
import type { LeaseStore } from "./store.js";
import { LeaseValidationError } from "./errors.js";

type LeaseServiceConfig = {
  defaultTtlSeconds: number;
  maxTtlSeconds: number;
};

export class LeaseService {
  constructor(
    private readonly store: LeaseStore,
    private readonly config: LeaseServiceConfig
  ) {}

  async acquire(input: {
    documentId: string;
    agentId: string;
    ttlSeconds?: number;
    reason?: string;
  }) {
    this.assertRequired(input.documentId, "documentId is required");
    this.assertRequired(input.agentId, "agentId is required");

    const ttlSeconds = this.normalizeTtl(input.ttlSeconds);
    const payload: AcquireLeaseInput = {
      documentId: input.documentId,
      agentId: input.agentId,
      ttlSeconds,
      reason: input.reason
    };

    return this.store.acquire(payload);
  }

  async renew(input: {
    documentId: string;
    leaseToken: string;
    ttlSeconds?: number;
  }) {
    this.assertRequired(input.documentId, "documentId is required");
    this.assertRequired(input.leaseToken, "leaseToken is required");

    const ttlSeconds = this.normalizeTtl(input.ttlSeconds);
    const payload: RenewLeaseInput = {
      documentId: input.documentId,
      leaseToken: input.leaseToken,
      ttlSeconds
    };

    return this.store.renew(payload);
  }

  async release(input: {
    documentId: string;
    leaseToken: string;
  }) {
    this.assertRequired(input.documentId, "documentId is required");
    this.assertRequired(input.leaseToken, "leaseToken is required");

    const payload: ReleaseLeaseInput = {
      documentId: input.documentId,
      leaseToken: input.leaseToken
    };

    return this.store.release(payload);
  }

  async getActive(documentId: string) {
    this.assertRequired(documentId, "documentId is required");
    return this.store.getActive(documentId);
  }

  private normalizeTtl(inputTtlSeconds: number | undefined): number {
    const ttl = inputTtlSeconds ?? this.config.defaultTtlSeconds;

    if (!Number.isInteger(ttl) || ttl <= 0) {
      throw new LeaseValidationError("ttlSeconds must be a positive integer");
    }

    if (ttl > this.config.maxTtlSeconds) {
      throw new LeaseValidationError(
        `ttlSeconds cannot exceed ${this.config.maxTtlSeconds}`
      );
    }

    return ttl;
  }

  private assertRequired(value: string, message: string): void {
    if (!value || value.trim().length === 0) {
      throw new LeaseValidationError(message);
    }
  }
}
