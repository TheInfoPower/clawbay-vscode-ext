import * as assert from "assert";
import * as vscode from "vscode";
import { AuthManager } from "../../auth/auth-manager";
import type { TokenStore } from "../../auth/token-store";
import { createSignInHandler } from "../../commands/sign-in";
import { createSignOutHandler } from "../../commands/sign-out";

function createMemoryTokenStore(): TokenStore {
  let token: string | undefined;
  return {
    getToken: async () => token,
    setToken: async (nextToken: string) => {
      token = nextToken;
    },
    clearToken: async () => {
      token = undefined;
    },
  };
}

suite("Command handlers", () => {
  test("sign-in stores trimmed ca token and runs follow-up refresh", async () => {
    const tokenStore = createMemoryTokenStore();
    const authManager = new AuthManager(tokenStore);
    let refreshed = false;

    const originalShowInputBox = vscode.window.showInputBox;
    (vscode.window as unknown as { showInputBox: typeof vscode.window.showInputBox }).showInputBox =
      async () => "  ca_v1.trimmed  ";

    try {
      const handler = createSignInHandler({
        authManager,
        onAfterSignIn: async () => {
          refreshed = true;
        },
      });

      await handler();

      assert.equal(await tokenStore.getToken(), "ca_v1.trimmed");
      assert.equal(refreshed, true);
    } finally {
      (vscode.window as unknown as { showInputBox: typeof vscode.window.showInputBox }).showInputBox =
        originalShowInputBox;
    }
  });

  test("sign-out clears token and runs follow-up refresh", async () => {
    const tokenStore = createMemoryTokenStore();
    const authManager = new AuthManager(tokenStore);
    await authManager.setToken("ca_v1.logout");
    let refreshed = false;
    let infoMessage: string | undefined;

    const originalShowInformationMessage = vscode.window.showInformationMessage;
    (
      vscode.window as unknown as {
        showInformationMessage: typeof vscode.window.showInformationMessage;
      }
    ).showInformationMessage = async (message: string | vscode.MessageItem) => {
      infoMessage = typeof message === "string" ? message : message.title;
      return undefined;
    };

    try {
      const handler = createSignOutHandler({
        authManager,
        onAfterSignOut: async () => {
          refreshed = true;
        },
      });

      await handler();

      assert.equal(await tokenStore.getToken(), undefined);
      assert.equal(infoMessage, "Clawbay API token cleared.");
      assert.equal(refreshed, true);
    } finally {
      (
        vscode.window as unknown as {
          showInformationMessage: typeof vscode.window.showInformationMessage;
        }
      ).showInformationMessage = originalShowInformationMessage;
    }
  });
});
