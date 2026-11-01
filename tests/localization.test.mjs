// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const moduleId = "runyth-tables-of-sustenance";
const foods = JSON.parse(await readFile(new URL("data/foods.json", root), "utf8"));
const en = JSON.parse(await readFile(new URL("lang/en.json", root), "utf8"));
const de = JSON.parse(await readFile(new URL("lang/de.json", root), "utf8"));

test("English and German UI localization have exact recursive key parity", () => {
  assert.deepEqual(flattenKeys(de[moduleId]), flattenKeys(en[moduleId]));
});

test("every food includes a complete German description", () => {
  for (const food of foods) {
    const localized = food.flags[moduleId].localizations.de;
    assert.ok(localized.name, food.name);
    assert.match(localized.description, /<h3>Überblick<\/h3>/, food.name);
    assert.match(localized.description, /<h3>SL-Hinweise<\/h3>/, food.name);
  }
});

function flattenKeys(value, prefix = "") {
  const keys = [];
  for (const [key, child] of Object.entries(value ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) keys.push(...flattenKeys(child, path));
    else keys.push(path);
  }
  return keys.sort();
}
