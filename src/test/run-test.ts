import * as path from "path";
import { runTests } from "@vscode/test-electron";

async function main(): Promise<void> {
  // In headless server environments (no display/GTK), full extension-host tests
  // cannot run. Set VSCODE_SKIP_LAUNCH_TESTS=1 to skip them and treat compile
  // success as sufficient validation.
  if (process.env["VSCODE_SKIP_LAUNCH_TESTS"] === "1") {
    console.log("VSCODE_SKIP_LAUNCH_TESTS=1: skipping extension-host launch (compile-only mode).");
    console.log("Run without this flag in a desktop/CI environment with GTK3 + xvfb for full tests.");
    process.exit(0);
  }

  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ["--no-sandbox", "--disable-gpu"],
    });
  } catch (error) {
    console.error("Failed to run extension tests");
    process.exit(1);
  }
}

void main();
