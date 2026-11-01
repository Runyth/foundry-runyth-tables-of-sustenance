import { FLAG_SCOPE, HOOKS, MODULE_ID, PACKS, SETTINGS } from "../constants.mjs";
import { deepClone } from "../lib/utils.mjs";

class ImageOverrideService {
  all() {
    return deepClone(game.settings.get(MODULE_ID, SETTINGS.imageOverrides) ?? {});
  }

  get(sourceId, fallback = null) {
    return this.all()[sourceId] ?? fallback;
  }

  apply(source) {
    const clone = deepClone(source);
    const sourceId = foundry.utils.getProperty(clone, `flags.${FLAG_SCOPE}.sourceId`);
    const override = sourceId ? this.get(sourceId) : null;
    if (override) clone.img = override;
    return clone;
  }

  async set(sourceId, path, { syncImported = true } = {}) {
    this.#requireGM();
    const normalized = String(path ?? "").trim();
    if (!sourceId || !normalized) throw new TypeError("A stable source ID and non-empty image path are required.");
    const overrides = this.all();
    overrides[sourceId] = normalized;
    await game.settings.set(MODULE_ID, SETTINGS.imageOverrides, overrides);
    if (syncImported) await this.#syncImported(sourceId, normalized);
    Hooks.callAll(HOOKS.imageOverrideChanged, { sourceId, img: normalized, reset: false });
    return normalized;
  }

  async reset(sourceId, fallbackImage = null, { syncImported = true } = {}) {
    this.#requireGM();
    const overrides = this.all();
    delete overrides[sourceId];
    await game.settings.set(MODULE_ID, SETTINGS.imageOverrides, overrides);
    if (syncImported && fallbackImage) await this.#syncImported(sourceId, fallbackImage);
    Hooks.callAll(HOOKS.imageOverrideChanged, { sourceId, img: fallbackImage, reset: true });
    return fallbackImage;
  }

  async choose(sourceId, current, options = {}) {
    this.#requireGM();
    const FilePicker = foundry.applications.apps.FilePicker.implementation;
    return new Promise(resolve => {
      const picker = new FilePicker({
        type: "image",
        current: current ?? "",
        callback: async path => {
          try {
            const value = await this.set(sourceId, path, options);
            resolve(value);
          } catch (error) {
            console.error(`[${MODULE_ID}] Failed to set image override.`, error);
            ui.notifications.error(error.message);
            resolve(null);
          }
        }
      });
      picker.render(true);
    });
  }


  async syncAllImported(overrides = this.all()) {
    this.#requireGM();
    const pack = game.packs.get(PACKS.foods.collection);
    if (!pack) return 0;
    const index = await pack.getIndex({ fields: [`flags.${FLAG_SCOPE}.sourceId`, "img"] });
    const updates = [];
    for (const row of index) {
      const sourceId = foundry.utils.getProperty(row, `flags.${FLAG_SCOPE}.sourceId`);
      const img = overrides[sourceId];
      if (sourceId && img && row.img !== img) updates.push({ _id: row._id, img });
    }
    if (!updates.length) return 0;
    const wasLocked = pack.locked;
    if (wasLocked) await pack.configure({ locked: false });
    try {
      const result = await pack.documentClass.updateDocuments(updates, { pack: pack.collection });
      return result.length;
    } finally {
      if (wasLocked) await pack.configure({ locked: true });
    }
  }

  async validateOverrides() {
    const findings = [];
    for (const [sourceId, img] of Object.entries(this.all())) {
      if (!sourceId || !img) findings.push({ severity: "error", code: "IMAGE_OVERRIDE_INVALID", sourceId, img, message: game.i18n.format(`${MODULE_ID}.Diagnostics.ImageInvalid`, { sourceId }) });
      else if (!/\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/iu.test(img)) findings.push({ severity: "warning", code: "IMAGE_OVERRIDE_EXTENSION", sourceId, img, message: game.i18n.format(`${MODULE_ID}.Diagnostics.ImageExtension`, { sourceId }) });
    }
    return findings;
  }

  async #syncImported(sourceId, img) {
    const pack = game.packs.get(PACKS.foods.collection);
    if (!pack) return false;
    const index = await pack.getIndex({ fields: [`flags.${FLAG_SCOPE}.sourceId`] });
    const row = index.find(entry => foundry.utils.getProperty(entry, `flags.${FLAG_SCOPE}.sourceId`) === sourceId);
    if (!row) return false;
    const document = await pack.getDocument(row._id);
    if (!document || document.img === img) return false;
    await document.update({ img });
    return true;
  }

  #requireGM() {
    if (!game.user?.isGM) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.GMOnly`));
  }
}

export const imageOverrideService = new ImageOverrideService();
