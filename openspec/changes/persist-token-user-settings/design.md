## Context

The extension currently authenticates via a token persisted in VS Code SecretStorage. Users requested persistence across sessions and repository switches via user settings, and we already confirmed an older packaged build has brittle placeholder error handling text. The current code paths span configuration, auth manager/store, token provider, activation bootstrap, commands, and test coverage. The change must preserve existing command UX while safely migrating existing stored tokens.

## Goals / Non-Goals

**Goals:**
- Persist API token in global VS Code user settings so authentication survives workspace/repository changes.
- Migrate legacy SecretStorage token to user settings on activation without user intervention.
- Keep command semantics (`Login`, `Set Token`, `Logout`, auth status) unchanged.
- Maintain compatibility and avoid regressions in refresh and status bar behavior.

**Non-Goals:**
- Introducing remote sync guarantees or encryption beyond what user settings provide.
- Changing quota API contracts or status bar information architecture.
- Supporting long-term dual-write/dual-read storage models.

## Decisions

1. **Settings-first token source**
   - Decision: Add `clawbayQuota.apiToken` in extension configuration and treat it as authoritative runtime token source.
   - Rationale: Meets persistence requirement across session/repo boundaries and simplifies mental model.
   - Alternative considered: keep SecretStorage as primary; rejected because it does not satisfy requested persistence behavior.

2. **One-time migration at activation**
   - Decision: On startup, if settings token is missing and legacy secret token exists, write secret value to global setting and delete secret. If both exist, keep settings value and delete secret.
   - Rationale: Backward compatibility with deterministic precedence and clean cutover.
   - Alternative considered: permanent dual-read fallback; rejected due to lingering complexity and ambiguous source-of-truth.

3. **Preserve command/UI contract**
   - Decision: Keep existing command IDs and interaction flow, replacing only storage backend wiring.
   - Rationale: Prevents user-facing command churn and minimizes rollout risk.
   - Alternative considered: new commands/settings-only workflow; rejected as unnecessary migration burden.

4. **Tests updated around behavior, not storage internals**
   - Decision: Extend tests to assert sign-in/sign-out/status/token-provider behavior under settings + migration semantics.
   - Rationale: Protects externally observable behavior and allows future internal refactors.

## Risks / Trade-offs

- [Plaintext token in settings storage] -> Mitigation: document behavior clearly and keep strict no-logging of sensitive values.
- [Migration edge cases when setting is whitespace/invalid] -> Mitigation: trim-and-validate consistently before write/read.
- [Unexpected divergence between local source and packaged VSIX] -> Mitigation: package and validate fresh VSIX from updated source before release.
- [Behavior regressions in auth/refresh flow] -> Mitigation: maintain command contract and add focused tests for migration + token lifecycle.
