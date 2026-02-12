import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { ToolContext } from "../context.js";
import { toDirection } from "../mappers.js";
import { assertAllowedAction } from "../permissions.js";
import { directionEnum, permissionEnum } from "../schemas.js";
import { errorResult, successResult } from "../tool-responses.js";

export function registerMembershipTools(server: McpServer, context: ToolContext): void {
  const { client, config } = context;

  server.tool(
    "list_document_users",
    "List all users with access to a document",
    {
      document_id: z.string().min(1),
      query: z.string().optional(),
      user_id: z.string().optional()
    },
    async ({ document_id, query, user_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");
        const result = await client.listDocumentUsers({
          id: document_id,
          query,
          userId: user_id
        });
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "list_document_memberships",
    "List direct document user memberships",
    {
      document_id: z.string().min(1),
      query: z.string().optional(),
      permission: permissionEnum.optional()
    },
    async ({ document_id, query, permission }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");
        const result = await client.listDocumentMemberships({
          id: document_id,
          query,
          permission
        });
        return successResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "list_document_group_memberships",
    "List direct document group memberships",
    {
      document_id: z.string().min(1),
      query: z.string().optional(),
      permission: permissionEnum.optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
      direction: directionEnum.optional()
    },
    async ({ document_id, query, permission, limit, offset, direction }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");
        const result = await client.listDocumentGroupMemberships({
          id: document_id,
          query,
          permission,
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
    "add_document_user",
    "Grant a user direct access to a document",
    {
      document_id: z.string().min(1),
      user_id: z.string().min(1),
      permission: permissionEnum.optional()
    },
    async ({ document_id, user_id, permission }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");
        const result = await client.addDocumentUser({
          id: document_id,
          userId: user_id,
          permission
        });
        return successResult({
          ok: true,
          tool: "add_document_user",
          documentId: document_id,
          userId: user_id,
          result
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "remove_document_user",
    "Revoke a user's direct access to a document",
    {
      document_id: z.string().min(1),
      user_id: z.string().min(1)
    },
    async ({ document_id, user_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");
        const result = await client.removeDocumentUser({
          id: document_id,
          userId: user_id
        });
        return successResult({
          ok: true,
          tool: "remove_document_user",
          documentId: document_id,
          userId: user_id,
          result
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "add_document_group",
    "Grant a group direct access to a document",
    {
      document_id: z.string().min(1),
      group_id: z.string().min(1),
      permission: permissionEnum.optional()
    },
    async ({ document_id, group_id, permission }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");
        const result = await client.addDocumentGroup({
          id: document_id,
          groupId: group_id,
          permission
        });
        return successResult({
          ok: true,
          tool: "add_document_group",
          documentId: document_id,
          groupId: group_id,
          result
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "remove_document_group",
    "Revoke a group's direct access to a document",
    {
      document_id: z.string().min(1),
      group_id: z.string().min(1)
    },
    async ({ document_id, group_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");
        const result = await client.removeDocumentGroup({
          id: document_id,
          groupId: group_id
        });
        return successResult({
          ok: true,
          tool: "remove_document_group",
          documentId: document_id,
          groupId: group_id,
          result
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "list_collection_memberships",
    "List direct collection user memberships",
    {
      collection_id: z.string().min(1),
      query: z.string().optional(),
      permission: permissionEnum.optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
      direction: directionEnum.optional()
    },
    async ({ collection_id, query, permission, limit, offset, direction }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");
        const result = await client.listCollectionMemberships({
          id: collection_id,
          query,
          permission,
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
    "list_collection_group_memberships",
    "List direct collection group memberships",
    {
      collection_id: z.string().min(1),
      query: z.string().optional(),
      permission: permissionEnum.optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
      direction: directionEnum.optional()
    },
    async ({ collection_id, query, permission, limit, offset, direction }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");
        const result = await client.listCollectionGroupMemberships({
          id: collection_id,
          query,
          permission,
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
    "add_collection_user",
    "Grant a user access to a collection",
    {
      collection_id: z.string().min(1),
      user_id: z.string().min(1),
      permission: permissionEnum.optional()
    },
    async ({ collection_id, user_id, permission }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");
        const result = await client.addCollectionUser({
          id: collection_id,
          userId: user_id,
          permission
        });
        return successResult({
          ok: true,
          tool: "add_collection_user",
          collectionId: collection_id,
          userId: user_id,
          result
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "remove_collection_user",
    "Revoke a user's access from a collection",
    {
      collection_id: z.string().min(1),
      user_id: z.string().min(1)
    },
    async ({ collection_id, user_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");
        const result = await client.removeCollectionUser({
          id: collection_id,
          userId: user_id
        });
        return successResult({
          ok: true,
          tool: "remove_collection_user",
          collectionId: collection_id,
          userId: user_id,
          result
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "add_collection_group",
    "Grant a group access to a collection",
    {
      collection_id: z.string().min(1),
      group_id: z.string().min(1),
      permission: permissionEnum.optional()
    },
    async ({ collection_id, group_id, permission }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");
        const result = await client.addCollectionGroup({
          id: collection_id,
          groupId: group_id,
          permission
        });
        return successResult({
          ok: true,
          tool: "add_collection_group",
          collectionId: collection_id,
          groupId: group_id,
          result
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "remove_collection_group",
    "Revoke a group's access from a collection",
    {
      collection_id: z.string().min(1),
      group_id: z.string().min(1)
    },
    async ({ collection_id, group_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");
        const result = await client.removeCollectionGroup({
          id: collection_id,
          groupId: group_id
        });
        return successResult({
          ok: true,
          tool: "remove_collection_group",
          collectionId: collection_id,
          groupId: group_id,
          result
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
