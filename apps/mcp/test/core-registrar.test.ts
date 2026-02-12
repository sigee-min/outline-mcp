import { describe, expect, it, vi } from "vitest";

import { registerCoreTools } from "../src/server/registrars/core-registrar.js";
import { FakeMcpServer } from "./helpers/fake-mcp-server.js";
import { createCapabilities, createToolContext } from "./helpers/test-context.js";
import { getToolResultText, parseToolResultJson } from "./helpers/tool-result.js";

describe("registerCoreTools", () => {
  it("returns exact match when resolving document id from title", async () => {
    const searchDocuments = vi.fn().mockResolvedValue({
      data: [
        { document: { id: "doc-1", title: "Release Plan" } },
        { document: { id: "doc-2", title: "Release Plan Draft" } }
      ]
    });

    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        searchDocuments
      } as never,
      capabilities: createCapabilities("available"),
      allowedActions: ["read"]
    });

    registerCoreTools(server as never, context);

    const result = await server.callTool("get_document_id_from_title", {
      query: "Release Plan"
    });
    const payload = parseToolResultJson<{
      ok: boolean;
      documentId?: string;
      exactMatch: boolean;
      title?: string;
    }>(result);

    expect(payload.ok).toBe(true);
    expect(payload.documentId).toBe("doc-1");
    expect(payload.exactMatch).toBe(true);
    expect(payload.title).toBe("Release Plan");
  });

  it("uses best match when exact title does not exist", async () => {
    const searchDocuments = vi.fn().mockResolvedValue({
      data: [{ document: { id: "doc-9", title: "Roadmap Q1" } }]
    });

    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        searchDocuments
      } as never,
      capabilities: createCapabilities("available"),
      allowedActions: ["read"]
    });

    registerCoreTools(server as never, context);

    const result = await server.callTool("get_document_id_from_title", {
      query: "Roadmap"
    });
    const payload = parseToolResultJson<{
      ok: boolean;
      documentId?: string;
      exactMatch: boolean;
    }>(result);

    expect(payload.ok).toBe(true);
    expect(payload.documentId).toBe("doc-9");
    expect(payload.exactMatch).toBe(false);
  });

  it("maps ask_ai_about_documents question to client query payload", async () => {
    const askAiAboutDocuments = vi.fn().mockResolvedValue({
      data: { answer: "It was updated yesterday." }
    });

    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        askAiAboutDocuments
      } as never,
      capabilities: createCapabilities("available"),
      allowedActions: ["read"]
    });

    registerCoreTools(server as never, context);

    const result = await server.callTool("ask_ai_about_documents", {
      question: "What changed?",
      collection_id: "col-1",
      document_id: "doc-1"
    });
    const payload = parseToolResultJson<{
      ok: boolean;
      answer?: Record<string, unknown>;
    }>(result);

    expect(askAiAboutDocuments).toHaveBeenCalledWith({
      query: "What changed?",
      collectionId: "col-1",
      documentId: "doc-1"
    });
    expect(payload.ok).toBe(true);
    expect(payload.answer).toMatchObject({
      data: { answer: "It was updated yesterday." }
    });
  });

  it("returns INVALID_INPUT when update_collection has no update fields", async () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        updateCollection: vi.fn()
      } as never,
      capabilities: createCapabilities("available"),
      allowedActions: ["write"]
    });

    registerCoreTools(server as never, context);

    const result = await server.callTool("update_collection", {
      collection_id: "col-1"
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(getToolResultText(result)).toContain("INVALID_INPUT");
  });

  it("returns INVALID_INPUT when create_document has no collection_id and no parent_document_id", async () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        createDocument: vi.fn()
      } as never,
      capabilities: createCapabilities("available"),
      allowedActions: ["write"]
    });

    registerCoreTools(server as never, context);

    const result = await server.callTool("create_document", {
      title: "Doc title"
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(getToolResultText(result)).toContain("INVALID_INPUT");
  });

  it("returns conflict payload when safe_update_document expected revision mismatches", async () => {
    const getDocument = vi.fn().mockResolvedValue({
      id: "doc-1",
      revision: 7
    });
    const updateDocument = vi.fn();
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        getDocument,
        updateDocument
      } as never,
      capabilities: createCapabilities("available"),
      allowedActions: ["read", "write"]
    });

    registerCoreTools(server as never, context);

    const result = await server.callTool("safe_update_document", {
      document_id: "doc-1",
      expected_revision: 6,
      title: "Changed"
    });
    const payload = parseToolResultJson<{
      ok: boolean;
      error: string;
      expectedRevision: number;
      currentRevision: number;
    }>(result);

    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe("CONFLICT_DETECTED");
    expect(payload.expectedRevision).toBe(6);
    expect(payload.currentRevision).toBe(7);
    expect(updateDocument).not.toHaveBeenCalled();
  });

  it("supports forced safe_update_document and updates despite revision mismatch", async () => {
    const getDocument = vi.fn().mockResolvedValue({
      id: "doc-2",
      revision: 10
    });
    const updateDocument = vi.fn().mockResolvedValue({
      id: "doc-2",
      revision: 11
    });
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        getDocument,
        updateDocument
      } as never,
      capabilities: createCapabilities("available"),
      allowedActions: ["read", "write"]
    });

    registerCoreTools(server as never, context);

    const result = await server.callTool("safe_update_document", {
      document_id: "doc-2",
      expected_revision: 3,
      title: "Forced update",
      force: true
    });
    const payload = parseToolResultJson<{
      ok: boolean;
      tool: string;
      documentId: string;
      revisionBefore: number;
      revisionAfter: number;
      forced: boolean;
    }>(result);

    expect(payload.ok).toBe(true);
    expect(payload.tool).toBe("safe_update_document");
    expect(payload.documentId).toBe("doc-2");
    expect(payload.revisionBefore).toBe(10);
    expect(payload.revisionAfter).toBe(11);
    expect(payload.forced).toBe(true);
    expect(updateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "doc-2",
        title: "Forced update"
      })
    );
  });

  it("registers get_revision only when revisionInfo capability is not unavailable", () => {
    const availableServer = new FakeMcpServer();
    registerCoreTools(
      availableServer as never,
      createToolContext({
        capabilities: createCapabilities("unknown")
      })
    );

    const unavailableServer = new FakeMcpServer();
    registerCoreTools(
      unavailableServer as never,
      createToolContext({
        capabilities: createCapabilities("unavailable")
      })
    );

    expect(availableServer.listToolNames()).toContain("get_revision");
    expect(unavailableServer.listToolNames()).not.toContain("get_revision");
  });
});
