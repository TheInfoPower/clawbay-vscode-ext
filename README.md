# Clawbay Quota

See your [Clawbay](https://theclawbay.com) API quota usage directly in the VS Code status bar.

## Features

- Live 5-hour and weekly usage percentages in the status bar
- Hover tooltip with cost spent, limit, and time until reset
- Instant refresh via the status bar or command palette

## Setup

1. Install the extension
2. Click the **Clawbay** item in the status bar (or run `Clawbay Quota: Login` from the command palette)
3. Paste your Clawbay API key (Clawbay format, typically starts with `ca_`) — it's stored in global VS Code user settings and never logged

If no token is set, the status bar will show an auth-required state; clicking it prompts for a token.

`ca_*` keys are accepted.

## Configuration

The extension supports configurable API endpoints, refresh cadence, and status bar alignment.

### Settings

- `clawbayQuota.apiBaseUrl`: Base URL for the quota API (defaults to `https://theclawbay.com/api/codex-auth/v1`). The extension appends `/quota` if needed.
- `clawbayQuota.apiToken`: API token persisted globally (user settings scope) so authentication survives session and repository changes.
- `clawbayQuota.refreshIntervalMinutes`: How often to auto-refresh quota data (minutes). Set to `0` to disable.
- `clawbayQuota.statusBarAlignment`: Status bar placement (`left` or `right`).

For the legacy codex-auth route (`/api/codex-auth/v1/quota`), the extension automatically requests `format=legacy_codex` for schema compatibility.

On upgrade from older builds, any existing token in legacy SecretStorage is migrated once to `clawbayQuota.apiToken` at activation.

### Environment Variables

- `CLAWBAY_API_BASE_URL`: Override the API base URL for local/dev (example: `https://api.example.com/codex-auth/v1`).

Example (redacted):

```bash
export CLAWBAY_API_BASE_URL="https://api.example.com/codex-auth/v1"
```

## Commands

| Command | Description |
|---|---|
| `Clawbay Quota: Refresh` | Manually refresh quota data |
| `Clawbay Quota: Set Token` | Store or update your API token |
| `Clawbay Quota: Clear Token` | Clear the stored API token |
| `Clawbay Quota: Show Auth Status` | Show whether a token is stored |
| `Clawbay Quota: Login` | Add or update your API key |
| `Clawbay Quota: Logout` | Clear the stored API key |

## Development

1. Install dependencies: `npm install`
2. Build the extension: `npm run compile`
3. Run tests (includes extension host smoke test): `npm test`

## Packaging (vsce)

1. Build the extension: `npm run compile`
2. Package a `.vsix`: `npm run package`

The package command uses `vsce` and produces a `clawbay-quota-<version>.vsix` file in the project root.

## Release Plan

1. Package a `.vsix` (`npm run package`) for local distribution.
2. Validate install by selecting **Extensions: Install from VSIX...** in VS Code.
3. Publish to the marketplace once the publisher account is ready:
   - `npx vsce publish` (requires publisher permissions and a PAT).
