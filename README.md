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

## Commands

| Command | Description |
|---|---|
| `Clawbay Quota: Refresh` | Manually refresh quota data |
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
