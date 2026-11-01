import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("module.json", root), "utf8"));

test("manifest targets Foundry v13 without binding the core to a game system", async () => {
  assert.equal(manifest.id, "runyth-tables-of-sustenance");
  assert.equal(manifest.version, "1.1.1");
  assert.equal(manifest.compatibility.minimum, "13.347");
  assert.equal(manifest.compatibility.verified, "13.351");
  assert.equal(manifest.compatibility.maximum, "13");
  assert.equal(manifest.relationships?.systems, undefined);
  for (const path of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(language => language.path)]) {
    await access(new URL(path, root));
  }
});
