import { describe, expect, it, vi } from "vitest";

import { registerBatchTools } from "../src/server/registrars/batch-registrar.js";
import { FakeMcpServer } from "./helpers/fake-mcp-server.js";
import { createToolContext } from "./helpers/test-context.js";
import { getToolResultText, parseToolResultJson } from "./helpers/tool-result.js";

describe("registerBatchTools", () => {
  it("returns partial success summary when batch update has mixed outcomes", async () => {
    const updateDocument = vi
      .fn()
      .mockResolvedValueOnce({ id: "doc-1", title: "Updated 1" })
      .mockRejectedValueOnce(new Error("update failed"));

    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        updateDocument
      } as never,
      allowedActions: ["read", "write"]
    });

    registerBatchTools(server as never, context);

    const result = await server.callTool("batch_update_documents", {
      updates: [
        { id: "doc-1", text: "one" },
        { id: "doc-2", text: "two" }
      ]
    });
    const payload = parseToolResultJson<{
      ok: boolean;
      tool: string;
      total: number;
      succeeded: number;
      failed: number;
      results: Array<{ ok: boolean; documentId?: string; error?: string }>;
    }>(result);

    expect(payload.ok).toBe(false);
    expect(payload.tool).toBe("batch_update_documents");
    expect(payload.total).toBe(2);
    expect(payload.succeeded).toBe(1);
    expect(payload.failed).toBe(1);
    expect(payload.results[1]?.ok).toBe(false);
    expect(payload.results[1]?.error).toContain("update failed");
  });

  it("returns explicit INVALID_INPUT error for batch move without destination", async () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        moveDocument: vi.fn()
      } as never,
      allowedActions: ["read", "write"]
    });

    registerBatchTools(server as never, context);

    const result = await server.callTool("batch_move_documents", {
      document_ids: ["doc-1"]
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(getToolResultText(result)).toContain("INVALID_INPUT");
  });

  it("keeps processing batch create and reports per-item validation failures", async () => {
    const createDocument = vi.fn().mockResolvedValueOnce({
      id: "doc-created"
    });

    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        createDocument
      } as never,
      allowedActions: ["read", "write"]
    });

    registerBatchTools(server as never, context);

    const result = await server.callTool("batch_create_documents", {
      documents: [
        { title: "invalid-no-target" },
        { title: "valid-doc", collection_id: "collection-1" }
      ]
    });
    const payload = parseToolResultJson<{
      total: number;
      succeeded: number;
      failed: number;
      results: Array<{ ok: boolean; error?: string; documentId?: string }>;
    }>(result);

    expect(payload.total).toBe(2);
    expect(payload.succeeded).toBe(1);
    expect(payload.failed).toBe(1);
    expect(payload.results[0]?.ok).toBe(false);
    expect(payload.results[0]?.error).toContain("INVALID_INPUT");
    expect(payload.results[1]?.ok).toBe(true);
    expect(payload.results[1]?.documentId).toBe("doc-created");
    expect(createDocument).toHaveBeenCalledTimes(1);
  });

  it("aggregates batch_delete_documents success and failure states", async () => {
    const deleteDocument = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        document: { id: "doc-1" }
      })
      .mockResolvedValueOnce({
        success: false
      });

    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        deleteDocument
      } as never,
      allowedActions: ["delete"]
    });

    registerBatchTools(server as never, context);

    const result = await server.callTool("batch_delete_documents", {
      document_ids: ["doc-1", "doc-2"],
      permanent: true
    });
    const payload = parseToolResultJson<{
      ok: boolean;
      succeeded: number;
      failed: number;
      results: Array<{ ok: boolean; documentId?: string; error?: string }>;
    }>(result);

    expect(payload.ok).toBe(false);
    expect(payload.succeeded).toBe(1);
    expect(payload.failed).toBe(1);
    expect(payload.results[0]?.ok).toBe(true);
    expect(payload.results[0]?.documentId).toBe("doc-1");
    expect(payload.results[1]?.ok).toBe(false);
    expect(payload.results[1]?.error).toContain("success=false");
    expect(deleteDocument).toHaveBeenNthCalledWith(1, {
      id: "doc-1",
      permanent: true
    });
    expect(deleteDocument).toHaveBeenNthCalledWith(2, {
      id: "doc-2",
      permanent: true
    });
  });
});
