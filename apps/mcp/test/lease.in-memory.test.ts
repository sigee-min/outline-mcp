import { describe, expect, it, vi } from "vitest";

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

  it("replaces lease when same agent reacquires the document", async () => {
    const store = new InMemoryLeaseStore();

    const first = await store.acquire({
      documentId: "doc-4",
      agentId: "agent-a",
      ttlSeconds: 60
    });
    const second = await store.acquire({
      documentId: "doc-4",
      agentId: "agent-a",
      ttlSeconds: 120
    });

    expect(second.documentId).toBe("doc-4");
    expect(second.agentId).toBe("agent-a");
    expect(second.leaseToken).not.toBe(first.leaseToken);
  });

  it("expires a lease and allows another agent to acquire afterwards", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      const store = new InMemoryLeaseStore();

      await store.acquire({
        documentId: "doc-5",
        agentId: "agent-a",
        ttlSeconds: 1
      });

      vi.setSystemTime(new Date("2026-01-01T00:00:02.000Z"));
      await expect(store.getActive("doc-5")).resolves.toBeNull();

      const nextLease = await store.acquire({
        documentId: "doc-5",
        agentId: "agent-b",
        ttlSeconds: 60
      });

      expect(nextLease.agentId).toBe("agent-b");
    } finally {
      vi.useRealTimers();
    }
  });
});
