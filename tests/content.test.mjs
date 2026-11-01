// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const moduleId = "runyth-tables-of-sustenance";
const foods = JSON.parse(await readFile(new URL("data/foods.json", root), "utf8"));
const meta = food => food.flags[moduleId].meta;
const mechanics = food => food.flags[moduleId].mechanics;

test("the compendium has the required tier distribution", () => {
  const counts = Object.fromEntries(["1", "2", "3", "4", "S"].map(tier => [tier, foods.filter(food => meta(food).tier === tier).length]));
  assert.deepEqual(counts, { "1": 180, "2": 80, "3": 45, "4": 20, "S": 10 });
});

test("Tier 1 entries are narrative sustenance", () => {
  for (const food of foods.filter(food => meta(food).tier === "1")) {
    assert.equal(mechanics(food).effectIntents.length, 0, food.name);
    assert.equal(mechanics(food).permanent, false, food.name);
    assert.match(mechanics(food).summary, /No direct statistical benefit/, food.name);
  }
});

test("Tier 4 entries enforce strong anti-spam rules", () => {
  for (const food of foods.filter(food => meta(food).tier === "4")) {
    assert.ok(mechanics(food).cooldownSeconds >= 259200, food.name);
    assert.equal(mechanics(food).requiresConfirmation, true, food.name);
    assert.equal(mechanics(food).requiresQualifiedCook, true, food.name);
    assert.ok(mechanics(food).spoilageSeconds > 0, food.name);
  }
});
