// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";

class ApplicationV2 {
  static DEFAULT_OPTIONS = {};
  constructor(options = {}) { this.options = options; this.id = options.id ?? this.constructor.DEFAULT_OPTIONS.id; this.position = options.position ?? {}; this.rendered = false; }
  render() { this.rendered = true; return this; }
  async close() { this.rendered = false; }
}

const callbacks = [];
globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2,
      HandlebarsApplicationMixin: Base => class extends Base {},
      DialogV2: { confirm: async () => true, prompt: async () => null }
    }
  },
  utils: {
    deepClone: structuredClone,
    mergeObject: (a, b) => ({ ...a, ...b }),
    getProperty: (object, path) => path.split(".").reduce((value, key) => value?.[key], object),
    setProperty: (object, path, value) => {
      const parts = path.split(".");
      let current = object;
      for (const part of parts.slice(0, -1)) current = current[part] ??= {};
      current[parts.at(-1)] = value;
      return true;
    },
    randomID: () => "MockRandomId0001",
    slugify: value => String(value).toLowerCase().replace(/\s+/g, "-"),
    escapeHTML: value => String(value)
  },
  documents: { collections: { CompendiumCollection: class {} } }
};
globalThis.Hooks = {
  once: (name, callback) => callbacks.push({ mode: "once", name, callback }),
  on: (name, callback) => callbacks.push({ mode: "on", name, callback }),
  call: () => true,
  callAll: () => undefined
};
globalThis.game = {
  modules: new Map([["runyth-tables-of-sustenance", { version: "1.2.1" }]]),
  settings: { get: () => ({}), register: () => undefined, registerMenu: () => undefined },
  i18n: { lang: "en", localize: key => key, format: key => key },
  system: { id: "dnd5e" },
  users: [],
  user: { id: "user", isGM: true },
  socket: { on: () => undefined, off: () => undefined, emit: () => undefined },
  packs: new Map(),
  actors: []
};
globalThis.ui = { notifications: { warn: () => undefined, info: () => undefined, error: () => undefined } };
globalThis.canvas = { tokens: { controlled: [] } };
globalThis.Item = { implementation: { fromSource: source => source } };
globalThis.ChatMessage = class {};

test("the Foundry entrypoint imports and registers one init and one ready hook", async () => {
  await import(`../scripts/main.mjs?smoke=${Date.now()}`);
  assert.equal(callbacks.filter(entry => entry.name === "init" && entry.mode === "once").length, 1);
  assert.equal(callbacks.filter(entry => entry.name === "ready" && entry.mode === "once").length, 1);
  assert.ok(callbacks.some(entry => entry.name === "renderApplicationV2"));
  assert.ok(callbacks.some(entry => entry.name === "dropActorSheetData"));
  assert.equal(callbacks.some(entry => entry.name === "renderItemDirectory"), false);
  assert.equal(callbacks.some(entry => entry.name.startsWith("dnd5e.")), false);
});

test("the init hook exposes the core API before the ready hook", async () => {
  const init = callbacks.find(entry => entry.name === "init" && entry.mode === "once");
  assert.ok(init);
  init.callback();
  assert.equal(game["runyth-tables-of-sustenance"].version, "1.2.1");
  assert.equal(game.modules.get("runyth-tables-of-sustenance").api, game["runyth-tables-of-sustenance"]);
});
