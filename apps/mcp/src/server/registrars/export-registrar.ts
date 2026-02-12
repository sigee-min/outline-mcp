import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { ToolContext } from "../context.js";
import { toDirection } from "../mappers.js";
import { assertAllowedAction } from "../permissions.js";
import { directionEnum } from "../schemas.js";
import { errorResult, successResult } from "../tool-responses.js";

const exportFormatEnum = z.enum(["outline-markdown", "json", "html"]);
const fileOperationTypeEnum = z.enum(["import", "export"]);

export function registerExportTools(server: McpServer, context: ToolContext): void {
  const { client, config } = context;

  server.tool(
    "export_collection",
    "Start async export for a collection",
    {
      collection_id: z.string().min(1),
      format: exportFormatEnum.optional()
    },
    async ({ collection_id, format }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const fileOperation = await client.exportCollection({
          id: collection_id,
          format
        });

        return successResult({
          ok: !!fileOperation,
          tool: "export_collection",
          collectionId: collection_id,
          fileOperation
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "export_all_collections",
    "Start async export for all collections",
    {
      format: exportFormatEnum.optional(),
      include_attachments: z.boolean().optional(),
      include_private: z.boolean().optional()
    },
    async ({ format, include_attachments, include_private }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const fileOperation = await client.exportAllCollections({
          format,
          includeAttachments: include_attachments,
          includePrivate: include_private
        });

        return successResult({
          ok: !!fileOperation,
          tool: "export_all_collections",
          fileOperation
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "list_file_operations",
    "List file operations by type",
    {
      type: fileOperationTypeEnum,
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
      direction: directionEnum.optional()
    },
    async ({ type, limit = 25, offset = 0, direction }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const result = await client.listFileOperations({
          type,
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

  server.tool(
    "get_file_operation",
    "Get file operation details",
    {
      file_operation_id: z.string().min(1)
    },
    async ({ file_operation_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const fileOperation = await client.getFileOperation({
          id: file_operation_id
        });

        return successResult({
          ok: !!fileOperation,
          tool: "get_file_operation",
          fileOperation
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "download_file_operation",
    "Resolve redirect URL for a completed file operation",
    {
      file_operation_id: z.string().min(1)
    },
    async ({ file_operation_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const redirect = await client.getFileOperationRedirectUrl({
          id: file_operation_id
        });

        return successResult({
          ok: redirect.status >= 200 && redirect.status < 400,
          tool: "download_file_operation",
          fileOperationId: file_operation_id,
          redirect
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
