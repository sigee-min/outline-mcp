import { describe, expect, it, vi } from "vitest";

import { registerExportTools } from "../src/server/registrars/export-registrar.js";
import { FakeMcpServer } from "./helpers/fake-mcp-server.js";
import { createToolContext } from "./helpers/test-context.js";
import { getToolResultText, parseToolResultJson } from "./helpers/tool-result.js";

describe("registerExportTools", () => {
  it("maps export_all_collections options to client payload", async () => {
    const exportAllCollections = vi.fn().mockResolvedValue({
      id: "op-1",
      state: "processing"
    });
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        exportAllCollections
      } as never,
      allowedActions: ["read"]
    });

    registerExportTools(server as never, context);

    const result = await server.callTool("export_all_collections", {
      format: "json",
      include_attachments: true,
      include_private: false
    });
    const payload = parseToolResultJson<{ ok: boolean; tool: string; fileOperation?: { id: string } }>(result);

    expect(exportAllCollections).toHaveBeenCalledWith({
      format: "json",
      includeAttachments: true,
      includePrivate: false
    });
    expect(payload.ok).toBe(true);
    expect(payload.tool).toBe("export_all_collections");
    expect(payload.fileOperation?.id).toBe("op-1");
  });

  it("maps list_file_operations parameters including direction", async () => {
    const listFileOperations = vi.fn().mockResolvedValue({
      data: [],
      pagination: { limit: 10, offset: 5 }
    });
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        listFileOperations
      } as never,
      allowedActions: ["read"]
    });

    registerExportTools(server as never, context);

    await server.callTool("list_file_operations", {
      type: "export",
      limit: 10,
      offset: 5,
      direction: "DESC"
    });

    expect(listFileOperations).toHaveBeenCalledWith({
      type: "export",
      limit: 10,
      offset: 5,
      direction: "DESC"
    });
  });

  it("normalizes download_file_operation ok flag from redirect status", async () => {
    const getFileOperationRedirectUrl = vi
      .fn()
      .mockResolvedValueOnce({
        url: "https://download.example.com/file.zip",
        status: 302
      })
      .mockResolvedValueOnce({
        status: 404
      });
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        getFileOperationRedirectUrl
      } as never,
      allowedActions: ["read"]
    });

    registerExportTools(server as never, context);

    const successResult = await server.callTool("download_file_operation", {
      file_operation_id: "op-success"
    });
    const failResult = await server.callTool("download_file_operation", {
      file_operation_id: "op-fail"
    });
    const successPayload = parseToolResultJson<{ ok: boolean; redirect: { status: number } }>(successResult);
    const failPayload = parseToolResultJson<{ ok: boolean; redirect: { status: number } }>(failResult);

    expect(successPayload.ok).toBe(true);
    expect(successPayload.redirect.status).toBe(302);
    expect(failPayload.ok).toBe(false);
    expect(failPayload.redirect.status).toBe(404);
  });

  it("returns permission denied when read action is not enabled", async () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        exportCollection: vi.fn()
      } as never,
      allowedActions: []
    });

    registerExportTools(server as never, context);

    const result = await server.callTool("export_collection", {
      collection_id: "col-1"
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(getToolResultText(result)).toContain("PERMISSION_DENIED");
  });
});
