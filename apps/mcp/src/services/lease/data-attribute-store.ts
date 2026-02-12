import { randomUUID } from "node:crypto";

import type {
  AcquireLeaseInput,
  LeaseRecord,
  ReleaseLeaseInput,
  RenewLeaseInput
} from "../../domain/lease.js";
import type { OutlineClient } from "../../outline/client.js";
import type { DocumentDataAttribute as OutlineDataAttribute, OutlineDocument } from "../../outline/types.js";
import { LeaseConflictError, LeaseNotFoundError } from "./errors.js";
import type { LeaseStore } from "./store.js";

type SerializedLease = {
  agentId: string;
  leaseToken: string;
  reason?: string;
  acquiredAt: string;
  expiresAt: string;
};

function nowDate(): Date {
  return new Date();
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

function toOutlineAttributes(
  attributes: OutlineDataAttribute[]
): OutlineDataAttribute[] {
  return attributes.map((attribute) => ({
    dataAttributeId: attribute.dataAttributeId,
    value: attribute.value
  }));
}

export class DataAttributeLeaseStore implements LeaseStore {
  readonly backend = "data_attribute" as const;

  constructor(
    private readonly client: OutlineClient,
    private readonly attributeId: string
  ) {}

  async acquire(input: AcquireLeaseInput): Promise<LeaseRecord> {
    const document = await this.client.getDocument({ id: input.documentId });
    const currentLease = this.extractLease(document);

    if (currentLease && currentLease.agentId !== input.agentId) {
      throw new LeaseConflictError(currentLease);
    }

    const currentTime = nowDate();
    const nextLease: LeaseRecord = {
      documentId: input.documentId,
      agentId: input.agentId,
      leaseToken: randomUUID(),
      reason: input.reason,
      acquiredAt: currentTime.toISOString(),
      expiresAt: new Date(currentTime.getTime() + input.ttlSeconds * 1000).toISOString(),
      backend: this.backend
    };

    const updatedAttributes = this.upsertLeaseAttribute(document, nextLease);
    await this.client.updateDocument({
      id: input.documentId,
      dataAttributes: toOutlineAttributes(updatedAttributes)
    });

    return nextLease;
  }

  async renew(input: RenewLeaseInput): Promise<LeaseRecord> {
    const document = await this.client.getDocument({ id: input.documentId });
    const currentLease = this.extractLease(document);

    if (!currentLease || currentLease.leaseToken !== input.leaseToken) {
      throw new LeaseNotFoundError("LEASE_NOT_FOUND: lease token does not match active lease");
    }

    const currentTime = nowDate();
    const renewedLease: LeaseRecord = {
      ...currentLease,
      expiresAt: new Date(currentTime.getTime() + input.ttlSeconds * 1000).toISOString()
    };

    const updatedAttributes = this.upsertLeaseAttribute(document, renewedLease);
    await this.client.updateDocument({
      id: input.documentId,
      dataAttributes: toOutlineAttributes(updatedAttributes)
    });

    return renewedLease;
  }

  async release(input: ReleaseLeaseInput): Promise<LeaseRecord> {
    const document = await this.client.getDocument({ id: input.documentId });
    const currentLease = this.extractLease(document);

    if (!currentLease || currentLease.leaseToken !== input.leaseToken) {
      throw new LeaseNotFoundError("LEASE_NOT_FOUND: lease token does not match active lease");
    }

    const updatedAttributes = this.removeLeaseAttribute(document);
    await this.client.updateDocument({
      id: input.documentId,
      dataAttributes: toOutlineAttributes(updatedAttributes)
    });

    return currentLease;
  }

  async getActive(documentId: string): Promise<LeaseRecord | null> {
    const document = await this.client.getDocument({ id: documentId });
    return this.extractLease(document);
  }

  private extractLease(document: OutlineDocument): LeaseRecord | null {
    const attributes = document.dataAttributes ?? [];
    const leaseAttribute = attributes.find((attribute) => attribute.dataAttributeId === this.attributeId);

    if (!leaseAttribute || typeof leaseAttribute.value !== "string") {
      return null;
    }

    let parsed: SerializedLease;
    try {
      parsed = JSON.parse(leaseAttribute.value) as SerializedLease;
    } catch {
      return null;
    }

    if (!parsed.agentId || !parsed.leaseToken || !parsed.acquiredAt || !parsed.expiresAt) {
      return null;
    }

    if (isExpired(parsed.expiresAt)) {
      return null;
    }

    return {
      documentId: document.id,
      agentId: parsed.agentId,
      leaseToken: parsed.leaseToken,
      reason: parsed.reason,
      acquiredAt: parsed.acquiredAt,
      expiresAt: parsed.expiresAt,
      backend: this.backend
    };
  }

  private upsertLeaseAttribute(document: OutlineDocument, lease: LeaseRecord): OutlineDataAttribute[] {
    const attributes = [...(document.dataAttributes ?? [])];
    const serializedLease: SerializedLease = {
      agentId: lease.agentId,
      leaseToken: lease.leaseToken,
      reason: lease.reason,
      acquiredAt: lease.acquiredAt,
      expiresAt: lease.expiresAt
    };

    const leaseValue = JSON.stringify(serializedLease);
    const targetIndex = attributes.findIndex((attribute) => attribute.dataAttributeId === this.attributeId);

    if (targetIndex >= 0) {
      attributes[targetIndex] = {
        dataAttributeId: this.attributeId,
        value: leaseValue
      };
      return attributes;
    }

    attributes.push({
      dataAttributeId: this.attributeId,
      value: leaseValue
    });

    return attributes;
  }

  private removeLeaseAttribute(document: OutlineDocument): OutlineDataAttribute[] {
    return (document.dataAttributes ?? []).filter((attribute) => attribute.dataAttributeId !== this.attributeId);
  }
}
