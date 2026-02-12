import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { ToolContext } from "../context.js";
import { toDirection } from "../mappers.js";
import { assertAllowedAction } from "../permissions.js";
import { directionEnum } from "../schemas.js";
import { errorResult, successResult } from "../tool-responses.js";

export function registerLifecycleTools(server: McpServer, context: ToolContext): void {
  const { client, config } = context;

  server.tool(
    "archive_document",
    "Archive a document without deleting it",
    {
      document_id: z.string().min(1)
    },
    async ({ document_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const document = await client.archiveDocument({ id: document_id });

        return successResult({
          ok: true,
          tool: "archive_document",
          documentId: document.id,
          document
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "unarchive_document",
    "Restore an archived document to active status",
    {
      document_id: z.string().min(1)
    },
    async ({ document_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const document = await client.unarchiveDocument({ id: document_id });

        return successResult({
          ok: true,
          tool: "unarchive_document",
          documentId: document.id,
          document
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "restore_document",
    "Restore a document from trash",
    {
      document_id: z.string().min(1)
    },
    async ({ document_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const document = await client.restoreDocument({ id: document_id });

        return successResult({
          ok: true,
          tool: "restore_document",
          documentId: document.id,
          document
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "list_archived_documents",
    "List archived documents",
    {
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional()
    },
    async ({ limit = 25, offset = 0 }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const result = await client.listArchivedDocuments({
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
    "list_trash",
    "List documents currently in trash",
    {
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
      direction: directionEnum.optional()
    },
    async ({ limit = 25, offset = 0, direction }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const result = await client.listTrashDocuments({
          limit,
          offset,
          direction: toDirection(direction)
        });

        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
