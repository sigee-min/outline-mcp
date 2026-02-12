import { describe, expect, it, vi } from "vitest";

import { registerLifecycleTools } from "../src/server/registrars/lifecycle-registrar.js";
import { FakeMcpServer } from "./helpers/fake-mcp-server.js";
import { createToolContext } from "./helpers/test-context.js";
import { getToolResultText, parseToolResultJson } from "./helpers/tool-result.js";

describe("registerLifecycleTools", () => {
  it("archives a document through the client and returns normalized payload", async () => {
    const archiveDocument = vi.fn().mockResolvedValue({
      id: "doc-1",
      title: "Doc 1"
    });
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        archiveDocument
      } as never,
      allowedActions: ["read", "write", "delete"]
    });

    registerLifecycleTools(server as never, context);

    const result = await server.callTool("archive_document", {
      document_id: "doc-1"
    });
    const payload = parseToolResultJson<{
      ok: boolean;
      tool: string;
      documentId: string;
    }>(result);

    expect(archiveDocument).toHaveBeenCalledWith({ id: "doc-1" });
    expect(payload).toMatchObject({
      ok: true,
      tool: "archive_document",
      documentId: "doc-1"
    });
  });

  it("returns permission error for write tools when write action is disabled", async () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        archiveDocument: vi.fn()
      } as never,
      allowedActions: ["read"]
    });

    registerLifecycleTools(server as never, context);

    const result = await server.callTool("archive_document", {
      document_id: "doc-denied"
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(getToolResultText(result)).toContain("PERMISSION_DENIED");
  });

  it("maps list_trash parameters to client shape including direction", async () => {
    const listTrashDocuments = vi.fn().mockResolvedValue({
      data: [],
      pagination: { offset: 5, limit: 10 }
    });
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        listTrashDocuments
      } as never,
      allowedActions: ["read"]
    });

    registerLifecycleTools(server as never, context);

    await server.callTool("list_trash", {
      limit: 10,
      offset: 5,
      direction: "DESC"
    });

    expect(listTrashDocuments).toHaveBeenCalledWith({
      limit: 10,
      offset: 5,
      direction: "DESC"
    });
  });

  it("maps list_archived_documents parameters to client shape", async () => {
    const listArchivedDocuments = vi.fn().mockResolvedValue({
      data: [],
      pagination: { offset: 20, limit: 50 }
    });
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        listArchivedDocuments
      } as never,
      allowedActions: ["read"]
    });

    registerLifecycleTools(server as never, context);

    await server.callTool("list_archived_documents", {
      limit: 50,
      offset: 20
    });

    expect(listArchivedDocuments).toHaveBeenCalledWith({
      limit: 50,
      offset: 20
    });
  });

  it("unarchives and restores document through client", async () => {
    const unarchiveDocument = vi.fn().mockResolvedValue({
      id: "doc-2",
      title: "Doc 2"
    });
    const restoreDocument = vi.fn().mockResolvedValue({
      id: "doc-3",
      title: "Doc 3"
    });
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        unarchiveDocument,
        restoreDocument
      } as never,
      allowedActions: ["read", "write"]
    });

    registerLifecycleTools(server as never, context);

    const unarchiveResult = await server.callTool("unarchive_document", {
      document_id: "doc-2"
    });
    const restoreResult = await server.callTool("restore_document", {
      document_id: "doc-3"
    });

    const unarchivePayload = parseToolResultJson<{ tool: string; documentId: string }>(unarchiveResult);
    const restorePayload = parseToolResultJson<{ tool: string; documentId: string }>(restoreResult);

    expect(unarchiveDocument).toHaveBeenCalledWith({ id: "doc-2" });
    expect(restoreDocument).toHaveBeenCalledWith({ id: "doc-3" });
    expect(unarchivePayload.tool).toBe("unarchive_document");
    expect(unarchivePayload.documentId).toBe("doc-2");
    expect(restorePayload.tool).toBe("restore_document");
    expect(restorePayload.documentId).toBe("doc-3");
  });
});
