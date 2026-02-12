import { describe, expect, it } from "vitest";

import { InMemoryLeaseStore } from "../src/services/lease/in-memory-store.js";
import { LeaseConflictError, LeaseNotFoundError } from "../src/services/lease/errors.js";

describe("InMemoryLeaseStore", () => {
  it("acquires a lease when no active lease exists", async () => {
    const store = new InMemoryLeaseStore();

    const lease = await store.acquire({
      documentId: "doc-1",
      agentId: "agent-a",
      ttlSeconds: 60
    });

    expect(lease.documentId).toBe("doc-1");
    expect(lease.agentId).toBe("agent-a");
    expect(lease.leaseToken.length).toBeGreaterThan(0);
    expect(lease.backend).toBe("memory");
  });

  it("throws conflict when another agent holds active lease", async () => {
    const store = new InMemoryLeaseStore();

    await store.acquire({
      documentId: "doc-1",
      agentId: "agent-a",
      ttlSeconds: 60
    });

    await expect(
      store.acquire({
        documentId: "doc-1",
        agentId: "agent-b",
        ttlSeconds: 60
      })
    ).rejects.toBeInstanceOf(LeaseConflictError);
  });

  it("renews and releases lease with valid token", async () => {
    const store = new InMemoryLeaseStore();

    const lease = await store.acquire({
      documentId: "doc-2",
      agentId: "agent-a",
      ttlSeconds: 60
    });

    const renewed = await store.renew({
      documentId: "doc-2",
      leaseToken: lease.leaseToken,
      ttlSeconds: 120
    });

    expect(new Date(renewed.expiresAt).getTime()).toBeGreaterThan(new Date(lease.expiresAt).getTime());

    const released = await store.release({
      documentId: "doc-2",
      leaseToken: lease.leaseToken
    });

    expect(released.documentId).toBe("doc-2");
    await expect(
      store.getActive("doc-2")
    ).resolves.toBeNull();
  });

  it("throws not found on invalid token renew", async () => {
    const store = new InMemoryLeaseStore();

    await store.acquire({
      documentId: "doc-3",
      agentId: "agent-a",
      ttlSeconds: 60
    });

    await expect(
      store.renew({
        documentId: "doc-3",
        leaseToken: "bad-token",
        ttlSeconds: 10
      })
    ).rejects.toBeInstanceOf(LeaseNotFoundError);
  });
});
