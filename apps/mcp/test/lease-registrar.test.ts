import { describe, expect, it, vi } from "vitest";

import { registerLeaseTools } from "../src/server/registrars/lease-registrar.js";
import { FakeMcpServer } from "./helpers/fake-mcp-server.js";
import { createToolContext } from "./helpers/test-context.js";
import { getToolResultText, parseToolResultJson } from "./helpers/tool-result.js";

describe("registerLeaseTools", () => {
  it("maps acquire_document_lease to lease service payload", async () => {
    const acquire = vi.fn().mockResolvedValue({
      documentId: "doc-1",
      leaseToken: "lease-1"
    });
    const server = new FakeMcpServer();
    const context = createToolContext({
      leaseService: {
        acquire,
        renew: vi.fn(),
        release: vi.fn(),
        getActive: vi.fn()
      } as never,
      allowedActions: ["write"]
    });

    registerLeaseTools(server as never, context);

    const result = await server.callTool("acquire_document_lease", {
      document_id: "doc-1",
      agent_id: "agent-a",
      ttl_seconds: 90,
      reason: "editing"
    });
    const payload = parseToolResultJson<{ ok: boolean; tool: string; lease?: { leaseToken: string } }>(result);

    expect(acquire).toHaveBeenCalledWith({
      documentId: "doc-1",
      agentId: "agent-a",
      ttlSeconds: 90,
      reason: "editing"
    });
    expect(payload.ok).toBe(true);
    expect(payload.tool).toBe("acquire_document_lease");
    expect(payload.lease?.leaseToken).toBe("lease-1");
  });

  it("maps renew and release lease payloads", async () => {
    const renew = vi.fn().mockResolvedValue({
      documentId: "doc-1",
      leaseToken: "lease-renewed"
    });
    const release = vi.fn().mockResolvedValue({
      documentId: "doc-1",
      leaseToken: "lease-renewed"
    });
    const server = new FakeMcpServer();
    const context = createToolContext({
      leaseService: {
        acquire: vi.fn(),
        renew,
        release,
        getActive: vi.fn()
      } as never,
      allowedActions: ["write"]
    });

    registerLeaseTools(server as never, context);

    await server.callTool("renew_document_lease", {
      document_id: "doc-1",
      lease_token: "lease-old",
      ttl_seconds: 120
    });
    await server.callTool("release_document_lease", {
      document_id: "doc-1",
      lease_token: "lease-renewed"
    });

    expect(renew).toHaveBeenCalledWith({
      documentId: "doc-1",
      leaseToken: "lease-old",
      ttlSeconds: 120
    });
    expect(release).toHaveBeenCalledWith({
      documentId: "doc-1",
      leaseToken: "lease-renewed"
    });
  });

  it("returns permission denied for write lease tools when write action is disabled", async () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      leaseService: {
        acquire: vi.fn(),
        renew: vi.fn(),
        release: vi.fn(),
        getActive: vi.fn()
      } as never,
      allowedActions: ["read"]
    });

    registerLeaseTools(server as never, context);

    const result = await server.callTool("acquire_document_lease", {
      document_id: "doc-1",
      agent_id: "agent-a"
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(getToolResultText(result)).toContain("PERMISSION_DENIED");
  });

  it("returns permission denied for get_active_document_lease when read action is disabled", async () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      leaseService: {
        acquire: vi.fn(),
        renew: vi.fn(),
        release: vi.fn(),
        getActive: vi.fn()
      } as never,
      allowedActions: ["write"]
    });

    registerLeaseTools(server as never, context);

    const result = await server.callTool("get_active_document_lease", {
      document_id: "doc-1"
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(getToolResultText(result)).toContain("PERMISSION_DENIED");
  });
});
