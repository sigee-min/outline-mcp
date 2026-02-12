import { describe, expect, it, vi } from "vitest";

import { registerOutlineResources } from "../src/server/registrars/resources-registrar.js";
import { FakeMcpServer } from "./helpers/fake-mcp-server.js";
import { createToolContext } from "./helpers/test-context.js";

type ReadResourceResult = {
  contents: Array<{ uri: string; mimeType?: string; text?: string }>;
};

describe("registerOutlineResources", () => {
  it("reads document content resource with markdown body", async () => {
    const getDocument = vi.fn().mockResolvedValue({
      id: "doc-1",
      title: "Doc 1",
      text: "# Hello"
    });

    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        getDocument
      } as never,
      allowedActions: ["read"]
    });

    registerOutlineResources(server as never, context);

    const result = (await server.readResource("document_content", "outline://document/doc-1", {
      document_id: "doc-1"
    })) as ReadResourceResult;

    expect(result.contents[0]?.mimeType).toBe("text/markdown");
    expect(result.contents[0]?.text).toBe("# Hello");
    expect(getDocument).toHaveBeenCalledWith({ id: "doc-1" });
  });

  it("returns PERMISSION_DENIED error payload when read action is disabled", async () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        getCollection: vi.fn()
      } as never,
      allowedActions: []
    });

    registerOutlineResources(server as never, context);

    const result = (await server.readResource(
      "collection_metadata",
      "outline://collection/collection-1",
      {
        collection_id: "collection-1"
      }
    )) as ReadResourceResult;

    expect(result.contents[0]?.mimeType).toBe("text/plain");
    expect(result.contents[0]?.text).toContain("PERMISSION_DENIED");
  });

  it("returns URI parsing error payload when template variable is missing", async () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        getDocument: vi.fn()
      } as never,
      allowedActions: ["read"]
    });

    registerOutlineResources(server as never, context);

    const result = (await server.readResource("document_content", "outline://document/missing")) as ReadResourceResult;

    expect(result.contents[0]?.text).toContain("INVALID_RESOURCE_URI");
    expect(result.contents[0]?.mimeType).toBe("text/plain");
  });

  it("reads collection metadata as markdown", async () => {
    const getCollection = vi.fn().mockResolvedValue({
      id: "col-1",
      name: "Engineering",
      permission: "read_write",
      sharing: true,
      description: "Team docs",
      color: "#00AAFF",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        getCollection
      } as never,
      allowedActions: ["read"]
    });

    registerOutlineResources(server as never, context);

    const result = (await server.readResource(
      "collection_metadata",
      "outline://collection/col-1",
      {
        collection_id: "col-1"
      }
    )) as ReadResourceResult;

    expect(result.contents[0]?.mimeType).toBe("text/markdown");
    expect(result.contents[0]?.text).toContain("# Engineering");
    expect(result.contents[0]?.text).toContain("- id: col-1");
  });

  it("reads collection tree and returns fallback when empty", async () => {
    const getCollectionDocuments = vi
      .fn()
      .mockResolvedValueOnce({
        data: [],
        pagination: { limit: 25, offset: 0 }
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "doc-parent",
            title: "Parent",
            children: [{ id: "doc-child", title: "Child", children: [] }]
          }
        ],
        pagination: { limit: 25, offset: 0 }
      });

    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        getCollectionDocuments
      } as never,
      allowedActions: ["read"]
    });

    registerOutlineResources(server as never, context);

    const emptyResult = (await server.readResource(
      "collection_tree",
      "outline://collection/col-1/tree",
      {
        collection_id: "col-1"
      }
    )) as ReadResourceResult;
    const treeResult = (await server.readResource(
      "collection_tree",
      "outline://collection/col-1/tree",
      {
        collection_id: "col-1"
      }
    )) as ReadResourceResult;

    expect(emptyResult.contents[0]?.text).toContain("No documents in this collection.");
    expect(treeResult.contents[0]?.text).toContain("- Parent (doc-parent)");
    expect(treeResult.contents[0]?.text).toContain("  - Child (doc-child)");
  });

  it("reads collection documents and backlinks resources", async () => {
    const listDocuments = vi.fn().mockResolvedValue({
      data: [{ id: "doc-1", title: "Intro", updatedAt: "2026-01-01T00:00:00.000Z" }]
    });
    const listDocumentBacklinks = vi
      .fn()
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [{ id: "doc-2", title: "Reference" }] });

    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        listDocuments,
        listDocumentBacklinks
      } as never,
      allowedActions: ["read"]
    });

    registerOutlineResources(server as never, context);

    const docsResult = (await server.readResource(
      "collection_documents",
      "outline://collection/col-1/documents",
      {
        collection_id: "col-1"
      }
    )) as ReadResourceResult;
    const emptyBacklinks = (await server.readResource(
      "document_backlinks",
      "outline://document/doc-1/backlinks",
      {
        document_id: "doc-1"
      }
    )) as ReadResourceResult;
    const backlinks = (await server.readResource(
      "document_backlinks",
      "outline://document/doc-1/backlinks",
      {
        document_id: "doc-1"
      }
    )) as ReadResourceResult;

    expect(docsResult.contents[0]?.text).toContain("- Intro (doc-1)");
    expect(emptyBacklinks.contents[0]?.text).toContain("No backlinks found.");
    expect(backlinks.contents[0]?.text).toContain("- Reference (doc-2)");
  });

  it("renders document title heading when markdown text is empty", async () => {
    const getDocument = vi.fn().mockResolvedValue({
      id: "doc-1",
      title: "Untitled",
      text: ""
    });
    const server = new FakeMcpServer();
    const context = createToolContext({
      client: {
        getDocument
      } as never,
      allowedActions: ["read"]
    });

    registerOutlineResources(server as never, context);

    const result = (await server.readResource("document_content", "outline://document/doc-1", {
      document_id: "doc-1"
    })) as ReadResourceResult;

    expect(result.contents[0]?.text).toBe("# Untitled\n");
  });
});
