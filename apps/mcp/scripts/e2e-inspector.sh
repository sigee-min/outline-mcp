#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MCP_DIR="$ROOT_DIR/apps/mcp"
SERVER_ENTRY="$MCP_DIR/dist/index.js"

trim_spaces() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf "%s" "$value"
}

load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0

  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    local line
    line="$(trim_spaces "$raw_line")"
    [[ -z "$line" || "${line:0:1}" == "#" ]] && continue

    if [[ "$line" == export[[:space:]]* ]]; then
      line="$(trim_spaces "${line#export}")"
    fi

    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local value="${BASH_REMATCH[2]}"
      value="$(trim_spaces "$value")"

      if [[ "$value" =~ ^\"(.*)\"$ ]]; then
        value="${BASH_REMATCH[1]}"
      elif [[ "$value" =~ ^\'(.*)\'$ ]]; then
        value="${BASH_REMATCH[1]}"
      fi

      export "$key=$value"
    fi
  done <"$file"

  echo "[e2e] loaded env file: $file"
}

restore_if_explicitly_set() {
  local was_set="$1"
  local key="$2"
  local value="$3"
  if [[ "$was_set" == "1" ]]; then
    export "$key=$value"
  fi
}

preserve_env_key() {
  local key="$1"
  if [[ "${!key+x}" == "x" ]]; then
    printf "1|%s" "${!key}"
  else
    printf "0|"
  fi
}

fail() {
  echo "[e2e] FAIL: $*" >&2
  exit 1
}

restore_preserved_env() {
  local encoded="$1"
  local key="$2"
  local is_set="${encoded%%|*}"
  local value="${encoded#*|}"
  restore_if_explicitly_set "$is_set" "$key" "$value"
}

out_api="$(preserve_env_key OUTLINE_API_KEY)"
out_base="$(preserve_env_key OUTLINE_BASE_URL)"
out_actions="$(preserve_env_key OUTLINE_ALLOWED_ACTIONS)"
out_probe="$(preserve_env_key OUTLINE_ENABLE_CAPABILITY_PROBE)"
out_collection="$(preserve_env_key OUTLINE_E2E_COLLECTION_ID)"
out_export_collection="$(preserve_env_key OUTLINE_E2E_EXPORT_COLLECTION_ID)"
out_member_collection="$(preserve_env_key OUTLINE_E2E_MEMBER_COLLECTION_ID)"
out_member_user="$(preserve_env_key OUTLINE_E2E_MEMBER_USER_ID)"
out_member_group="$(preserve_env_key OUTLINE_E2E_MEMBER_GROUP_ID)"
out_run_write="$(preserve_env_key OUTLINE_E2E_RUN_WRITE)"
out_export_all="$(preserve_env_key OUTLINE_E2E_EXPORT_ALL)"
out_cleanup_actions="$(preserve_env_key OUTLINE_E2E_CLEANUP_ALLOWED_ACTIONS)"

load_env_file "$ROOT_DIR/.env"
load_env_file "$ROOT_DIR/.env.local"
load_env_file "$ROOT_DIR/.env.e2e"
load_env_file "$MCP_DIR/.env"
load_env_file "$MCP_DIR/.env.local"
load_env_file "$MCP_DIR/.env.e2e"

restore_preserved_env "$out_api" "OUTLINE_API_KEY"
restore_preserved_env "$out_base" "OUTLINE_BASE_URL"
restore_preserved_env "$out_actions" "OUTLINE_ALLOWED_ACTIONS"
restore_preserved_env "$out_probe" "OUTLINE_ENABLE_CAPABILITY_PROBE"
restore_preserved_env "$out_collection" "OUTLINE_E2E_COLLECTION_ID"
restore_preserved_env "$out_export_collection" "OUTLINE_E2E_EXPORT_COLLECTION_ID"
restore_preserved_env "$out_member_collection" "OUTLINE_E2E_MEMBER_COLLECTION_ID"
restore_preserved_env "$out_member_user" "OUTLINE_E2E_MEMBER_USER_ID"
restore_preserved_env "$out_member_group" "OUTLINE_E2E_MEMBER_GROUP_ID"
restore_preserved_env "$out_run_write" "OUTLINE_E2E_RUN_WRITE"
restore_preserved_env "$out_export_all" "OUTLINE_E2E_EXPORT_ALL"
restore_preserved_env "$out_cleanup_actions" "OUTLINE_E2E_CLEANUP_ALLOWED_ACTIONS"

if [[ -z "${OUTLINE_API_KEY:-}" ]]; then
  fail "OUTLINE_API_KEY is required (set shell env or .env/.env.local/.env.e2e)"
fi

OUTLINE_BASE_URL="${OUTLINE_BASE_URL:-https://app.getoutline.com}"
OUTLINE_ALLOWED_ACTIONS="${OUTLINE_ALLOWED_ACTIONS:-read,write,delete}"
OUTLINE_ENABLE_CAPABILITY_PROBE="${OUTLINE_ENABLE_CAPABILITY_PROBE:-true}"
OUTLINE_E2E_COLLECTION_ID="${OUTLINE_E2E_COLLECTION_ID:-}"
OUTLINE_E2E_EXPORT_COLLECTION_ID="${OUTLINE_E2E_EXPORT_COLLECTION_ID:-}"
OUTLINE_E2E_MEMBER_COLLECTION_ID="${OUTLINE_E2E_MEMBER_COLLECTION_ID:-}"
OUTLINE_E2E_MEMBER_USER_ID="${OUTLINE_E2E_MEMBER_USER_ID:-}"
OUTLINE_E2E_MEMBER_GROUP_ID="${OUTLINE_E2E_MEMBER_GROUP_ID:-}"
OUTLINE_E2E_RUN_WRITE="${OUTLINE_E2E_RUN_WRITE:-true}"
OUTLINE_E2E_EXPORT_ALL="${OUTLINE_E2E_EXPORT_ALL:-false}"
OUTLINE_E2E_CLEANUP_ALLOWED_ACTIONS="${OUTLINE_E2E_CLEANUP_ALLOWED_ACTIONS:-read,write,delete}"

CLEANUP_DOC_IDS=()
CLEANUP_DOC_USERS=()
CLEANUP_DOC_GROUPS=()
CLEANUP_COLLECTION_USERS=()
CLEANUP_COLLECTION_GROUPS=()
CLEANUP_COLLECTION_IDS=()

register_cleanup_doc() {
  CLEANUP_DOC_IDS+=("$1")
}

register_cleanup_doc_user() {
  CLEANUP_DOC_USERS+=("$1|$2")
}

register_cleanup_doc_group() {
  CLEANUP_DOC_GROUPS+=("$1|$2")
}

register_cleanup_collection_user() {
  CLEANUP_COLLECTION_USERS+=("$1|$2")
}

register_cleanup_collection_group() {
  CLEANUP_COLLECTION_GROUPS+=("$1|$2")
}

register_cleanup_collection() {
  CLEANUP_COLLECTION_IDS+=("$1")
}

run_inspector_with_actions() {
  local allowed_actions="$1"
  shift

  OUTLINE_API_KEY="$OUTLINE_API_KEY" \
    OUTLINE_BASE_URL="$OUTLINE_BASE_URL" \
    OUTLINE_ALLOWED_ACTIONS="$allowed_actions" \
    OUTLINE_ENABLE_CAPABILITY_PROBE="$OUTLINE_ENABLE_CAPABILITY_PROBE" \
    pnpm -s dlx @modelcontextprotocol/inspector --cli node "$SERVER_ENTRY" "$@"
}

run_inspector() {
  run_inspector_with_actions "$OUTLINE_ALLOWED_ACTIONS" "$@"
}

call_tool_with_actions() {
  local allowed_actions="$1"
  local tool_name="$2"
  shift 2

  local -a args=()
  while (($#)); do
    args+=(--tool-arg "$1")
    shift
  done

  if ((${#args[@]} > 0)); then
    run_inspector_with_actions "$allowed_actions" --method tools/call --tool-name "$tool_name" "${args[@]}"
  else
    run_inspector_with_actions "$allowed_actions" --method tools/call --tool-name "$tool_name"
  fi
}

call_tool() {
  local tool_name="$1"
  shift
  call_tool_with_actions "$OUTLINE_ALLOWED_ACTIONS" "$tool_name" "$@"
}

tool_exists() {
  local tools_json="$1"
  local name="$2"
  node -e '
    const fs = require("node:fs");
    const raw = fs.readFileSync(0, "utf8");
    const target = process.argv[1];
    const payload = JSON.parse(raw);
    const exists = Array.isArray(payload.tools) && payload.tools.some((tool) => tool.name === target);
    process.exit(exists ? 0 : 1);
  ' "$name" <<<"$tools_json"
}

is_error() {
  local payload="$1"
  node -e '
    const fs = require("node:fs");
    const raw = fs.readFileSync(0, "utf8");
    const outer = JSON.parse(raw);
    process.exit(outer.isError === true ? 0 : 1);
  ' <<<"$payload"
}

error_text() {
  local payload="$1"
  node -e '
    const fs = require("node:fs");
    const raw = fs.readFileSync(0, "utf8");
    const outer = JSON.parse(raw);
    process.stdout.write(String(outer.content?.[0]?.text ?? ""));
  ' <<<"$payload"
}

conflict_current_revision() {
  local payload="$1"
  node -e '
    const fs = require("node:fs");
    const raw = fs.readFileSync(0, "utf8");
    const outer = JSON.parse(raw);
    const text = String(outer.content?.[0]?.text ?? "");
    try {
      const inner = JSON.parse(text);
      if (typeof inner.currentRevision === "number") {
        process.stdout.write(String(inner.currentRevision));
      }
    } catch {}
  ' <<<"$payload"
}

assert_success() {
  local payload="$1"
  if is_error "$payload"; then
    fail "expected success but got error: $(error_text "$payload")"
  fi
}

assert_failure() {
  local payload="$1"
  if ! is_error "$payload"; then
    fail "expected failure but tool call succeeded"
  fi
}

assert_error_contains() {
  local payload="$1"
  local expected="$2"
  local text
  text="$(error_text "$payload")"
  if [[ "$text" != *"$expected"* ]]; then
    fail "expected error to include \"$expected\" but got: $text"
  fi
}

assert_error_not_contains() {
  local payload="$1"
  local unexpected="$2"
  local text
  text="$(error_text "$payload")"
  if [[ "$text" == *"$unexpected"* ]]; then
    fail "expected error to not include \"$unexpected\" but got: $text"
  fi
}

inner_value() {
  local path="$1"
  local payload="$2"
  node -e '
    const fs = require("node:fs");
    const path = process.argv[1];
    const raw = fs.readFileSync(0, "utf8");
    const outer = JSON.parse(raw);
    const text = outer.content?.[0]?.text ?? "{}";
    const inner = JSON.parse(text);
    const value = path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), inner);
    if (value == null) {
      process.exit(2);
    }
    process.stdout.write(String(value));
  ' "$path" <<<"$payload"
}

inner_optional() {
  local path="$1"
  local payload="$2"
  node -e '
    const fs = require("node:fs");
    const path = process.argv[1];
    const raw = fs.readFileSync(0, "utf8");
    const outer = JSON.parse(raw);
    const text = outer.content?.[0]?.text ?? "{}";
    const inner = JSON.parse(text);
    const value = path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), inner);
    if (value == null) {
      process.exit(0);
    }
    process.stdout.write(String(value));
  ' "$path" <<<"$payload"
}

inner_array_contains() {
  local path="$1"
  local target="$2"
  local payload="$3"
  node -e '
    const fs = require("node:fs");
    const path = process.argv[1];
    const target = process.argv[2];
    const raw = fs.readFileSync(0, "utf8");
    const outer = JSON.parse(raw);
    const text = outer.content?.[0]?.text ?? "{}";
    const inner = JSON.parse(text);
    const value = path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), inner);
    if (!Array.isArray(value)) {
      process.exit(2);
    }
    const found = value.some((entry) => {
      if (entry == null) return false;
      if (typeof entry !== "object") return String(entry) === target;

      const e = entry;
      const candidates = [
        e.id,
        e.userId,
        e.groupId,
        e.user?.id,
        e.group?.id
      ].filter((item) => item != null);

      return candidates.some((item) => String(item) === target);
    });
    process.exit(found ? 0 : 1);
  ' "$path" "$target" <<<"$payload"
}

assert_inner_array_contains() {
  local path="$1"
  local target="$2"
  local payload="$3"
  if ! inner_array_contains "$path" "$target" "$payload"; then
    fail "expected array \"$path\" to contain \"$target\""
  fi
}

assert_inner_array_not_contains() {
  local path="$1"
  local target="$2"
  local payload="$3"
  if inner_array_contains "$path" "$target" "$payload"; then
    fail "expected array \"$path\" to not contain \"$target\""
  fi
}

cleanup_resources() {
  local exit_code=$?
  local trigger="success"
  if ((exit_code != 0)); then
    trigger="failure"
  fi

  echo "[e2e] cleanup($trigger): start"

  local pair
  for pair in "${CLEANUP_DOC_USERS[@]-}"; do
    IFS='|' read -r doc_id user_id <<<"$pair"
    call_tool_with_actions "$OUTLINE_E2E_CLEANUP_ALLOWED_ACTIONS" remove_document_user \
      "document_id=$doc_id" "user_id=$user_id" >/dev/null 2>&1 || true
  done

  for pair in "${CLEANUP_DOC_GROUPS[@]-}"; do
    IFS='|' read -r doc_id group_id <<<"$pair"
    call_tool_with_actions "$OUTLINE_E2E_CLEANUP_ALLOWED_ACTIONS" remove_document_group \
      "document_id=$doc_id" "group_id=$group_id" >/dev/null 2>&1 || true
  done

  for pair in "${CLEANUP_COLLECTION_USERS[@]-}"; do
    IFS='|' read -r collection_id user_id <<<"$pair"
    call_tool_with_actions "$OUTLINE_E2E_CLEANUP_ALLOWED_ACTIONS" remove_collection_user \
      "collection_id=$collection_id" "user_id=$user_id" >/dev/null 2>&1 || true
  done

  for pair in "${CLEANUP_COLLECTION_GROUPS[@]-}"; do
    IFS='|' read -r collection_id group_id <<<"$pair"
    call_tool_with_actions "$OUTLINE_E2E_CLEANUP_ALLOWED_ACTIONS" remove_collection_group \
      "collection_id=$collection_id" "group_id=$group_id" >/dev/null 2>&1 || true
  done

  local doc_id
  for doc_id in "${CLEANUP_DOC_IDS[@]-}"; do
    call_tool_with_actions "$OUTLINE_E2E_CLEANUP_ALLOWED_ACTIONS" delete_document \
      "document_id=$doc_id" "permanent=false" >/dev/null 2>&1 || true
  done

  local collection_id
  for collection_id in "${CLEANUP_COLLECTION_IDS[@]-}"; do
    call_tool_with_actions "$OUTLINE_E2E_CLEANUP_ALLOWED_ACTIONS" delete_collection \
      "collection_id=$collection_id" >/dev/null 2>&1 || true
  done

  echo "[e2e] cleanup($trigger): done"
  exit "$exit_code"
}

trap cleanup_resources EXIT

echo "[e2e] building mcp server"
pnpm --filter @sigeemin/outline-mcp build >/dev/null

echo "[e2e] discovering tools"
TOOLS_JSON="$(run_inspector --method tools/list)"

echo "[e2e][smoke] server_info"
SERVER_INFO_JSON="$(call_tool server_info)"
assert_success "$SERVER_INFO_JSON"
SERVER_LEASE_STRATEGY="$(inner_optional "lease.strategy" "$SERVER_INFO_JSON")"

echo "[e2e][smoke] list_collections"
LIST_COLLECTIONS_JSON="$(call_tool list_collections "limit=5")"
assert_success "$LIST_COLLECTIONS_JSON"

if [[ "$OUTLINE_E2E_RUN_WRITE" == "true" ]] && [[ -z "$OUTLINE_E2E_COLLECTION_ID" ]]; then
  if tool_exists "$TOOLS_JSON" "create_collection" && tool_exists "$TOOLS_JSON" "delete_collection"; then
    echo "[e2e][bootstrap] provisioning isolated temp collection"
    TEMP_COLLECTION_TAG="$(date +%s)"
    TEMP_COLLECTION_CREATE_JSON="$(call_tool create_collection \
      "name=outline-mcp-e2e-${TEMP_COLLECTION_TAG}" \
      "description=temporary collection for isolated e2e run ${TEMP_COLLECTION_TAG}")"
    assert_success "$TEMP_COLLECTION_CREATE_JSON"

    OUTLINE_E2E_COLLECTION_ID="$(inner_optional "collectionId" "$TEMP_COLLECTION_CREATE_JSON")"
    if [[ -z "$OUTLINE_E2E_COLLECTION_ID" ]]; then
      OUTLINE_E2E_COLLECTION_ID="$(inner_optional "collection.id" "$TEMP_COLLECTION_CREATE_JSON")"
    fi
    if [[ -z "$OUTLINE_E2E_COLLECTION_ID" ]]; then
      fail "bootstrap failed: unable to resolve temp collection id"
    fi
    register_cleanup_collection "$OUTLINE_E2E_COLLECTION_ID"

    if tool_exists "$TOOLS_JSON" "update_collection"; then
      TEMP_COLLECTION_UPDATE_JSON="$(call_tool update_collection \
        "collection_id=$OUTLINE_E2E_COLLECTION_ID" \
        "description=temporary collection for isolated e2e run ${TEMP_COLLECTION_TAG} (updated)")"
      assert_success "$TEMP_COLLECTION_UPDATE_JSON"
    fi
  else
    echo "[e2e][bootstrap] skipped temp collection (need create_collection + delete_collection)"
  fi
fi

if [[ -z "$OUTLINE_E2E_EXPORT_COLLECTION_ID" ]]; then
  OUTLINE_E2E_EXPORT_COLLECTION_ID="$OUTLINE_E2E_COLLECTION_ID"
fi
if [[ -z "$OUTLINE_E2E_MEMBER_COLLECTION_ID" ]]; then
  OUTLINE_E2E_MEMBER_COLLECTION_ID="$OUTLINE_E2E_COLLECTION_ID"
fi

echo "[e2e][1] permission matrix"
READ_WRITE_DENIED_JSON="$(call_tool_with_actions "read" create_document "title=permission-read-deny")"
assert_failure "$READ_WRITE_DENIED_JSON"
assert_error_contains "$READ_WRITE_DENIED_JSON" "PERMISSION_DENIED"

READ_DELETE_DENIED_JSON="$(call_tool_with_actions "read" delete_document "document_id=00000000-0000-0000-0000-000000000000")"
assert_failure "$READ_DELETE_DENIED_JSON"
assert_error_contains "$READ_DELETE_DENIED_JSON" "PERMISSION_DENIED"

RW_CREATE_JSON="$(call_tool_with_actions "read,write" create_document "title=permission-rw-allow")"
assert_failure "$RW_CREATE_JSON"
assert_error_contains "$RW_CREATE_JSON" "INVALID_INPUT"
assert_error_not_contains "$RW_CREATE_JSON" "PERMISSION_DENIED"

RW_DELETE_JSON="$(call_tool_with_actions "read,write" delete_document "document_id=00000000-0000-0000-0000-000000000000")"
assert_failure "$RW_DELETE_JSON"
assert_error_contains "$RW_DELETE_JSON" "PERMISSION_DENIED"

FULL_CREATE_JSON="$(call_tool_with_actions "read,write,delete" create_document "title=permission-full-allow")"
assert_failure "$FULL_CREATE_JSON"
assert_error_contains "$FULL_CREATE_JSON" "INVALID_INPUT"
assert_error_not_contains "$FULL_CREATE_JSON" "PERMISSION_DENIED"

FULL_DELETE_JSON="$(call_tool_with_actions "read,write,delete" delete_document "document_id=00000000-0000-0000-0000-000000000000")"
if is_error "$FULL_DELETE_JSON"; then
  assert_error_not_contains "$FULL_DELETE_JSON" "PERMISSION_DENIED"
fi

if [[ "$OUTLINE_E2E_RUN_WRITE" != "true" ]]; then
  echo "[e2e] write scenarios skipped (OUTLINE_E2E_RUN_WRITE=$OUTLINE_E2E_RUN_WRITE)"
else
  if [[ -n "$OUTLINE_E2E_COLLECTION_ID" ]] && \
    tool_exists "$TOOLS_JSON" "create_document" && \
    tool_exists "$TOOLS_JSON" "read_document" && \
    tool_exists "$TOOLS_JSON" "safe_update_document"; then
    echo "[e2e][2] conflict-safe update"
    CONFLICT_TAG="$(date +%s)"
    CONFLICT_CREATE_JSON="$(call_tool create_document \
      "title=outline-mcp-e2e-conflict-${CONFLICT_TAG}" \
      "text=conflict-initial-${CONFLICT_TAG}" \
      "collection_id=$OUTLINE_E2E_COLLECTION_ID" \
      "publish=true")"
    assert_success "$CONFLICT_CREATE_JSON"

    CONFLICT_DOC_ID="$(inner_optional "documentId" "$CONFLICT_CREATE_JSON")"
    if [[ -z "$CONFLICT_DOC_ID" ]]; then
      CONFLICT_DOC_ID="$(inner_value "document.id" "$CONFLICT_CREATE_JSON")"
    fi
    register_cleanup_doc "$CONFLICT_DOC_ID"

    CONFLICT_REV_1="$(inner_optional "revisionAfter" "$CONFLICT_CREATE_JSON")"
    if [[ -z "$CONFLICT_REV_1" ]]; then
      CONFLICT_REV_1="$(inner_value "document.revision" "$CONFLICT_CREATE_JSON")"
    fi

    CONFLICT_READ_JSON="$(call_tool read_document "document_id=$CONFLICT_DOC_ID")"
    assert_success "$CONFLICT_READ_JSON"
    CONFLICT_EXPECTED_REV="$(inner_optional "revision" "$CONFLICT_READ_JSON")"
    if [[ -z "$CONFLICT_EXPECTED_REV" ]]; then
      CONFLICT_EXPECTED_REV="$CONFLICT_REV_1"
    fi

    CONFLICT_UPDATE_JSON="$(call_tool safe_update_document \
      "document_id=$CONFLICT_DOC_ID" \
      "expected_revision=$CONFLICT_EXPECTED_REV" \
      "text=conflict-updated-${CONFLICT_TAG}" \
      "edit_mode=replace")"

    if is_error "$CONFLICT_UPDATE_JSON"; then
      CONFLICT_UPDATE_ERROR_TEXT="$(error_text "$CONFLICT_UPDATE_JSON")"
      if [[ "$CONFLICT_UPDATE_ERROR_TEXT" == *"CONFLICT_DETECTED"* ]]; then
        CONFLICT_RETRY_REV="$(conflict_current_revision "$CONFLICT_UPDATE_JSON")"
        if [[ -n "$CONFLICT_RETRY_REV" ]]; then
          CONFLICT_UPDATE_JSON="$(call_tool safe_update_document \
            "document_id=$CONFLICT_DOC_ID" \
            "expected_revision=$CONFLICT_RETRY_REV" \
            "text=conflict-updated-${CONFLICT_TAG}" \
            "edit_mode=replace")"
        fi
      fi
    fi
    assert_success "$CONFLICT_UPDATE_JSON"

    CONFLICT_FAIL_JSON="$(call_tool safe_update_document \
      "document_id=$CONFLICT_DOC_ID" \
      "expected_revision=$CONFLICT_EXPECTED_REV" \
      "text=conflict-should-fail-${CONFLICT_TAG}" \
      "edit_mode=replace")"
    assert_failure "$CONFLICT_FAIL_JSON"
    assert_error_contains "$CONFLICT_FAIL_JSON" "CONFLICT_DETECTED"
  else
    echo "[e2e][2] skipped (need OUTLINE_E2E_COLLECTION_ID and safe_update_document/create_document)"
  fi

  if [[ "$SERVER_LEASE_STRATEGY" != "data_attribute" ]]; then
    echo "[e2e][3] skipped (lease strategy=$SERVER_LEASE_STRATEGY, inspector calls are process-scoped)"
  elif [[ -n "$OUTLINE_E2E_COLLECTION_ID" ]] && \
    tool_exists "$TOOLS_JSON" "acquire_document_lease" && \
    tool_exists "$TOOLS_JSON" "renew_document_lease" && \
    tool_exists "$TOOLS_JSON" "release_document_lease" && \
    tool_exists "$TOOLS_JSON" "create_document"; then
    echo "[e2e][3] lease contention"
    LEASE_TAG="$(date +%s)"
    LEASE_CREATE_JSON="$(call_tool create_document \
      "title=outline-mcp-e2e-lease-${LEASE_TAG}" \
      "text=lease-initial-${LEASE_TAG}" \
      "collection_id=$OUTLINE_E2E_COLLECTION_ID" \
      "publish=true")"
    assert_success "$LEASE_CREATE_JSON"

    LEASE_DOC_ID="$(inner_optional "documentId" "$LEASE_CREATE_JSON")"
    if [[ -z "$LEASE_DOC_ID" ]]; then
      LEASE_DOC_ID="$(inner_value "document.id" "$LEASE_CREATE_JSON")"
    fi
    register_cleanup_doc "$LEASE_DOC_ID"

    LEASE_ACQUIRE_A_JSON="$(call_tool acquire_document_lease \
      "document_id=$LEASE_DOC_ID" \
      "agent_id=e2e-agent-a" \
      "ttl_seconds=60" \
      "reason=e2e-contention-test")"
    assert_success "$LEASE_ACQUIRE_A_JSON"
    LEASE_TOKEN_A="$(inner_value "lease.leaseToken" "$LEASE_ACQUIRE_A_JSON")"

    LEASE_ACQUIRE_B_JSON="$(call_tool acquire_document_lease \
      "document_id=$LEASE_DOC_ID" \
      "agent_id=e2e-agent-b" \
      "ttl_seconds=60" \
      "reason=e2e-contention-test")"
    assert_failure "$LEASE_ACQUIRE_B_JSON"
    assert_error_contains "$LEASE_ACQUIRE_B_JSON" "LEASE_CONFLICT"

    LEASE_RENEW_JSON="$(call_tool renew_document_lease \
      "document_id=$LEASE_DOC_ID" \
      "lease_token=$LEASE_TOKEN_A" \
      "ttl_seconds=120")"
    assert_success "$LEASE_RENEW_JSON"

    LEASE_RELEASE_JSON="$(call_tool release_document_lease \
      "document_id=$LEASE_DOC_ID" \
      "lease_token=$LEASE_TOKEN_A")"
    assert_success "$LEASE_RELEASE_JSON"
  else
    echo "[e2e][3] skipped (need lease tools + create_document + OUTLINE_E2E_COLLECTION_ID)"
  fi

  if tool_exists "$TOOLS_JSON" "get_comment" && tool_exists "$TOOLS_JSON" "create_comment"; then
    echo "[e2e][4] comments negative cases"
    COMMENT_MISSING_ID="${OUTLINE_E2E_MISSING_COMMENT_ID:-00000000-0000-0000-0000-000000000000}"

    COMMENT_NOT_FOUND_JSON="$(call_tool get_comment "comment_id=$COMMENT_MISSING_ID")"
    assert_failure "$COMMENT_NOT_FOUND_JSON"

    COMMENT_PERMISSION_JSON="$(call_tool_with_actions "read" create_comment \
      "document_id=00000000-0000-0000-0000-000000000000" \
      "text=e2e-permission-check")"
    assert_failure "$COMMENT_PERMISSION_JSON"
    assert_error_contains "$COMMENT_PERMISSION_JSON" "PERMISSION_DENIED"
  else
    echo "[e2e][4] skipped (comment tools are not registered)"
  fi

  if [[ -n "$OUTLINE_E2E_EXPORT_COLLECTION_ID" ]] && \
    tool_exists "$TOOLS_JSON" "export_collection" && \
    tool_exists "$TOOLS_JSON" "list_file_operations" && \
    tool_exists "$TOOLS_JSON" "get_file_operation"; then
    echo "[e2e][5] export async flow"
    EXPORT_JSON="$(call_tool export_collection "collection_id=$OUTLINE_E2E_EXPORT_COLLECTION_ID" "format=json")"
    assert_success "$EXPORT_JSON"

    EXPORT_OP_ID="$(inner_optional "fileOperation.id" "$EXPORT_JSON")"

    LIST_EXPORT_JSON="$(call_tool list_file_operations "type=export" "limit=10" "offset=0")"
    assert_success "$LIST_EXPORT_JSON"

    if [[ -z "$EXPORT_OP_ID" ]]; then
      EXPORT_OP_ID="$(inner_optional "data.0.id" "$LIST_EXPORT_JSON")"
    fi

    if [[ -n "$EXPORT_OP_ID" ]]; then
      GET_EXPORT_JSON="$(call_tool get_file_operation "file_operation_id=$EXPORT_OP_ID")"
      assert_success "$GET_EXPORT_JSON"

      EXPORT_STATE="$(inner_optional "fileOperation.state" "$GET_EXPORT_JSON")"
      if [[ "$EXPORT_STATE" == "complete" ]] && tool_exists "$TOOLS_JSON" "download_file_operation"; then
        DOWNLOAD_JSON="$(call_tool download_file_operation "file_operation_id=$EXPORT_OP_ID")"
        assert_success "$DOWNLOAD_JSON"
      else
        echo "[e2e][5] download skipped (state=$EXPORT_STATE)"
      fi
    else
      echo "[e2e][5] skipped get/download (no export file operation id)"
    fi

    if [[ "$OUTLINE_E2E_EXPORT_ALL" == "true" ]] && tool_exists "$TOOLS_JSON" "export_all_collections"; then
      EXPORT_ALL_JSON="$(call_tool export_all_collections "format=json")"
      assert_success "$EXPORT_ALL_JSON"
    fi
  else
    echo "[e2e][5] skipped (need export tools + OUTLINE_E2E_EXPORT_COLLECTION_ID)"
  fi

  if [[ -n "$OUTLINE_E2E_MEMBER_COLLECTION_ID" ]] && \
    [[ -n "$OUTLINE_E2E_MEMBER_USER_ID" || -n "$OUTLINE_E2E_MEMBER_GROUP_ID" ]]; then
    echo "[e2e][6] membership roundtrip"

    if tool_exists "$TOOLS_JSON" "create_document"; then
      MEMBER_TAG="$(date +%s)"
      MEMBER_DOC_CREATE_JSON="$(call_tool create_document \
        "title=outline-mcp-e2e-member-${MEMBER_TAG}" \
        "text=membership-${MEMBER_TAG}" \
        "collection_id=$OUTLINE_E2E_MEMBER_COLLECTION_ID" \
        "publish=true")"
      assert_success "$MEMBER_DOC_CREATE_JSON"
      MEMBER_DOC_ID="$(inner_optional "documentId" "$MEMBER_DOC_CREATE_JSON")"
      if [[ -z "$MEMBER_DOC_ID" ]]; then
        MEMBER_DOC_ID="$(inner_value "document.id" "$MEMBER_DOC_CREATE_JSON")"
      fi
      register_cleanup_doc "$MEMBER_DOC_ID"
    else
      MEMBER_DOC_ID=""
    fi

    if [[ -n "${MEMBER_DOC_ID:-}" ]] && \
      [[ -n "$OUTLINE_E2E_MEMBER_USER_ID" ]] && \
      tool_exists "$TOOLS_JSON" "add_document_user" && \
      tool_exists "$TOOLS_JSON" "list_document_memberships" && \
      tool_exists "$TOOLS_JSON" "remove_document_user"; then
      ADD_DOC_USER_JSON="$(call_tool add_document_user \
        "document_id=$MEMBER_DOC_ID" \
        "user_id=$OUTLINE_E2E_MEMBER_USER_ID" \
        "permission=read")"
      assert_success "$ADD_DOC_USER_JSON"
      register_cleanup_doc_user "$MEMBER_DOC_ID" "$OUTLINE_E2E_MEMBER_USER_ID"

      LIST_DOC_MEMBERS_JSON="$(call_tool list_document_memberships "document_id=$MEMBER_DOC_ID")"
      assert_success "$LIST_DOC_MEMBERS_JSON"
      assert_inner_array_contains "data" "$OUTLINE_E2E_MEMBER_USER_ID" "$LIST_DOC_MEMBERS_JSON"

      REMOVE_DOC_USER_JSON="$(call_tool remove_document_user \
        "document_id=$MEMBER_DOC_ID" \
        "user_id=$OUTLINE_E2E_MEMBER_USER_ID")"
      assert_success "$REMOVE_DOC_USER_JSON"

      LIST_DOC_MEMBERS_AFTER_JSON="$(call_tool list_document_memberships "document_id=$MEMBER_DOC_ID")"
      assert_success "$LIST_DOC_MEMBERS_AFTER_JSON"
      assert_inner_array_not_contains "data" "$OUTLINE_E2E_MEMBER_USER_ID" "$LIST_DOC_MEMBERS_AFTER_JSON"
    fi

    if [[ -n "${MEMBER_DOC_ID:-}" ]] && \
      [[ -n "$OUTLINE_E2E_MEMBER_GROUP_ID" ]] && \
      tool_exists "$TOOLS_JSON" "add_document_group" && \
      tool_exists "$TOOLS_JSON" "list_document_group_memberships" && \
      tool_exists "$TOOLS_JSON" "remove_document_group"; then
      ADD_DOC_GROUP_JSON="$(call_tool add_document_group \
        "document_id=$MEMBER_DOC_ID" \
        "group_id=$OUTLINE_E2E_MEMBER_GROUP_ID" \
        "permission=read")"
      assert_success "$ADD_DOC_GROUP_JSON"
      register_cleanup_doc_group "$MEMBER_DOC_ID" "$OUTLINE_E2E_MEMBER_GROUP_ID"

      LIST_DOC_GROUPS_JSON="$(call_tool list_document_group_memberships \
        "document_id=$MEMBER_DOC_ID" \
        "limit=50" \
        "offset=0")"
      assert_success "$LIST_DOC_GROUPS_JSON"
      assert_inner_array_contains "data" "$OUTLINE_E2E_MEMBER_GROUP_ID" "$LIST_DOC_GROUPS_JSON"

      REMOVE_DOC_GROUP_JSON="$(call_tool remove_document_group \
        "document_id=$MEMBER_DOC_ID" \
        "group_id=$OUTLINE_E2E_MEMBER_GROUP_ID")"
      assert_success "$REMOVE_DOC_GROUP_JSON"

      LIST_DOC_GROUPS_AFTER_JSON="$(call_tool list_document_group_memberships \
        "document_id=$MEMBER_DOC_ID" \
        "limit=50" \
        "offset=0")"
      assert_success "$LIST_DOC_GROUPS_AFTER_JSON"
      assert_inner_array_not_contains "data" "$OUTLINE_E2E_MEMBER_GROUP_ID" "$LIST_DOC_GROUPS_AFTER_JSON"
    fi

    if [[ -n "$OUTLINE_E2E_MEMBER_USER_ID" ]] && \
      tool_exists "$TOOLS_JSON" "add_collection_user" && \
      tool_exists "$TOOLS_JSON" "list_collection_memberships" && \
      tool_exists "$TOOLS_JSON" "remove_collection_user"; then
      ADD_COLLECTION_USER_JSON="$(call_tool add_collection_user \
        "collection_id=$OUTLINE_E2E_MEMBER_COLLECTION_ID" \
        "user_id=$OUTLINE_E2E_MEMBER_USER_ID" \
        "permission=read")"
      assert_success "$ADD_COLLECTION_USER_JSON"
      register_cleanup_collection_user "$OUTLINE_E2E_MEMBER_COLLECTION_ID" "$OUTLINE_E2E_MEMBER_USER_ID"

      LIST_COLLECTION_USERS_JSON="$(call_tool list_collection_memberships \
        "collection_id=$OUTLINE_E2E_MEMBER_COLLECTION_ID" \
        "limit=50" \
        "offset=0")"
      assert_success "$LIST_COLLECTION_USERS_JSON"
      assert_inner_array_contains "data" "$OUTLINE_E2E_MEMBER_USER_ID" "$LIST_COLLECTION_USERS_JSON"

      REMOVE_COLLECTION_USER_JSON="$(call_tool remove_collection_user \
        "collection_id=$OUTLINE_E2E_MEMBER_COLLECTION_ID" \
        "user_id=$OUTLINE_E2E_MEMBER_USER_ID")"
      assert_success "$REMOVE_COLLECTION_USER_JSON"

      LIST_COLLECTION_USERS_AFTER_JSON="$(call_tool list_collection_memberships \
        "collection_id=$OUTLINE_E2E_MEMBER_COLLECTION_ID" \
        "limit=50" \
        "offset=0")"
      assert_success "$LIST_COLLECTION_USERS_AFTER_JSON"
      assert_inner_array_not_contains "data" "$OUTLINE_E2E_MEMBER_USER_ID" "$LIST_COLLECTION_USERS_AFTER_JSON"
    fi

    if [[ -n "$OUTLINE_E2E_MEMBER_GROUP_ID" ]] && \
      tool_exists "$TOOLS_JSON" "add_collection_group" && \
      tool_exists "$TOOLS_JSON" "list_collection_group_memberships" && \
      tool_exists "$TOOLS_JSON" "remove_collection_group"; then
      ADD_COLLECTION_GROUP_JSON="$(call_tool add_collection_group \
        "collection_id=$OUTLINE_E2E_MEMBER_COLLECTION_ID" \
        "group_id=$OUTLINE_E2E_MEMBER_GROUP_ID" \
        "permission=read")"
      assert_success "$ADD_COLLECTION_GROUP_JSON"
      register_cleanup_collection_group "$OUTLINE_E2E_MEMBER_COLLECTION_ID" "$OUTLINE_E2E_MEMBER_GROUP_ID"

      LIST_COLLECTION_GROUPS_JSON="$(call_tool list_collection_group_memberships \
        "collection_id=$OUTLINE_E2E_MEMBER_COLLECTION_ID" \
        "limit=50" \
        "offset=0")"
      assert_success "$LIST_COLLECTION_GROUPS_JSON"
      assert_inner_array_contains "data" "$OUTLINE_E2E_MEMBER_GROUP_ID" "$LIST_COLLECTION_GROUPS_JSON"

      REMOVE_COLLECTION_GROUP_JSON="$(call_tool remove_collection_group \
        "collection_id=$OUTLINE_E2E_MEMBER_COLLECTION_ID" \
        "group_id=$OUTLINE_E2E_MEMBER_GROUP_ID")"
      assert_success "$REMOVE_COLLECTION_GROUP_JSON"

      LIST_COLLECTION_GROUPS_AFTER_JSON="$(call_tool list_collection_group_memberships \
        "collection_id=$OUTLINE_E2E_MEMBER_COLLECTION_ID" \
        "limit=50" \
        "offset=0")"
      assert_success "$LIST_COLLECTION_GROUPS_AFTER_JSON"
      assert_inner_array_not_contains "data" "$OUTLINE_E2E_MEMBER_GROUP_ID" "$LIST_COLLECTION_GROUPS_AFTER_JSON"
    fi
  else
    echo "[e2e][6] skipped (set OUTLINE_E2E_MEMBER_COLLECTION_ID + OUTLINE_E2E_MEMBER_USER_ID or OUTLINE_E2E_MEMBER_GROUP_ID)"
  fi
fi

echo "[e2e][7] cleanup policy active (trap on EXIT, best-effort rollback)"
echo "[e2e] done"
