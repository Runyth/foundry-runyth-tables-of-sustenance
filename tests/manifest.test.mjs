// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("module.json", root), "utf8"));

test("manifest targets Foundry v13 without binding the core to a game system", async () => {
  assert.equal(manifest.id, "runyth-tables-of-sustenance");
  assert.equal(manifest.version, "1.2.1");
  assert.equal(manifest.compatibility.minimum, "13.347");
  assert.equal(manifest.compatibility.verified, "13.351");
  assert.equal(manifest.compatibility.maximum, "13");
  assert.equal(manifest.relationships?.systems, undefined);
  for (const path of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(language => language.path)]) {
    await access(new URL(path, root));
  }
});
test("manifest carries the publication identity", () => {
  assert.equal(manifest.title, "Runyth Tables of Sustenance");
  assert.equal(manifest.license, "LICENSE");
  assert.equal(manifest.authors.length, 1);
  assert.equal(manifest.authors[0].name, "Runyth");
  assert.equal(manifest.authors[0].url, "https://github.com/Runyth");
  assert.equal(manifest.url, "https://github.com/Runyth/foundry-runyth-tables-of-sustenance");
  assert.equal(manifest.manifest, "https://github.com/Runyth/foundry-runyth-tables-of-sustenance/releases/latest/download/module.json");
  assert.equal(
    manifest.download,
    `https://github.com/Runyth/foundry-runyth-tables-of-sustenance/releases/download/v${manifest.version}/runyth-tables-of-sustenance-v${manifest.version}-mod.zip`
  );
});
