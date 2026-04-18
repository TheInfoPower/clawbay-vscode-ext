import * as path from "path";
import * as Mocha from "mocha";

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: "tdd",
    color: true
  });

  mocha.addFile(path.resolve(__dirname, "./extension.test"));
  mocha.addFile(path.resolve(__dirname, "./auth-manager.test"));
  mocha.addFile(path.resolve(__dirname, "./command-handlers.test"));
  mocha.addFile(path.resolve(__dirname, "./quota-client.test"));
  mocha.addFile(path.resolve(__dirname, "./token-migration.test"));

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
        return;
      }
      resolve();
    });
  });
}
