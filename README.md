# Clawbay Quota VS Code Extension (Scaffold)

This repository contains the initial scaffold for a VS Code extension that will surface Clawbay quota information in the editor.

## Current Scope

- Activation + command wiring (`Clawbay Quota: Refresh`)
- Status bar placeholder UI
- Secret storage adapter over VS Code `SecretStorage`
- Stubbed quota client boundary with typed model

## Intentionally Stubbed

The extension does **not** call a live Clawbay API yet. Contract-dependent work is intentionally deferred until endpoint/auth/response details are clarified.

## Scripts

- `npm run compile` — build TypeScript into `out/`
- `npm run watch` — watch mode compilation
- `npm test` — run full extension-host test harness (`@vscode/test-electron`)
- `npm run test:ci` — compile-only validation path for headless server environments

## Security Notes

- Tokens must be stored only in VS Code `SecretStorage`
- No plaintext token persistence in settings or logs

## Validation On This Server (Headless Milestone Path)

This runtime does not provide `node`/`npm` on the default `PATH`, and it does not provide a GUI/X server for launching the VS Code test host.

Use the approved milestone validation commands:

```bash
cd /srv/workspaces/clawbay-vscode-ext
PATH=/tmp/node-v20.20.1-linux-x64/bin:$PATH npm run compile
PATH=/tmp/node-v20.20.1-linux-x64/bin:$PATH npm run test:ci
```

### Why `npm test` Is Not Expected To Pass Here

`npm test` launches the VS Code extension-host test runtime. That requires a desktop/CI environment with GTK3 + xvfb (or equivalent display support). On this headless server, the launch step is expected to fail due to missing display capabilities.

For this scaffold milestone, `npm run test:ci` is the approved compile-only validation path.
