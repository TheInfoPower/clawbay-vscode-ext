# HOM-8 Extension Plan

Date: 2026-03-15 15:02 UTC
Issue: HOM-8
Project: clawbay-vscode-ext

## Objective

Ship an initial VS Code extension that lets the user view current Clawbay quota inside the editor with secure authentication, clear failure states, and a packaging path for local install.

## Current State

- The workspace is now writable.
- The repository is still greenfield.
- `project_profiles/clawbay-vscode-ext.md` is still missing.
- CTO prerequisite task `HOM-10` tracks the required system map and project profile.

## Planned Sequence

1. Produce the initial system map and project profile for the project.
2. Confirm the quota API contract and MVP authentication path.
3. Bootstrap the VS Code extension toolchain and repository layout.
4. Implement the quota client with typed parsing and secure secret storage.
5. Implement the editor UX with status bar and refresh flows.
6. Add tests, packaging checks, and operator documentation.

## Key Risks

- The auth flow may need to fall back to a user-provided token in VS Code `SecretStorage`.
- Implementation should not start before the project profile exists.
- A stable quota API contract is still required before coding the data layer.

## Status

Blocked pending `HOM-10` completion.
