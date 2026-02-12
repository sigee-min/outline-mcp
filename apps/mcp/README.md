# @sigeemin/outline-mcp

TypeScript MCP (`stdio`) server for Outline Cloud and self-hosted Outline.

[![npm version](https://img.shields.io/npm/v/%40sigeemin%2Foutline-mcp?label=npm&logo=npm)](https://www.npmjs.com/package/@sigeemin/outline-mcp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![CI](https://github.com/sigee-min/outline-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sigee-min/outline-mcp/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/docker-no%20official%20image-lightgrey?logo=docker)](https://github.com/sigee-min/outline-mcp)

## What Is Outline?

[Outline](https://www.getoutline.com) is a collaborative team knowledge base.
Teams use Outline to write and organize internal documentation such as handbooks, runbooks, product docs, and operational playbooks.

This package exposes that workspace through MCP so agents can interact with Outline content in a controlled, automatable way.

## Architecture

- `src/domain`: domain models
- `src/services`: lease and capability-probe application services
- `src/outline`: Outline API gateway
- `src/server`: MCP interface layer
  - `registrars`: tool/resource registration by use-case
  - `permissions.ts`, `tool-responses.ts`: shared cross-cutting helpers

## Environment Variables

| Variable | Default | Notes |
|---|---|---|
| `OUTLINE_API_KEY` | required | API token |
| `OUTLINE_BASE_URL` | `https://app.getoutline.com` | Set self-hosted endpoint if needed |
| `OUTLINE_ALLOWED_ACTIONS` | `read,write,delete` | `read`, `write`, `delete`, `admin` |
| `OUTLINE_REQUEST_TIMEOUT_MS` | `15000` | Request timeout |
| `OUTLINE_RETRY_COUNT` | `2` | Retry count for 429/5xx |
| `OUTLINE_ENABLE_CAPABILITY_PROBE` | `true` | Probes optional endpoints at startup |
| `OUTLINE_LEASE_STRATEGY` | `auto` | `auto`, `memory`, `data_attribute` |
| `OUTLINE_LEASE_ATTRIBUTE_ID` | none | Required for `data_attribute` strategy |
| `OUTLINE_LEASE_DEFAULT_TTL_SECONDS` | `600` | Default lease TTL |
| `OUTLINE_LEASE_MAX_TTL_SECONDS` | `7200` | Max lease TTL |

## Local Development

```bash
pnpm --filter @sigeemin/outline-mcp dev
```

## Tool Surface

| Group | Tools |
|---|---|
| Server | `server_info` |
| Collections | `list_collections`, `get_collection_structure`, `create_collection`, `update_collection`, `delete_collection` |
| Documents | `read_document`, `export_document`, `search_documents`, `get_document_id_from_title`, `get_document_backlinks`, `create_document`, `update_document`, `move_document`, `delete_document`, `safe_update_document` |
| Document Lifecycle | `archive_document`, `unarchive_document`, `restore_document`, `list_archived_documents`, `list_trash` |
| Batch Operations | `batch_create_documents`, `batch_update_documents`, `batch_move_documents`, `batch_archive_documents`, `batch_delete_documents` |
| Templates | `list_templates`, `create_template_from_document`, `create_document_from_template` |
| AI | `ask_ai_about_documents` |
| Comments | `list_comments`, `get_comment`, `create_comment`, `update_comment`, `delete_comment` |
| Lease | `acquire_document_lease`, `renew_document_lease`, `release_document_lease`, `get_active_document_lease` |
| Memberships | `list_document_users`, `list_document_memberships`, `list_document_group_memberships`, `add_document_user`, `remove_document_user`, `add_document_group`, `remove_document_group`, `list_collection_memberships`, `list_collection_group_memberships`, `add_collection_user`, `remove_collection_user`, `add_collection_group`, `remove_collection_group` |
| Export | `export_collection`, `export_all_collections`, `list_file_operations`, `get_file_operation`, `download_file_operation` |

## Resource URIs

- `outline://collection/{collection_id}`
- `outline://collection/{collection_id}/tree`
- `outline://collection/{collection_id}/documents`
- `outline://document/{document_id}`
- `outline://document/{document_id}/backlinks`

## Inspector E2E

```bash
OUTLINE_API_KEY=... pnpm --filter @sigeemin/outline-mcp e2e:inspector
```

- Loads `.env`, `.env.local`, `.env.e2e` from repo root, then `apps/mcp`
- Shell env values always take precedence
- Scenarios include permission matrix, safe-update conflict detection, lease contention, comments negative cases, export flow, membership roundtrip, and cleanup rollback
