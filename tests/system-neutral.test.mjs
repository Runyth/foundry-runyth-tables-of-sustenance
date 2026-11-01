// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const foods = JSON.parse(await readFile(new URL("data/foods.json", root), "utf8"));
const runtimePaths = [
  "scripts/main.mjs",
  "scripts/api.mjs",
  "scripts/services/effect-service.mjs",
  "scripts/services/consumption-service.mjs",
  "scripts/services/compendium-service.mjs",
  "scripts/services/system-adapter-service.mjs"
];
const runtime = (await Promise.all(runtimePaths.map(path => readFile(new URL(path, root), "utf8")))).join("\n");

test("all packaged foods are canonical system-neutral definitions", () => {
  assert.equal(foods.length, 335);
  for (const food of foods) {
    assert.equal(Object.hasOwn(food, "type"), false, food.name);
    assert.equal(Object.hasOwn(food, "system"), false, food.name);
    assert.equal(Object.hasOwn(food, "effects"), false, food.name);
    assert.equal(typeof food.description, "string", food.name);
    const flags = food.flags["runyth-tables-of-sustenance"];
    assert.equal(flags.contentSchema, "system-neutral-food-v1", food.name);
    assert.ok(Array.isArray(flags.mechanics.effectIntents), food.name);
    assert.equal(Object.hasOwn(flags.mechanics, "changes"), false, food.name);
    assert.equal(Object.hasOwn(flags.mechanics, "custom"), false, food.name);
  }
});

test("core runtime contains no D&D hook or D&D actor data path", () => {
  assert.doesNotMatch(runtime, /dnd5e\./u);
  assert.doesNotMatch(runtime, /system\.attributes\.(?:hp|movement|concentration)/u);
  assert.doesNotMatch(runtime, /system\.abilities\.[a-z]+\.bonuses\.save/u);
  assert.doesNotMatch(runtime, /system\.skills\.[a-z]+\.bonuses\.check/u);
});

test("core exposes a capability-gated system adapter contract", async () => {
  const registry = await readFile(new URL("scripts/services/registry.mjs", root), "utf8");
  const api = await readFile(new URL("scripts/api.mjs", root), "utf8");
  for (const capability of ["materializeFood", "remainingServings", "reduceServings", "applyFoodEffect", "removeFoodEffect"]) {
    assert.match(registry, new RegExp(capability));
  }
  assert.match(api, /registerSystemAdapter/u);
  assert.match(api, /getSystemAdapterStatus/u);
  assert.match(api, /materializeFood/u);
});

test("complementary core food registration rejects game-system document payloads", async () => {
  const registry = await readFile(new URL("scripts/services/registry.mjs", root), "utf8");
  assert.match(registry, /Complementary core foods must be system-neutral definitions/u);
  assert.match(registry, /Object\.hasOwn\(clone, "type"\)/u);
  assert.match(registry, /Object\.hasOwn\(clone, "system"\)/u);
  assert.match(registry, /Object\.hasOwn\(clone, "effects"\)/u);
});

test("legacy custom effect handler API delegates to the active system adapter", async () => {
  const service = await readFile(new URL("scripts/services/system-adapter-service.mjs", root), "utf8");
  const api = await readFile(new URL("scripts/api.mjs", root), "utf8");
  assert.match(service, /registerIntentHandler\(kind, handler\)/u);
  assert.match(api, /registerCustomEffectHandler: \(type, handler\) => systemAdapterService\.registerIntentHandler/u);
  assert.match(api, /unregisterCustomEffectHandler/u);
});
