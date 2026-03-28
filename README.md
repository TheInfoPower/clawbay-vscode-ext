# Clawbay Quota

See your [Clawbay](https://theclawbay.com) API quota usage directly in the VS Code status bar.

## Features

- Live 5-hour and weekly usage percentages in the status bar
- Hover tooltip with cost spent, limit, and time until reset
- Instant refresh via the status bar or command palette

## Setup

1. Install the extension
2. Click the **Clawbay** item in the status bar (or run `Clawbay Quota: Login` from the command palette)
3. Paste your Clawbay API key — it's stored securely and never logged

## Configuration

The extension supports configurable API endpoints and token sources.

### Settings

- `clawbayQuota.apiBaseUrl`: Base URL for the quota API (defaults to `https://theclawbay.com/api/codex-auth/v1`). The extension appends `/quota` if needed.
- `clawbayQuota.tokenSource`: Where to read the token from (`secretStorage`, `settings`, or `environment`). Default: `secretStorage`.
- `clawbayQuota.apiToken`: Optional token in settings (use only for local/dev; avoid on shared machines).
- `clawbayQuota.apiTokenEnvVar`: Environment variable name to read when `tokenSource` is `environment` or `settings` (default: `CLAWBAY_API_TOKEN`).

### Environment Variables

- `CLAWBAY_API_BASE_URL`: Override the API base URL for local/dev (example: `https://api.example.com/codex-auth/v1`).
- `CLAWBAY_API_TOKEN`: Provide a token when `tokenSource` is `environment`, or as a fallback when `tokenSource` is `settings`.

Example (redacted):

```bash
export CLAWBAY_API_BASE_URL="https://api.example.com/codex-auth/v1"
export CLAWBAY_API_TOKEN="ca_v1.<redacted>"
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
