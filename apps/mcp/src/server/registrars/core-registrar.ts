import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { shouldEnableCapability, toPublicCapabilities } from "../capabilities.js";
import type { ToolContext } from "../context.js";
import {
  mapDataAttributes,
  toDateFilter,
  toDirection,
  toSearchSort,
  toStatusFilter
} from "../mappers.js";
import { assertAllowedAction } from "../permissions.js";
import {
  dataAttributesInputSchema,
  dateFilterEnum,
  directionEnum,
  documentStatusEnum,
  editModeEnum,
  permissionEnum,
  searchSortEnum
} from "../schemas.js";
import { asJsonText, errorResult, successResult } from "../tool-responses.js";

export function registerCoreTools(server: McpServer, context: ToolContext): void {
  const { client, config, capabilities } = context;

  server.tool("server_info", "Show non-sensitive server runtime configuration", async () => {
    const summary = {
      baseUrl: config.baseUrl,
      allowedActions: [...config.allowedActions],
      requestTimeoutMs: config.requestTimeoutMs,
      retryCount: config.retryCount,
      capabilityProbeEnabled: config.capabilityProbeEnabled,
      lease: config.lease,
      capabilities: toPublicCapabilities(capabilities)
    };

    return successResult(summary);
  });

  server.tool(
    "list_collections",
    "List Outline collections",
    {
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
      query: z.string().min(1).optional(),
      direction: directionEnum.optional()
    },
    async ({ limit = 25, offset = 0, query, direction }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const result = await client.listCollections({
          limit,
          offset,
          query,
          direction: toDirection(direction)
        });

        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "get_collection_structure",
    "Get hierarchical document tree of a collection",
    {
      collection_id: z.string().min(1)
    },
    async ({ collection_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const tree = await client.getCollectionDocuments({ id: collection_id });

        return successResult({
          ok: true,
          tool: "get_collection_structure",
          collectionId: collection_id,
          tree
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "create_collection",
    "Create a collection",
    {
      name: z.string().min(1),
      description: z.string().optional(),
      permission: permissionEnum.optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      sharing: z.boolean().optional()
    },
    async ({ name, description, permission, icon, color, sharing }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const created = await client.createCollection({
          name,
          description,
          permission,
          icon,
          color,
          sharing
        });

        return successResult({
          ok: true,
          tool: "create_collection",
          collectionId: created.id,
          collection: created
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "update_collection",
    "Update a collection",
    {
      collection_id: z.string().min(1),
      name: z.string().optional(),
      description: z.string().optional(),
      permission: permissionEnum.optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      sharing: z.boolean().optional()
    },
    async ({ collection_id, name, description, permission, icon, color, sharing }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const hasAnyUpdateField =
          typeof name !== "undefined" ||
          typeof description !== "undefined" ||
          typeof permission !== "undefined" ||
          typeof icon !== "undefined" ||
          typeof color !== "undefined" ||
          typeof sharing !== "undefined";

        if (!hasAnyUpdateField) {
          throw new Error(
            "INVALID_INPUT: at least one update field must be provided (name, description, permission, icon, color, sharing)"
          );
        }

        const updated = await client.updateCollection({
          id: collection_id,
          name,
          description,
          permission,
          icon,
          color,
          sharing
        });

        return successResult({
          ok: true,
          tool: "update_collection",
          collectionId: collection_id,
          collection: updated
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "delete_collection",
    "Delete a collection",
    {
      collection_id: z.string().min(1)
    },
    async ({ collection_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "delete");

        const result = await client.deleteCollection({
          id: collection_id
        });

        return successResult({
          ok: result.success,
          tool: "delete_collection",
          collectionId: collection_id
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "read_document",
    "Read a single document by ID",
    {
      document_id: z.string().min(1),
      share_id: z.string().optional()
    },
    async ({ document_id, share_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const document = await client.getDocument({
          id: document_id,
          shareId: share_id
        });

        return successResult(document);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "export_document",
    "Export one document as markdown text",
    {
      document_id: z.string().min(1)
    },
    async ({ document_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const markdown = await client.exportDocument({
          id: document_id
        });

        return successResult({
          ok: true,
          tool: "export_document",
          documentId: document_id,
          markdown
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "search_documents",
    "Search documents with filtering, sorting and pagination",
    {
      query: z.string().min(1),
      collection_id: z.string().optional(),
      document_id: z.string().optional(),
      user_id: z.string().optional(),
      status_filter: z.array(documentStatusEnum).optional(),
      date_filter: dateFilterEnum.optional(),
      sort: searchSortEnum.optional(),
      direction: directionEnum.optional(),
      snippet_min_words: z.number().int().positive().optional(),
      snippet_max_words: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional()
    },
    async ({
      query,
      collection_id,
      document_id,
      user_id,
      status_filter,
      date_filter,
      sort,
      direction,
      snippet_min_words,
      snippet_max_words,
      limit = 25,
      offset = 0
    }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const result = await client.searchDocuments({
          query,
          collectionId: collection_id,
          documentId: document_id,
          userId: user_id,
          statusFilter: toStatusFilter(status_filter),
          dateFilter: toDateFilter(date_filter),
          sort: toSearchSort(sort),
          direction: toDirection(direction),
          snippetMinWords: snippet_min_words,
          snippetMaxWords: snippet_max_words,
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
    "get_document_id_from_title",
    "Find document ID by title query (exact-match prioritized)",
    {
      query: z.string().min(1),
      collection_id: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional()
    },
    async ({ query, collection_id, limit = 25 }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const result = await client.searchDocuments({
          query,
          collectionId: collection_id,
          limit,
          offset: 0
        });

        const exact = result.data.find(
          (hit) => hit.document?.title?.trim().toLowerCase() === query.trim().toLowerCase()
        );
        const best = exact ?? result.data[0];

        return successResult({
          ok: !!best,
          tool: "get_document_id_from_title",
          query,
          collectionId: collection_id,
          documentId: best?.document?.id,
          title: best?.document?.title,
          exactMatch: !!exact
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "get_document_backlinks",
    "List documents that link to a given document",
    {
      document_id: z.string().min(1),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
      direction: directionEnum.optional()
    },
    async ({ document_id, limit = 25, offset = 0, direction }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const result = await client.listDocumentBacklinks({
          documentId: document_id,
          limit,
          offset,
          direction: toDirection(direction)
        });

        return successResult({
          ok: true,
          tool: "get_document_backlinks",
          documentId: document_id,
          backlinks: result
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "ask_ai_about_documents",
    "Ask Outline AI a question scoped to documents/collection",
    {
      question: z.string().min(1),
      collection_id: z.string().optional(),
      document_id: z.string().optional()
    },
    async ({ question, collection_id, document_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const answer = await client.askAiAboutDocuments({
          query: question,
          collectionId: collection_id,
          documentId: document_id
        });

        return successResult({
          ok: true,
          tool: "ask_ai_about_documents",
          question,
          collectionId: collection_id,
          documentId: document_id,
          answer
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "list_templates",
    "List template documents",
    {
      collection_id: z.string().optional(),
      status_filter: z.array(documentStatusEnum).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
      direction: directionEnum.optional()
    },
    async ({ collection_id, status_filter, limit = 25, offset = 0, direction }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const result = await client.listDocuments({
          collectionId: collection_id,
          template: true,
          statusFilter: toStatusFilter(status_filter),
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
    "create_document",
    "Create a document",
    {
      title: z.string().min(1),
      text: z.string().optional(),
      collection_id: z.string().optional(),
      parent_document_id: z.string().optional(),
      publish: z.boolean().optional(),
      data_attributes: dataAttributesInputSchema
    },
    async ({ title, text, collection_id, parent_document_id, publish = true, data_attributes }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        if (!collection_id && !parent_document_id) {
          throw new Error(
            "INVALID_INPUT: one of collection_id or parent_document_id must be provided"
          );
        }

        const created = await client.createDocument({
          title,
          text,
          collectionId: collection_id,
          parentDocumentId: parent_document_id,
          publish,
          dataAttributes: mapDataAttributes(data_attributes)
        });

        return successResult({
          ok: true,
          tool: "create_document",
          documentId: created.id,
          revisionAfter: created.revision,
          document: created
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "update_document",
    "Update a document without revision precondition checks",
    {
      document_id: z.string().min(1),
      title: z.string().optional(),
      text: z.string().optional(),
      edit_mode: editModeEnum.optional(),
      publish: z.boolean().optional(),
      collection_id: z.string().optional(),
      data_attributes: dataAttributesInputSchema
    },
    async ({ document_id, title, text, edit_mode, publish, collection_id, data_attributes }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const hasAnyUpdateField =
          typeof title !== "undefined" ||
          typeof text !== "undefined" ||
          typeof publish !== "undefined" ||
          typeof collection_id !== "undefined" ||
          typeof data_attributes !== "undefined";

        if (!hasAnyUpdateField) {
          throw new Error(
            "INVALID_INPUT: at least one update field must be provided (title, text, publish, collection_id, data_attributes)"
          );
        }

        const current = await client.getDocument({ id: document_id });
        const updated = await client.updateDocument({
          id: document_id,
          title,
          text,
          editMode: edit_mode,
          publish,
          collectionId: collection_id,
          dataAttributes: mapDataAttributes(data_attributes)
        });

        return successResult({
          ok: true,
          tool: "update_document",
          documentId: document_id,
          revisionBefore: current.revision,
          revisionAfter: updated.revision,
          document: updated
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "move_document",
    "Move document to collection or parent",
    {
      document_id: z.string().min(1),
      collection_id: z.string().optional(),
      parent_document_id: z.string().optional(),
      index: z.number().int().nonnegative().optional()
    },
    async ({ document_id, collection_id, parent_document_id, index }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        if (!collection_id && !parent_document_id) {
          throw new Error(
            "INVALID_INPUT: one of collection_id or parent_document_id must be provided"
          );
        }

        const moved = await client.moveDocument({
          id: document_id,
          collectionId: collection_id,
          parentDocumentId: parent_document_id,
          index
        });

        return successResult({
          ok: true,
          tool: "move_document",
          documentId: document_id,
          document: moved
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "delete_document",
    "Delete document (trash by default, permanent when requested)",
    {
      document_id: z.string().min(1),
      permanent: z.boolean().optional()
    },
    async ({ document_id, permanent = false }) => {
      try {
        assertAllowedAction(config.allowedActions, "delete");

        const result = await client.deleteDocument({
          id: document_id,
          permanent
        });

        return successResult({
          ok: result.success,
          tool: "delete_document",
          documentId: document_id,
          permanent,
          document: result.document
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  if (shouldEnableCapability(capabilities.templatize)) {
    server.tool(
      "create_template_from_document",
      "Turn an existing document into a reusable template",
      {
        document_id: z.string().min(1),
        collection_id: z.string().optional(),
        publish: z.boolean().optional()
      },
      async ({ document_id, collection_id, publish = true }) => {
        try {
          assertAllowedAction(config.allowedActions, "write");

          const templated = await client.createTemplateFromDocument({
            id: document_id,
            collectionId: collection_id,
            publish
          });

          return successResult({
            ok: true,
            tool: "create_template_from_document",
            documentId: document_id,
            template: templated
          });
        } catch (error) {
          return errorResult(error);
        }
      }
    );
  }

  server.tool(
    "create_document_from_template",
    "Create a document from an existing template",
    {
      template_id: z.string().min(1),
      title: z.string().min(1).optional(),
      collection_id: z.string().optional(),
      parent_document_id: z.string().optional(),
      publish: z.boolean().optional(),
      data_attributes: dataAttributesInputSchema
    },
    async ({ template_id, title, collection_id, parent_document_id, publish = true, data_attributes }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        if (!collection_id && !parent_document_id) {
          throw new Error(
            "INVALID_INPUT: one of collection_id or parent_document_id must be provided"
          );
        }

        const created = await client.createDocument({
          templateId: template_id,
          title,
          collectionId: collection_id,
          parentDocumentId: parent_document_id,
          publish,
          dataAttributes: mapDataAttributes(data_attributes)
        });

        return successResult({
          ok: true,
          tool: "create_document_from_template",
          documentId: created.id,
          revisionAfter: created.revision,
          document: created
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "list_events",
    "List workspace audit events",
    {
      actor_id: z.string().optional(),
      document_id: z.string().optional(),
      collection_id: z.string().optional(),
      name: z.string().optional(),
      audit_log: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
      direction: directionEnum.optional()
    },
    async ({ actor_id, document_id, collection_id, name, audit_log, limit = 25, offset = 0, direction }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const result = await client.listEvents({
          actorId: actor_id,
          documentId: document_id,
          collectionId: collection_id,
          name,
          auditLog: audit_log,
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
    "list_revisions",
    "List document revisions",
    {
      document_id: z.string().min(1),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
      direction: directionEnum.optional()
    },
    async ({ document_id, limit = 25, offset = 0, direction }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const result = await client.listRevisions({
          documentId: document_id,
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

  if (shouldEnableCapability(capabilities.revisionInfo)) {
    server.tool(
      "get_revision",
      "Get a single revision snapshot by revision ID",
      {
        revision_id: z.string().min(1)
      },
      async ({ revision_id }) => {
        try {
          assertAllowedAction(config.allowedActions, "read");

          const revision = await client.getRevision({
            id: revision_id
          });

          return successResult({
            ok: true,
            tool: "get_revision",
            revision
          });
        } catch (error) {
          return errorResult(error);
        }
      }
    );
  }

  server.tool(
    "safe_update_document",
    "Update a document with revision conflict detection",
    {
      document_id: z.string().min(1),
      expected_revision: z.number().int().nonnegative(),
      title: z.string().optional(),
      text: z.string().optional(),
      edit_mode: editModeEnum.optional(),
      publish: z.boolean().optional(),
      collection_id: z.string().optional(),
      data_attributes: dataAttributesInputSchema,
      force: z.boolean().optional()
    },
    async ({
      document_id,
      expected_revision,
      title,
      text,
      edit_mode,
      publish,
      collection_id,
      data_attributes,
      force = false
    }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const hasAnyUpdateField =
          typeof title !== "undefined" ||
          typeof text !== "undefined" ||
          typeof publish !== "undefined" ||
          typeof collection_id !== "undefined" ||
          typeof data_attributes !== "undefined";

        if (!hasAnyUpdateField) {
          throw new Error(
            "INVALID_INPUT: at least one update field must be provided (title, text, publish, collection_id, data_attributes)"
          );
        }

        const current = await client.getDocument({ id: document_id });
        const revisionBefore = current.revision;

        if (typeof revisionBefore !== "number") {
          throw new Error("UPSTREAM_ERROR: current document revision is unavailable");
        }

        if (!force && revisionBefore !== expected_revision) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: asJsonText({
                  ok: false,
                  error: "CONFLICT_DETECTED",
                  tool: "safe_update_document",
                  documentId: document_id,
                  expectedRevision: expected_revision,
                  currentRevision: revisionBefore,
                  message: "Document revision changed since last read"
                })
              }
            ]
          };
        }

        const updated = await client.updateDocument({
          id: document_id,
          title,
          text,
          editMode: edit_mode,
          publish,
          collectionId: collection_id,
          dataAttributes: mapDataAttributes(data_attributes)
        });

        return successResult({
          ok: true,
          tool: "safe_update_document",
          documentId: document_id,
          revisionBefore,
          revisionAfter: updated.revision,
          forced: force,
          document: updated
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
