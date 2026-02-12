# @sigeemin/outline-mcp

TypeScript `stdio` MCP server for Outline.

## Architecture

- `domain/`: 도메인 타입(lease 계약)
- `services/lease/`: 애플리케이션 서비스 + 전략 저장소(`memory`, `data_attribute`)
- `outline/`: Outline API 게이트웨이(인프라 계층)
- `server/`: MCP 인터페이스 계층
  - `registrars/`: 유스케이스별 도구 등록 (core/comments/membership/export/lease)
  - `tool-responses.ts`, `permissions.ts`: 공통 cross-cutting concern
- `services/capabilities/`: 부팅 시 endpoint capability probe

## Environment Variables

- `OUTLINE_API_KEY` (required)
- `OUTLINE_BASE_URL` (default: `https://app.getoutline.com`)
- `OUTLINE_ALLOWED_ACTIONS` (default: `read,write,delete`, supported: `read|write|delete|admin`)
- `OUTLINE_REQUEST_TIMEOUT_MS` (default: `15000`)
- `OUTLINE_RETRY_COUNT` (default: `2`)
- `OUTLINE_ENABLE_CAPABILITY_PROBE` (`true|false`, default: `true`)
- `OUTLINE_LEASE_STRATEGY` (`auto|memory|data_attribute`, default: `auto`)
- `OUTLINE_LEASE_ATTRIBUTE_ID` (required when strategy resolves to `data_attribute`)
- `OUTLINE_LEASE_DEFAULT_TTL_SECONDS` (default: `600`)
- `OUTLINE_LEASE_MAX_TTL_SECONDS` (default: `7200`)

## Local Dev

```bash
pnpm --filter @sigeemin/outline-mcp dev
```

## Inspector E2E

```bash
OUTLINE_API_KEY=... pnpm --filter @sigeemin/outline-mcp e2e:inspector
```

- 기본 시나리오:
  - `smoke`: `server_info`, `list_collections`
  - `1`: permission matrix (`read` / `read,write` / `read,write,delete`)
  - `2`: `safe_update_document` 충돌 감지
  - `3`: lease 경합(`acquire` 충돌, `renew`, `release`)
  - `4`: comments 음수 케이스(존재하지 않는 comment, 권한 거부)
  - `5`: export async 흐름(`export_*`, `list/get/download_file_operation`)
  - `6`: membership 왕복(add/list/remove/re-verify)
  - `7`: 실패 시 cleanup 트랩(rollback best-effort)
- 시나리오 입력:
  - `OUTLINE_E2E_COLLECTION_ID`: 시나리오 2/3 기준 컬렉션. 미지정이고 `OUTLINE_E2E_RUN_WRITE=true`이며 `create_collection/delete_collection` 도구가 있으면 임시 컬렉션을 자동 생성/수정 후 cleanup에서 삭제합니다.
  - `OUTLINE_E2E_EXPORT_COLLECTION_ID`: 시나리오 5용 컬렉션 (미지정 시 `OUTLINE_E2E_COLLECTION_ID`)
  - `OUTLINE_E2E_MEMBER_COLLECTION_ID`: 시나리오 6용 컬렉션 (미지정 시 `OUTLINE_E2E_COLLECTION_ID`)
  - `OUTLINE_E2E_MEMBER_USER_ID`, `OUTLINE_E2E_MEMBER_GROUP_ID`: 시나리오 6 대상
  - `OUTLINE_E2E_RUN_WRITE`: `true|false` (`false`면 write 시나리오 skip)
- `.env`, `.env.local`, `.env.e2e`를 자동 로드합니다.
  - 검색 경로: repo root → `apps/mcp`
  - 셸에서 직접 넘긴 환경변수는 `.env` 값보다 우선합니다.

## Implemented Tools

- `server_info`
- `list_collections`
- `create_collection`
- `update_collection`
- `delete_collection`
- `read_document`
- `search_documents`
- `list_templates`
- `create_document`
- `update_document`
- `move_document`
- `delete_document`
- `create_document_from_template`
- `create_template_from_document`
- `list_events`
- `list_revisions`
- `get_revision`
- `safe_update_document`
- `list_comments`
- `get_comment`
- `create_comment`
- `update_comment`
- `delete_comment`
- `acquire_document_lease`
- `renew_document_lease`
- `release_document_lease`
- `get_active_document_lease`
- `list_document_users`
- `list_document_memberships`
- `list_document_group_memberships`
- `add_document_user`
- `remove_document_user`
- `add_document_group`
- `remove_document_group`
- `list_collection_memberships`
- `list_collection_group_memberships`
- `add_collection_user`
- `remove_collection_user`
- `add_collection_group`
- `remove_collection_group`
- `export_collection`
- `export_all_collections`
- `list_file_operations`
- `get_file_operation`
- `download_file_operation`
