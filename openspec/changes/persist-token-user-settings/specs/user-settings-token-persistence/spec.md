## ADDED Requirements

### Requirement: Token SHALL persist in global user settings
The extension SHALL store the Clawbay API token in global VS Code user settings under `clawbayQuota.apiToken`, and all runtime token reads SHALL use this setting as the primary source of truth.

#### Scenario: Login stores token in global settings
- **WHEN** a user enters a valid API token through `Clawbay Quota: Login` or `Clawbay Quota: Set Token`
- **THEN** the extension writes the trimmed token value to global user settings key `clawbayQuota.apiToken`

#### Scenario: Runtime token provider reads settings token
- **WHEN** the extension refreshes quota data and needs an auth token
- **THEN** it reads `clawbayQuota.apiToken` from user settings and uses that value for authorization

### Requirement: Extension SHALL migrate legacy SecretStorage token once
The extension SHALL perform one-time migration from legacy SecretStorage token storage to `clawbayQuota.apiToken` during activation.

#### Scenario: Migrate when settings token is missing
- **WHEN** activation finds no configured settings token and a legacy SecretStorage token exists
- **THEN** the extension writes the legacy token to `clawbayQuota.apiToken` and deletes the legacy SecretStorage entry

#### Scenario: Settings token wins when both exist
- **WHEN** activation finds both a settings token and a legacy SecretStorage token
- **THEN** the extension keeps the settings token unchanged and deletes the legacy SecretStorage entry

### Requirement: Sign-out SHALL clear persisted token from user settings
The extension SHALL clear the persisted user-settings token when the user signs out.

#### Scenario: Logout clears settings token
- **WHEN** a user runs `Clawbay Quota: Logout` or `Clawbay Quota: Clear Token`
- **THEN** the extension clears `clawbayQuota.apiToken` from global user settings
