# outline-mcp

A production-focused MCP (`stdio`) server for Outline.
Use it from MCP clients (Codex, Claude Desktop, Cursor, etc.) via npm without cloning this repo.

## Install From npm

Package:

```bash
npm i -g @outline-mcp/mcp
```

Run:

```bash
outline-mcp
```

Or run without global install:

```bash
npx -y @outline-mcp/mcp
```

## MCP Client Config (Copy/Paste)

```json
{
  "mcpServers": {
    "outline": {
      "command": "npx",
      "args": ["-y", "@outline-mcp/mcp"],
      "env": {
        "OUTLINE_API_KEY": "your_api_key",
        "OUTLINE_BASE_URL": "https://app.getoutline.com",
        "OUTLINE_ALLOWED_ACTIONS": "read,write,delete"
      }
    }
  }
}
```

## Environment Guides

<details>
<summary>Outline Cloud (recommended)</summary>

Use this for `app.getoutline.com` workspaces.

```bash
OUTLINE_API_KEY=your_api_key
OUTLINE_BASE_URL=https://app.getoutline.com
OUTLINE_ALLOWED_ACTIONS=read,write,delete
```

</details>

<details>
<summary>Self-hosted Outline</summary>

Use your self-hosted endpoint.

```bash
OUTLINE_API_KEY=your_api_key
OUTLINE_BASE_URL=https://outline.your-company.internal
OUTLINE_ALLOWED_ACTIONS=read,write,delete
```

</details>

<details>
<summary>Read-only agent (safe mode)</summary>

Use this when agents must never mutate content.

```bash
OUTLINE_API_KEY=your_api_key
OUTLINE_BASE_URL=https://app.getoutline.com
OUTLINE_ALLOWED_ACTIONS=read
```

</details>

<details>
<summary>Read/write without delete</summary>

Use this when agents can draft/edit but must not remove resources.

```bash
OUTLINE_API_KEY=your_api_key
OUTLINE_BASE_URL=https://app.getoutline.com
OUTLINE_ALLOWED_ACTIONS=read,write
```

</details>

<details>
<summary>Lease backed by data attributes (multi-agent)</summary>

Use this for cross-process lease coordination.

```bash
OUTLINE_API_KEY=your_api_key
OUTLINE_BASE_URL=https://app.getoutline.com
OUTLINE_ALLOWED_ACTIONS=read,write,delete
OUTLINE_LEASE_STRATEGY=data_attribute
OUTLINE_LEASE_ATTRIBUTE_ID=your_data_attribute_id
OUTLINE_LEASE_DEFAULT_TTL_SECONDS=600
OUTLINE_LEASE_MAX_TTL_SECONDS=7200
```

</details>

## What You Get

- Collection tools: list/create/update/delete
- Document tools: search/read/create/update/move/delete
- Safe concurrent writes: `safe_update_document`
- Template tools
- Comment tools
- Membership tools (user/group for docs + collections)
- Export tools
- Lease tools (`acquire`, `renew`, `release`, `get_active`)

For full tool/argument documentation:

- [`apps/mcp/README.md`](apps/mcp/README.md)

## Key Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OUTLINE_API_KEY` | none (required) | Outline API token |
| `OUTLINE_BASE_URL` | `https://app.getoutline.com` | Cloud or self-hosted endpoint |
| `OUTLINE_ALLOWED_ACTIONS` | `read,write,delete` | Allowed server actions |
| `OUTLINE_REQUEST_TIMEOUT_MS` | `15000` | API timeout in milliseconds |
| `OUTLINE_RETRY_COUNT` | `2` | Retry count for 429/5xx |
| `OUTLINE_ENABLE_CAPABILITY_PROBE` | `true` | Probe optional endpoints at startup |
| `OUTLINE_LEASE_STRATEGY` | `auto` | `auto` \| `memory` \| `data_attribute` |
| `OUTLINE_LEASE_ATTRIBUTE_ID` | none | Required for `data_attribute` lease strategy |
| `OUTLINE_LEASE_DEFAULT_TTL_SECONDS` | `600` | Default lease TTL |
| `OUTLINE_LEASE_MAX_TTL_SECONDS` | `7200` | Maximum lease TTL |

## Local Development (Monorepo)

```bash
git clone <repo-url>
cd outline-mcp
pnpm install
pnpm --filter @outline-mcp/mcp build
pnpm --filter @outline-mcp/mcp dev
```

## Testing

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm e2e:mcp
```

E2E notes:

- Loads `.env`, `.env.local`, `.env.e2e` from root and `apps/mcp`
- If `OUTLINE_E2E_COLLECTION_ID` is not set, it creates a temporary collection and cleans it up automatically

## Publishing

From this monorepo:

```bash
pnpm --filter @outline-mcp/mcp build
pnpm --filter @outline-mcp/mcp publish --access public
```

If you do not own the `@outline-mcp` npm scope, update `apps/mcp/package.json` `name` before publishing.

## License

[MIT](LICENSE)
