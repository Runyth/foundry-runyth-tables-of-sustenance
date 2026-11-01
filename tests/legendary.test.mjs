// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const moduleId = "runyth-tables-of-sustenance";
const foods = JSON.parse(await readFile(new URL("data/foods.json", root), "utf8"));
const tables = JSON.parse(await readFile(new URL("data/tables.json", root), "utf8"));
const legendary = foods.filter(food => food.flags[moduleId].meta.tier === "S");

test("legendary foods are unique, permanent, and duplicate-safe", () => {
  assert.equal(legendary.length, 10);
  assert.equal(new Set(legendary.map(food => food.flags[moduleId].mechanics.effectId)).size, 10);
  for (const food of legendary) {
    const flags = food.flags[moduleId];
    assert.equal(flags.mechanics.permanent, true, food.name);
    assert.equal(flags.mechanics.duplicatePolicy, "deny-and-preserve-item", food.name);
    assert.equal(flags.mechanics.requiresConfirmation, true, food.name);
    assert.ok(flags.meta.legend && flags.meta.provenance && flags.meta.discoveryConditions, food.name);
  }
});

test("ordinary random tables never directly distribute Tier S food", () => {
  for (const table of tables) {
    assert.equal(table.flags[moduleId].containsTierSFood, false, table.name);
    for (const result of table.results) assert.notEqual(result.flags[moduleId].tierSDirectResult, true, table.name);
  }
  assert.ok(tables.some(table => table.flags[moduleId].containsTierSClues), "legendary clue table");
});
