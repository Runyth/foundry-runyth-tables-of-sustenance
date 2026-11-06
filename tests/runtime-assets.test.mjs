// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const rootPath = new URL("../", import.meta.url).pathname;
const moduleId = "runyth-tables-of-sustenance";

test("food detail no longer adds a startup-critical standalone ES module", async () => {
  const browser = await readFile(new URL("scripts/apps/food-browser-app.mjs", root), "utf8");
  assert.match(browser, /class FoodDetailApp extends PersistentApplication/u);
  assert.doesNotMatch(browser, /food-detail-app\.mjs/u);
  await assert.rejects(access(new URL("scripts/apps/food-detail-app.mjs", root)));
});

test("the built installable tree has a closed runtime asset graph", async () => {
  execFileSync(process.execPath, [join(rootPath, "tools/build.mjs")], { cwd: rootPath, stdio: "pipe" });
  const builtRoot = join(rootPath, "dist/module", moduleId);
  execFileSync(process.execPath, [join(rootPath, "scripts-dev/validate-runtime-assets.mjs"), builtRoot], { cwd: rootPath, stdio: "pipe" });
  const manifest = JSON.parse(await readFile(join(builtRoot, "module.json"), "utf8"));
  assert.equal(manifest.version, "1.3.0");
  await access(join(builtRoot, "scripts/apps/food-browser-app.mjs"));
  await assert.rejects(access(join(builtRoot, "scripts/apps/food-detail-app.mjs")));
});
