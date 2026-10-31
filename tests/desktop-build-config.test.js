import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import packageJson from "../package.json" with { type: "json" };

test("Windows desktop installer has its own identity and keeps user data on uninstall", () => {
  assert.equal(packageJson.build.appId, "com.taifdigital.moallem.desktop");
  assert.notEqual(packageJson.build.appId, "com.taifdigital.moallem.safe202627");
  assert.equal(packageJson.build.nsis.deleteAppDataOnUninstall, false);
  assert.equal(packageJson.build.nsis.perMachine, false);
});

test("Electron renderer disables Node integration and enables context isolation", async () => {
  const source = await readFile(new URL("../desktop/main.cjs", import.meta.url), "utf8");
  assert.match(source, /nodeIntegration:\s*false/);
  assert.match(source, /contextIsolation:\s*true/);
  assert.match(source, /sandbox:\s*true/);
});
