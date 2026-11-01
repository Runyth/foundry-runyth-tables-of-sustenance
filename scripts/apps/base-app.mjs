import { MODULE_ID, SETTINGS } from "../constants.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const SAVE_DELAY_MS = 180;

export class PersistentApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  #saveTimer = null;

  constructor(options = {}) {
    const appId = options.id ?? new.target.DEFAULT_OPTIONS.id;
    const saved = game.settings.get(MODULE_ID, SETTINGS.windowState)?.[appId] ?? {};
    const position = clampSavedPosition(saved);
    super(foundry.utils.mergeObject(options, { position }, { inplace: false, insertKeys: true, overwrite: false }));
    this.addEventListener("position", () => this.#queuePositionSave());
  }

  async close(options = {}) {
    await this.#savePosition();
    return super.close(options);
  }

  async resetGeometry({ size = true, position = true } = {}) {
    const state = foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTINGS.windowState) ?? {});
    const current = state[this.id] ?? {};
    if (size) {
      delete current.width;
      delete current.height;
    }
    if (position) {
      delete current.left;
      delete current.top;
    }
    if (Object.keys(current).length) state[this.id] = current;
    else delete state[this.id];
    await game.settings.set(MODULE_ID, SETTINGS.windowState, state);
    const defaults = this.constructor.DEFAULT_OPTIONS.position ?? {};
    const next = {};
    if (size) {
      if (Number.isFinite(defaults.width)) next.width = defaults.width;
      if (Number.isFinite(defaults.height)) next.height = defaults.height;
    }
    if (position) {
      const width = Number(next.width ?? this.position.width ?? defaults.width ?? 800);
      const height = Number(next.height ?? this.position.height ?? defaults.height ?? 700);
      next.left = Math.max(0, Math.round((window.innerWidth - width) / 2));
      next.top = Math.max(0, Math.round((window.innerHeight - height) / 2));
    }
    this.setPosition(next);
    return this.position;
  }

  #queuePositionSave() {
    clearTimeout(this.#saveTimer);
    this.#saveTimer = setTimeout(() => {
      this.#savePosition().catch(error => console.warn(`[${MODULE_ID}] Failed to persist window geometry.`, error));
    }, SAVE_DELAY_MS);
  }

  async #savePosition() {
    clearTimeout(this.#saveTimer);
    this.#saveTimer = null;
    const state = foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTINGS.windowState) ?? {});
    state[this.id] = geometrySnapshot(this.position);
    await game.settings.set(MODULE_ID, SETTINGS.windowState, state);
  }
}

function geometrySnapshot(position = {}) {
  const snapshot = {};
  for (const key of ["left", "top", "width", "height"]) {
    const value = Number(position[key]);
    if (Number.isFinite(value) && value >= 0) snapshot[key] = Math.round(value);
  }
  return snapshot;
}

function clampSavedPosition(saved = {}) {
  const position = geometrySnapshot(saved);
  const viewportWidth = Math.max(320, Number(globalThis.window?.innerWidth ?? 1920));
  const viewportHeight = Math.max(240, Number(globalThis.window?.innerHeight ?? 1080));
  if (position.width) position.width = Math.min(position.width, Math.max(320, viewportWidth - 32));
  if (position.height) position.height = Math.min(position.height, Math.max(240, viewportHeight - 32));
  if (position.left !== undefined) position.left = Math.min(Math.max(0, position.left), Math.max(0, viewportWidth - 120));
  if (position.top !== undefined) position.top = Math.min(Math.max(0, position.top), Math.max(0, viewportHeight - 80));
  return position;
}
