import { describe, expect, it, vi } from "vitest";

import { registerMembershipTools } from "../src/server/registrars/membership-registrar.js";
import { FakeMcpServer } from "./helpers/fake-mcp-server.js";
import { createToolContext } from "./helpers/test-context.js";
import { getToolResultText, parseToolResultJson } from "./helpers/tool-result.js";

describe("registerMembershipTools", () => {
  it("maps list_document_group_memberships parameters to client payload", async () => {
    const listDocumentGroupMemberships = vi.fn().mockResolvedValue({
      data: [],
      pagination: { limit: 25, offset: 0 }
    });
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        listDocumentGroupMemberships
      } as never,
      allowedActions: ["read"]
    });

    registerMembershipTools(server as never, context);

    await server.callTool("list_document_group_memberships", {
      document_id: "doc-1",
      query: "ops",
      permission: "read_write",
      limit: 10,
      offset: 5,
      direction: "DESC"
    });

    expect(listDocumentGroupMemberships).toHaveBeenCalledWith({
      id: "doc-1",
      query: "ops",
      permission: "read_write",
      limit: 10,
      offset: 5,
      direction: "DESC"
    });
  });

  it("maps add_collection_user payload and returns normalized response", async () => {
    const addCollectionUser = vi.fn().mockResolvedValue({ ok: true });
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        addCollectionUser
      } as never,
      allowedActions: ["write"]
    });

    registerMembershipTools(server as never, context);

    const result = await server.callTool("add_collection_user", {
      collection_id: "col-1",
      user_id: "user-1",
      permission: "read_write"
    });
    const payload = parseToolResultJson<{
      ok: boolean;
      tool: string;
      collectionId: string;
      userId: string;
    }>(result);

    expect(addCollectionUser).toHaveBeenCalledWith({
      id: "col-1",
      userId: "user-1",
      permission: "read_write"
    });
    expect(payload.ok).toBe(true);
    expect(payload.tool).toBe("add_collection_user");
    expect(payload.collectionId).toBe("col-1");
    expect(payload.userId).toBe("user-1");
  });

  it("returns permission denied for read tools when read action is missing", async () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        listDocumentUsers: vi.fn()
      } as never,
      allowedActions: ["write"]
    });

    registerMembershipTools(server as never, context);

    const result = await server.callTool("list_document_users", {
      document_id: "doc-1"
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(getToolResultText(result)).toContain("PERMISSION_DENIED");
  });

  it("returns permission denied for write tools when write action is missing", async () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        removeDocumentGroup: vi.fn()
      } as never,
      allowedActions: ["read"]
    });

    registerMembershipTools(server as never, context);

    const result = await server.callTool("remove_document_group", {
      document_id: "doc-1",
      group_id: "group-1"
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(getToolResultText(result)).toContain("PERMISSION_DENIED");
  });
});
