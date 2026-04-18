# Release Checklist: Clawbay VS Code Extension

## Build + Test
- Run `npm ci` from the repo root.
- Run `npm run test:ci` to compile and validate command registration + quota client parsing.
- Run `npm run package` to generate the VSIX.

## Packaging
- Confirm the VSIX artifact is created in the repo root (e.g. `clawbay-quota-<version>.vsix`).
- Verify `package.json` metadata (version, publisher, icon) matches the intended release.

## Security Review (Secrets + Logs)
- Verify tokens are only stored via `vscode.SecretStorage` (no plaintext config values).
- Confirm logs never print tokens, auth headers, or user identifiers.
- Ensure error messages for auth failures and transport errors are redacted and generic.
- Check `clawbayQuota.apiBaseUrl` does not include credentials (no embedded basic auth or tokens).

## QA Spot Checks
- Install the VSIX locally and confirm the status bar item appears.
- Verify `Clawbay Quota: Refresh` and `Clawbay Quota: Retry` commands execute without throwing.
- Confirm auth commands (`Login`, `Logout`, `Set Token`, `Clear Token`) show expected prompts.
