import { describe, expect, it, vi } from "vitest";

import { registerCommentTools } from "../src/server/registrars/comments-registrar.js";
import { FakeMcpServer } from "./helpers/fake-mcp-server.js";
import { createCapabilities, createToolContext } from "./helpers/test-context.js";
import { getToolResultText, parseToolResultJson } from "./helpers/tool-result.js";

describe("registerCommentTools", () => {
  it("does not register comment tools when comments capability is unavailable", () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      capabilities: createCapabilities("unavailable")
    });

    registerCommentTools(server as never, context);

    expect(server.listToolNames()).not.toContain("list_comments");
    expect(server.listToolNames()).not.toContain("create_comment");
  });

  it("returns INVALID_INPUT when list_comments has no document_id and no collection_id", async () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      capabilities: createCapabilities("available"),
      client: {
        listComments: vi.fn()
      } as never,
      allowedActions: ["read"]
    });

    registerCommentTools(server as never, context);

    const result = await server.callTool("list_comments", {});

    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(getToolResultText(result)).toContain("INVALID_INPUT");
  });

  it("maps create_comment payload to client", async () => {
    const createComment = vi.fn().mockResolvedValue({
      id: "comment-1",
      data: { text: "Hello" }
    });
    const server = new FakeMcpServer();
    const context = createToolContext({
      capabilities: createCapabilities("available"),
      client: {
        createComment
      } as never,
      allowedActions: ["write"]
    });

    registerCommentTools(server as never, context);

    const result = await server.callTool("create_comment", {
      document_id: "doc-1",
      text: "Hello",
      parent_comment_id: "comment-parent"
    });
    const payload = parseToolResultJson<{ ok: boolean; tool: string; documentId: string }>(result);

    expect(createComment).toHaveBeenCalledWith({
      documentId: "doc-1",
      parentCommentId: "comment-parent",
      data: { text: "Hello" }
    });
    expect(payload.ok).toBe(true);
    expect(payload.tool).toBe("create_comment");
    expect(payload.documentId).toBe("doc-1");
  });

  it("returns permission denied when deleting comment without delete action", async () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      capabilities: createCapabilities("available"),
      client: {
        deleteComment: vi.fn()
      } as never,
      allowedActions: ["read", "write"]
    });

    registerCommentTools(server as never, context);

    const result = await server.callTool("delete_comment", {
      comment_id: "comment-1"
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(getToolResultText(result)).toContain("PERMISSION_DENIED");
  });
});
