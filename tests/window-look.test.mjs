// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
// Stock Foundry look toggle and fleet look regressions for Runyth Tables of Sustenance.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = (name) => path.join(root, name);
const read = (name) => readFileSync(repo(name), "utf8");

class ApplicationV2Stub {}

function fakeWindowElement(classes = []) {
  const set = new Set(classes);
  const attributes = new Map();
  return {
    classes: set,
    attributes,
    classList: {
      add: (name) => set.add(name),
      remove: (name) => set.delete(name),
      contains: (name) => set.has(name),
      toggle: (name, force) => {
        const active = force === undefined ? !set.has(name) : Boolean(force);
        if (active) set.add(name);
        else set.delete(name);
        return active;
      }
    },
    setAttribute: (name, value) => attributes.set(name, value),
    getAttribute: (name) => attributes.get(name) ?? null
  };
}

function configureStockLook(value) {
  globalThis.game = {
    settings: {
      register: () => undefined,
      registerMenu: () => undefined,
      get: (moduleId, key) => (moduleId === "runyth-tables-of-sustenance" && key === "stockFoundryLook" ? value : undefined)
    }
  };
}

test("the food browser applies its layout to the window content, never to the window root", async () => {
  globalThis.foundry = { applications: { api: {
    ApplicationV2: class {},
    HandlebarsApplicationMixin: (Base) => class extends Base {}
  } } };
  const { FoodBrowserApp } = await import("../scripts/apps/food-browser-app.mjs");
  const browserOptions = FoodBrowserApp.DEFAULT_OPTIONS;
  assert.deepEqual(browserOptions.classes, ["rts", "rts-browser"]);
  assert.deepEqual(browserOptions.window.contentClasses, ["rts-browser-layout"]);
  assert.equal(browserOptions.classes.includes("rts-browser-layout"), false);
});

test("registers the look toggle disabled by default on the client scope and re-syncs on settings closure", async () => {
  const registrations = new Map();
  const hooks = new Map();
  globalThis.Hooks = { on: (name, handler) => hooks.set(name, handler), once: () => undefined };
  globalThis.game = { settings: { register: (moduleId, key, data) => registrations.set(key, data) } };

  const { registerSettings } = await import("../scripts/settings.mjs");
  registerSettings({});

  const entry = registrations.get("stockFoundryLook");
  assert.ok(entry, "the stock Foundry look toggle is registered");
  assert.equal(entry.scope, "client");
  assert.equal(entry.config, true);
  assert.equal(entry.type, Boolean);
  assert.equal(entry.default, false);
  assert.equal(entry.name, "runyth-tables-of-sustenance.Settings.StockFoundryLook.Name");
  assert.ok(hooks.has("closeSettingsConfig"), "settings closure re-syncs mounted windows");
});

test("applies the fleet class by default and keeps the stock look verbatim when toggled", async () => {
  const { applyUiLook, windowClasses, FLEET_UI_CLASS } = await import("../scripts/ui-look.mjs");
  const { mountWindowIdentity } = await import("../scripts/window-look.mjs");

  configureStockLook(false);
  const fleetElement = fakeWindowElement();
  applyUiLook(fleetElement);
  assert.equal(fleetElement.classList.contains(FLEET_UI_CLASS), true);
  assert.deepEqual(
    windowClasses(["rts-confirm-dialog"]),
    ["rts-confirm-dialog", FLEET_UI_CLASS]
  );

  configureStockLook(true);
  const stockElement = fakeWindowElement();
  applyUiLook(stockElement);
  assert.equal(stockElement.classList.contains(FLEET_UI_CLASS), false);
  assert.deepEqual(windowClasses(["rts-preset-dialog"]), ["rts-preset-dialog"]);

  configureStockLook(false);
  mountWindowIdentity({ options: { classes: ["rts", "rts-browser"] }, element: fleetElement });
  assert.equal(fleetElement.classList.contains(FLEET_UI_CLASS), true);
  assert.equal(fleetElement.getAttribute("data-runyth-tables-of-sustenance-window"), "");
  configureStockLook(true);
  mountWindowIdentity({ options: { classes: ["rts", "rts-browser"] }, element: fleetElement });
  assert.equal(fleetElement.classList.contains(FLEET_UI_CLASS), false);
});

test("syncOpenWindows reaches every mounted window through classes and the render marker", async () => {
  const { syncOpenWindows, FLEET_UI_CLASS, WINDOW_MARKER } = await import("../scripts/ui-look.mjs");
  const appWindow = fakeWindowElement(["rts", "rts-dashboard"]);
  const markerOnly = fakeWindowElement([]);
  markerOnly.setAttribute(WINDOW_MARKER, "");

  const tracked = [];
  globalThis.document = {
    querySelectorAll: (selector) => {
      tracked.push(selector);
      return [appWindow, markerOnly];
    }
  };

  configureStockLook(false);
  assert.equal(syncOpenWindows(), false);
  assert.equal(appWindow.classList.contains(FLEET_UI_CLASS), true);
  assert.equal(markerOnly.classList.contains(FLEET_UI_CLASS), true);

  configureStockLook(true);
  assert.equal(syncOpenWindows(), true);
  assert.equal(appWindow.classList.contains(FLEET_UI_CLASS), false);
  assert.equal(markerOnly.classList.contains(FLEET_UI_CLASS), false);

  for (const selector of tracked) {
    assert.ok(selector.includes(`[${WINDOW_MARKER}]`));
    assert.ok(selector.includes(".rts"));
  }
  globalThis.document = undefined;
});

test("syncRenderedWindow mounts identity and look independently of the host classes forwarding", async () => {
  const { syncRenderedWindow } = await import("../scripts/window-look.mjs");
  const { FLEET_UI_CLASS, WINDOW_MARKER } = await import("../scripts/ui-look.mjs");

  configureStockLook(false);
  const element = fakeWindowElement();
  const appWindow = new ApplicationV2Stub();
  appWindow.options = { classes: ["application", "rts", "rts-dashboard"] };
  appWindow.element = element;

  assert.equal(syncRenderedWindow(appWindow), true);
  assert.equal(element.classList.contains("application"), true);
  assert.equal(element.classList.contains("rts"), true);
  assert.equal(element.classList.contains(FLEET_UI_CLASS), true);
  assert.equal(element.getAttribute(WINDOW_MARKER), "");

  configureStockLook(true);
  assert.equal(syncRenderedWindow(appWindow), true);
  assert.equal(element.classList.contains(FLEET_UI_CLASS), false);
  assert.equal(element.classList.contains("rts"), true);

  const dialogElement = fakeWindowElement();
  const confirmDialog = new ApplicationV2Stub();
  confirmDialog.options = { classes: [FLEET_UI_CLASS, "rts-confirm-dialog"] };
  confirmDialog.element = dialogElement;
  assert.equal(syncRenderedWindow(confirmDialog), true);
  assert.equal(dialogElement.classList.contains("rts-confirm-dialog"), true);
  assert.equal(dialogElement.getAttribute(WINDOW_MARKER), "");

  const foreignElement = fakeWindowElement();
  const foreign = new ApplicationV2Stub();
  foreign.options = { classes: ["application", "some-other-module-window"] };
  foreign.element = foreignElement;
  assert.equal(syncRenderedWindow(foreign), false);
  assert.equal(foreignElement.classes.size, 0);
  assert.equal(foreignElement.getAttribute(WINDOW_MARKER) === "", false);
});

test("every module dialog carries its window identity classes for the hook path", () => {
  const browser = read("scripts/apps/food-browser-app.mjs");
  assert.match(browser, /classes: windowClasses\(\["rts-preset-dialog"\]\)/);
  const manager = read("scripts/apps/content-manager-app.mjs");
  assert.match(manager, /classes: windowClasses\(\["rts-confirm-dialog"\]\)/);
  const transfer = read("scripts/apps/import-export-app.mjs");
  assert.match(transfer, /classes: windowClasses\(\["rts-confirm-dialog"\]\)/);
  const consumption = read("scripts/services/consumption-service.mjs");
  assert.equal(consumption.split("windowClasses([\"rts-confirm-dialog\"])").length >= 3, true);
});

test("the persistent application base mounts the look directly at render", async () => {
  const source = read("scripts/apps/base-app.mjs");
  assert.match(source, /async _onRender\(context, options\)/);
  assert.match(source, /await super\._onRender\?\.\(context, options\)/);
  assert.match(source, /mountWindowIdentity\(this\)/);

  const main = read("scripts/main.mjs");
  assert.match(main, /ensureWindowLookHooks\(\)/);

  const hooks = await import("../scripts/window-look.mjs");
  assert.equal(typeof hooks.ensureWindowLookHooks, "function");
});

test("the fleet layer keys every rule on the fleet class alone and never on bare globals", () => {
  const css = read("styles/runyth-tables-of-sustenance.css");
  const layerStart = css.indexOf(".runyth-tables-of-sustenance-fleet-ui {");
  assert.ok(layerStart > 0, "the fleet layer is appended to the stylesheet");
  const layer = css.slice(layerStart).replace(/\/\*[\s\S]*?\*\//g, "");
  const flat = layer.replace(/:(is|not)\([^()]*\)/g, "()");
  const selectors = flat.split("}").map((block) => block.split("{")[0]).filter((part) => part.trim());
  const rules = [];
  for (const chunk of selectors) {
    for (const selector of chunk.split(",")) {
      if (selector.trim()) rules.push(selector.trim());
    }
  }
  assert.ok(rules.length >= 12, "the fleet layer is present");
  for (const selector of rules) {
    assert.ok(selector.includes(".runyth-tables-of-sustenance-fleet-ui"), `scoped: ${selector}`);
  }
  for (const bare of [":root", "html {", "body {"]) {
    assert.ok(!layer.includes(bare), `no bare global ${bare}`);
  }
  assert.ok(layer.includes("linear-gradient"), "the fleet shell gradient is present");
  assert.ok(layer.includes("#f0ca82"), "the gold headings are present");
});
