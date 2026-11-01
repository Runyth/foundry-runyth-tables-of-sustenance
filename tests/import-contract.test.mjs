import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const service = await readFile(new URL("scripts/services/compendium-service.mjs", root), "utf8");
const effects = await readFile(new URL("scripts/services/effect-service.mjs", root), "utf8");
const main = await readFile(new URL("scripts/main.mjs", root), "utf8");

test("content imports use stable IDs, batching, and edit preservation", () => {
  assert.match(service, /sourceId/);
  assert.match(service, /BATCH_SIZE = 50/);
  assert.match(service, /preserveEditedImports/);
  assert.match(service, /signal\?\.aborted/);
  assert.match(service, /keepId: true/);
});

test("cooldowns and permanent benefits are actor-scoped flags", () => {
  assert.match(effects, /actor\.setFlag\(FLAG_SCOPE, "cooldowns"/);
  assert.match(effects, /actor\.setFlag\(FLAG_SCOPE, "permanentBenefits"/);
  assert.match(effects, /mechanics\.effectId/);
});

test("hooks are registered once in the module entrypoint", () => {
  assert.equal((main.match(/Hooks\.once\("init"/g) ?? []).length, 1);
  assert.equal((main.match(/Hooks\.once\("ready"/g) ?? []).length, 1);
});
