import * as assert from "assert";
import * as vscode from "vscode";
import {
  AUTH_STATUS_COMMAND_ID,
  CLEAR_TOKEN_COMMAND_ID,
  LOGIN_COMMAND_ID,
  LOGOUT_COMMAND_ID,
  REFRESH_COMMAND_ID,
  RETRY_COMMAND_ID,
  SET_TOKEN_COMMAND_ID,
} from "../../config/settings";

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
    assert.ok(commands.includes(RETRY_COMMAND_ID));
  });

  test("registers auth commands", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes(LOGIN_COMMAND_ID));
    assert.ok(commands.includes(LOGOUT_COMMAND_ID));
  });

  test("registers token management commands", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes(SET_TOKEN_COMMAND_ID));
    assert.ok(commands.includes(CLEAR_TOKEN_COMMAND_ID));
    assert.ok(commands.includes(AUTH_STATUS_COMMAND_ID));
  });
});
