import { describe, expect, it } from "vitest";

import { registerAllTools } from "../src/server/registrars/index.js";
import { FakeMcpServer } from "./helpers/fake-mcp-server.js";
import { createCapabilities, createToolContext } from "./helpers/test-context.js";

const expectedToolNamesWithCapabilities = [
  "acquire_document_lease",
  "add_collection_group",
  "add_collection_user",
  "add_document_group",
  "add_document_user",
  "archive_document",
  "ask_ai_about_documents",
  "batch_archive_documents",
  "batch_create_documents",
  "batch_delete_documents",
  "batch_move_documents",
  "batch_update_documents",
  "create_collection",
  "create_comment",
  "create_document",
  "create_document_from_template",
  "create_template_from_document",
  "delete_collection",
  "delete_comment",
  "delete_document",
  "download_file_operation",
  "export_all_collections",
  "export_collection",
  "export_document",
  "get_active_document_lease",
  "get_collection_structure",
  "get_comment",
  "get_document_backlinks",
  "get_document_id_from_title",
  "get_file_operation",
  "get_revision",
  "list_archived_documents",
  "list_collection_group_memberships",
  "list_collection_memberships",
  "list_collections",
  "list_comments",
  "list_document_group_memberships",
  "list_document_memberships",
  "list_document_users",
  "list_events",
  "list_file_operations",
  "list_revisions",
  "list_templates",
  "list_trash",
  "move_document",
  "read_document",
  "release_document_lease",
  "remove_collection_group",
  "remove_collection_user",
  "remove_document_group",
  "remove_document_user",
  "renew_document_lease",
  "restore_document",
  "safe_update_document",
  "search_documents",
  "server_info",
  "unarchive_document",
  "update_collection",
  "update_comment",
  "update_document"
];

const expectedToolNamesWithoutGatedCapabilities = [
  "acquire_document_lease",
  "add_collection_group",
  "add_collection_user",
  "add_document_group",
  "add_document_user",
  "archive_document",
  "ask_ai_about_documents",
  "batch_archive_documents",
  "batch_create_documents",
  "batch_delete_documents",
  "batch_move_documents",
  "batch_update_documents",
  "create_collection",
  "create_document",
  "create_document_from_template",
  "delete_collection",
  "delete_document",
  "download_file_operation",
  "export_all_collections",
  "export_collection",
  "export_document",
  "get_active_document_lease",
  "get_collection_structure",
  "get_document_backlinks",
  "get_document_id_from_title",
  "get_file_operation",
  "list_archived_documents",
  "list_collection_group_memberships",
  "list_collection_memberships",
  "list_collections",
  "list_document_group_memberships",
  "list_document_memberships",
  "list_document_users",
  "list_events",
  "list_file_operations",
  "list_revisions",
  "list_templates",
  "list_trash",
  "move_document",
  "read_document",
  "release_document_lease",
  "remove_collection_group",
  "remove_collection_user",
  "remove_document_group",
  "remove_document_user",
  "renew_document_lease",
  "restore_document",
  "safe_update_document",
  "search_documents",
  "server_info",
  "unarchive_document",
  "update_collection",
  "update_document"
];

const expectedResourceTemplates = [
  "outline://collection/{collection_id}",
  "outline://collection/{collection_id}/documents",
  "outline://collection/{collection_id}/tree",
  "outline://document/{document_id}",
  "outline://document/{document_id}/backlinks"
];

describe("registerAllTools smoke", () => {
  it("registers expected tools and resource templates with capabilities available", () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      capabilities: createCapabilities("available")
    });

    registerAllTools(server as never, context);

    const toolNames = server.listToolNames();
    expect(toolNames).toEqual(expectedToolNamesWithCapabilities);
    expect(server.listResourceTemplates()).toEqual(expectedResourceTemplates);
  });

  it("omits capability-gated tools when capabilities are unavailable", () => {
    const server = new FakeMcpServer();
    const context = createToolContext({
      capabilities: createCapabilities("unavailable")
    });

    registerAllTools(server as never, context);

    expect(server.listToolNames()).toEqual(expectedToolNamesWithoutGatedCapabilities);
    expect(server.listResourceTemplates()).toEqual(expectedResourceTemplates);
  });
});
