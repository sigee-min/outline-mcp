import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Variables } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";

import type { AllowedAction } from "../../config.js";
import type { CollectionDocumentNode, OutlineCollection, OutlineDocument } from "../../outline/types.js";
import type { ToolContext } from "../context.js";
import { assertAllowedAction } from "../permissions.js";
import { formatError } from "../tool-responses.js";

function resolveTemplateVariable(variables: Variables, key: string): string {
  const value = variables[key];

  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    return value[0];
  }

  throw new Error(`INVALID_RESOURCE_URI: missing template variable "${key}"`);
}

function toTextResource(uri: URL, text: string, mimeType = "text/plain"): {
  contents: Array<{ uri: string; mimeType: string; text: string }>;
} {
  return {
    contents: [
      {
        uri: uri.toString(),
        mimeType,
        text
      }
    ]
  };
}

function formatCollectionMetadata(collection: OutlineCollection): string {
  const rows = [
    `# ${collection.name}`,
    "",
    `- id: ${collection.id}`,
    `- permission: ${collection.permission ?? "unknown"}`,
    `- sharing: ${collection.sharing ? "enabled" : "disabled"}`
  ];

  if (collection.description) {
    rows.push(`- description: ${collection.description}`);
  }

  if (collection.color) {
    rows.push(`- color: ${collection.color}`);
  }

  if (collection.updatedAt) {
    rows.push(`- updated_at: ${collection.updatedAt}`);
  }

  return rows.join("\n");
}

function formatCollectionTree(nodes: CollectionDocumentNode[], depth = 0): string {
  return nodes
    .map((node) => {
      const indent = "  ".repeat(depth);
      const line = `${indent}- ${node.title} (${node.id})`;
      const children = node.children?.length ? `\n${formatCollectionTree(node.children, depth + 1)}` : "";
      return `${line}${children}`;
    })
    .join("\n");
}

function formatDocumentList(documents: OutlineDocument[]): string {
  if (documents.length === 0) {
    return "No documents.";
  }

  return documents
    .map((document) => {
      const updatedAt = document.updatedAt ? ` | updated_at=${document.updatedAt}` : "";
      return `- ${document.title} (${document.id})${updatedAt}`;
    })
    .join("\n");
}

function formatBacklinks(documents: OutlineDocument[]): string {
  if (documents.length === 0) {
    return "No backlinks found.";
  }

  return documents.map((document) => `- ${document.title} (${document.id})`).join("\n");
}

function formatDocumentMarkdown(document: OutlineDocument): string {
  if (typeof document.text === "string" && document.text.length > 0) {
    return document.text;
  }

  return `# ${document.title}\n`;
}

async function safeReadResource(
  uri: URL,
  allowedActions: Set<AllowedAction>,
  read: () => Promise<string>,
  mimeType: string
): Promise<{
  contents: Array<{ uri: string; mimeType: string; text: string }>;
}> {
  try {
    assertAllowedAction(allowedActions, "read");
    const text = await read();
    return toTextResource(uri, text, mimeType);
  } catch (error) {
    return toTextResource(uri, `ERROR: ${formatError(error)}`, "text/plain");
  }
}

export function registerOutlineResources(server: McpServer, context: ToolContext): void {
  const { client, config } = context;

  server.registerResource(
    "collection_metadata",
    new ResourceTemplate("outline://collection/{collection_id}", { list: undefined }),
    {
      title: "Outline Collection Metadata",
      description: "Read collection metadata and configuration details.",
      mimeType: "text/markdown"
    },
    async (uri, variables) => {
      return safeReadResource(
        uri,
        config.allowedActions,
        async () => {
          const collectionId = resolveTemplateVariable(variables, "collection_id");
          const collection = await client.getCollection({ id: collectionId });
          return formatCollectionMetadata(collection);
        },
        "text/markdown"
      );
    }
  );

  server.registerResource(
    "collection_tree",
    new ResourceTemplate("outline://collection/{collection_id}/tree", { list: undefined }),
    {
      title: "Outline Collection Tree",
      description: "Read the hierarchical document tree of a collection.",
      mimeType: "text/plain"
    },
    async (uri, variables) => {
      return safeReadResource(
        uri,
        config.allowedActions,
        async () => {
          const collectionId = resolveTemplateVariable(variables, "collection_id");
          const tree = await client.getCollectionDocuments({ id: collectionId });
          if (tree.data.length === 0) {
            return "No documents in this collection.";
          }
          return formatCollectionTree(tree.data);
        },
        "text/plain"
      );
    }
  );

  server.registerResource(
    "collection_documents",
    new ResourceTemplate("outline://collection/{collection_id}/documents", { list: undefined }),
    {
      title: "Outline Collection Documents",
      description: "Read the flat document list for a collection.",
      mimeType: "text/plain"
    },
    async (uri, variables) => {
      return safeReadResource(
        uri,
        config.allowedActions,
        async () => {
          const collectionId = resolveTemplateVariable(variables, "collection_id");
          const documents = await client.listDocuments({
            collectionId,
            limit: 100,
            offset: 0
          });
          return formatDocumentList(documents.data);
        },
        "text/plain"
      );
    }
  );

  server.registerResource(
    "document_content",
    new ResourceTemplate("outline://document/{document_id}", { list: undefined }),
    {
      title: "Outline Document Content",
      description: "Read document markdown content directly by document ID.",
      mimeType: "text/markdown"
    },
    async (uri, variables) => {
      return safeReadResource(
        uri,
        config.allowedActions,
        async () => {
          const documentId = resolveTemplateVariable(variables, "document_id");
          const document = await client.getDocument({ id: documentId });
          return formatDocumentMarkdown(document);
        },
        "text/markdown"
      );
    }
  );

  server.registerResource(
    "document_backlinks",
    new ResourceTemplate("outline://document/{document_id}/backlinks", { list: undefined }),
    {
      title: "Outline Document Backlinks",
      description: "Read documents that reference the target document.",
      mimeType: "text/plain"
    },
    async (uri, variables) => {
      return safeReadResource(
        uri,
        config.allowedActions,
        async () => {
          const documentId = resolveTemplateVariable(variables, "document_id");
          const backlinks = await client.listDocumentBacklinks({
            documentId,
            limit: 100,
            offset: 0
          });
          return formatBacklinks(backlinks.data);
        },
        "text/plain"
      );
    }
  );
}
