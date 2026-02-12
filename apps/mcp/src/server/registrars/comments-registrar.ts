import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { shouldEnableCapability } from "../capabilities.js";
import type { ToolContext } from "../context.js";
import { assertAllowedAction } from "../permissions.js";
import { errorResult, successResult } from "../tool-responses.js";

export function registerCommentTools(server: McpServer, context: ToolContext): void {
  const { client, config, capabilities } = context;

  if (!shouldEnableCapability(capabilities.comments)) {
    return;
  }

  server.tool(
    "list_comments",
    "List comments for a document or collection",
    {
      document_id: z.string().min(1).optional(),
      collection_id: z.string().min(1).optional(),
      include_anchor_text: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional()
    },
    async ({ document_id, collection_id, include_anchor_text, limit = 25, offset = 0 }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        if (!document_id && !collection_id) {
          throw new Error("INVALID_INPUT: one of document_id or collection_id must be provided");
        }

        const result = await client.listComments({
          documentId: document_id,
          collectionId: collection_id,
          includeAnchorText: include_anchor_text,
          limit,
          offset
        });

        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "get_comment",
    "Get a single comment by ID",
    {
      comment_id: z.string().min(1),
      include_anchor_text: z.boolean().optional()
    },
    async ({ comment_id, include_anchor_text }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const comment = await client.getComment({
          id: comment_id,
          includeAnchorText: include_anchor_text
        });

        return successResult({
          ok: true,
          tool: "get_comment",
          comment
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "create_comment",
    "Create a new comment on a document",
    {
      document_id: z.string().min(1),
      text: z.string().min(1),
      parent_comment_id: z.string().optional()
    },
    async ({ document_id, text, parent_comment_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const comment = await client.createComment({
          documentId: document_id,
          parentCommentId: parent_comment_id,
          data: { text }
        });

        return successResult({
          ok: true,
          tool: "create_comment",
          documentId: document_id,
          comment
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "update_comment",
    "Update an existing comment",
    {
      comment_id: z.string().min(1),
      text: z.string().min(1)
    },
    async ({ comment_id, text }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const comment = await client.updateComment({
          id: comment_id,
          data: { text }
        });

        return successResult({
          ok: true,
          tool: "update_comment",
          commentId: comment_id,
          comment
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "delete_comment",
    "Delete a comment",
    {
      comment_id: z.string().min(1)
    },
    async ({ comment_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "delete");

        const result = await client.deleteComment({
          id: comment_id
        });

        return successResult({
          ok: result.success,
          tool: "delete_comment",
          commentId: comment_id,
          comment: result.comment
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
