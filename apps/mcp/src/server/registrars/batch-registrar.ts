import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { ToolContext } from "../context.js";
import { mapDataAttributes } from "../mappers.js";
import { assertAllowedAction } from "../permissions.js";
import { dataAttributesInputSchema, editModeEnum } from "../schemas.js";
import { errorResult, formatError, successResult } from "../tool-responses.js";

type BatchResultEntry = {
  index: number;
  ok: boolean;
  input: unknown;
  documentId?: string;
  error?: string;
};

function toBatchSummary(tool: string, results: BatchResultEntry[]): {
  ok: boolean;
  tool: string;
  total: number;
  succeeded: number;
  failed: number;
  results: BatchResultEntry[];
} {
  const succeeded = results.filter((item) => item.ok).length;
  const total = results.length;

  return {
    ok: succeeded === total,
    tool,
    total,
    succeeded,
    failed: total - succeeded,
    results
  };
}

function hasDocumentUpdateFields(update: {
  title?: string;
  text?: string;
  publish?: boolean;
  collection_id?: string;
  data_attributes?: Array<{ data_attribute_id: string; value: string | number | boolean }>;
}): boolean {
  return (
    typeof update.title !== "undefined" ||
    typeof update.text !== "undefined" ||
    typeof update.publish !== "undefined" ||
    typeof update.collection_id !== "undefined" ||
    typeof update.data_attributes !== "undefined"
  );
}

const documentIdsSchema = z.array(z.string().min(1)).min(1).max(100);

const batchUpdateInputSchema = z.array(
  z.object({
    id: z.string().min(1),
    title: z.string().optional(),
    text: z.string().optional(),
    edit_mode: editModeEnum.optional(),
    publish: z.boolean().optional(),
    collection_id: z.string().optional(),
    data_attributes: dataAttributesInputSchema
  })
);

const batchCreateInputSchema = z.array(
  z.object({
    title: z.string().min(1),
    text: z.string().optional(),
    collection_id: z.string().optional(),
    parent_document_id: z.string().optional(),
    publish: z.boolean().optional(),
    data_attributes: dataAttributesInputSchema
  })
);

export function registerBatchTools(server: McpServer, context: ToolContext): void {
  const { client, config } = context;

  server.tool(
    "batch_archive_documents",
    "Archive multiple documents sequentially",
    {
      document_ids: documentIdsSchema
    },
    async ({ document_ids }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const results: BatchResultEntry[] = [];

        for (const [index, documentId] of document_ids.entries()) {
          try {
            const document = await client.archiveDocument({ id: documentId });
            results.push({
              index,
              ok: true,
              input: documentId,
              documentId: document.id
            });
          } catch (error) {
            results.push({
              index,
              ok: false,
              input: documentId,
              documentId,
              error: formatError(error)
            });
          }
        }

        return successResult(toBatchSummary("batch_archive_documents", results));
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "batch_move_documents",
    "Move multiple documents to a collection or parent",
    {
      document_ids: documentIdsSchema,
      collection_id: z.string().optional(),
      parent_document_id: z.string().optional(),
      index: z.number().int().nonnegative().optional()
    },
    async ({ document_ids, collection_id, parent_document_id, index }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        if (!collection_id && !parent_document_id) {
          throw new Error('INVALID_INPUT: one of "collection_id" or "parent_document_id" must be provided');
        }

        const results: BatchResultEntry[] = [];

        for (const [entryIndex, documentId] of document_ids.entries()) {
          try {
            const document = await client.moveDocument({
              id: documentId,
              collectionId: collection_id,
              parentDocumentId: parent_document_id,
              index
            });

            results.push({
              index: entryIndex,
              ok: true,
              input: documentId,
              documentId: document.id
            });
          } catch (error) {
            results.push({
              index: entryIndex,
              ok: false,
              input: documentId,
              documentId,
              error: formatError(error)
            });
          }
        }

        return successResult(toBatchSummary("batch_move_documents", results));
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "batch_delete_documents",
    "Delete multiple documents (trash by default, permanent optional)",
    {
      document_ids: documentIdsSchema,
      permanent: z.boolean().optional()
    },
    async ({ document_ids, permanent = false }) => {
      try {
        assertAllowedAction(config.allowedActions, "delete");

        const results: BatchResultEntry[] = [];

        for (const [index, documentId] of document_ids.entries()) {
          try {
            const response = await client.deleteDocument({
              id: documentId,
              permanent
            });

            results.push({
              index,
              ok: response.success,
              input: documentId,
              documentId: response.document?.id ?? documentId,
              error: response.success ? undefined : "Delete operation returned success=false"
            });
          } catch (error) {
            results.push({
              index,
              ok: false,
              input: documentId,
              documentId,
              error: formatError(error)
            });
          }
        }

        return successResult(toBatchSummary("batch_delete_documents", results));
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "batch_update_documents",
    "Update multiple documents with per-document payloads",
    {
      updates: batchUpdateInputSchema.min(1).max(100)
    },
    async ({ updates }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const results: BatchResultEntry[] = [];

        for (const [index, update] of updates.entries()) {
          if (!hasDocumentUpdateFields(update)) {
            results.push({
              index,
              ok: false,
              input: update,
              documentId: update.id,
              error:
                "INVALID_INPUT: each update item must include at least one field among title, text, publish, collection_id, data_attributes"
            });
            continue;
          }

          try {
            const document = await client.updateDocument({
              id: update.id,
              title: update.title,
              text: update.text,
              editMode: update.edit_mode,
              publish: update.publish,
              collectionId: update.collection_id,
              dataAttributes: mapDataAttributes(update.data_attributes)
            });

            results.push({
              index,
              ok: true,
              input: update,
              documentId: document.id
            });
          } catch (error) {
            results.push({
              index,
              ok: false,
              input: update,
              documentId: update.id,
              error: formatError(error)
            });
          }
        }

        return successResult(toBatchSummary("batch_update_documents", results));
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "batch_create_documents",
    "Create multiple documents in one request loop",
    {
      documents: batchCreateInputSchema.min(1).max(100)
    },
    async ({ documents }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const results: BatchResultEntry[] = [];

        for (const [index, documentInput] of documents.entries()) {
          if (!documentInput.collection_id && !documentInput.parent_document_id) {
            results.push({
              index,
              ok: false,
              input: documentInput,
              error: 'INVALID_INPUT: each item must include "collection_id" or "parent_document_id"'
            });
            continue;
          }

          try {
            const document = await client.createDocument({
              title: documentInput.title,
              text: documentInput.text,
              collectionId: documentInput.collection_id,
              parentDocumentId: documentInput.parent_document_id,
              publish: documentInput.publish ?? true,
              dataAttributes: mapDataAttributes(documentInput.data_attributes)
            });

            results.push({
              index,
              ok: true,
              input: documentInput,
              documentId: document.id
            });
          } catch (error) {
            results.push({
              index,
              ok: false,
              input: documentInput,
              error: formatError(error)
            });
          }
        }

        return successResult(toBatchSummary("batch_create_documents", results));
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
