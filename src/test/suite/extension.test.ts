import * as assert from "assert";
import * as vscode from "vscode";
import { LOGIN_COMMAND_ID, LOGOUT_COMMAND_ID, REFRESH_COMMAND_ID } from "../../config/settings";

suite("Extension Scaffold", () => {
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension("theInfoPower.clawbay-quota");
    if (ext && !ext.isActive) {
      await ext.activate();
    }
  });

  test("registers the refresh command", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes(REFRESH_COMMAND_ID));
  });

  test("registers auth commands", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes(LOGIN_COMMAND_ID));
    assert.ok(commands.includes(LOGOUT_COMMAND_ID));
  });
});
