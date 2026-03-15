import * as assert from "assert";
import * as vscode from "vscode";
import { REFRESH_COMMAND_ID } from "../../config/settings";

suite("Extension Scaffold", () => {
  test("registers the refresh command", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes(REFRESH_COMMAND_ID));
  });
});
