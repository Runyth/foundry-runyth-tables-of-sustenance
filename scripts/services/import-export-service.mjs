// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { FLAG_SCOPE, MODULE_ID, PACKS, SETTINGS } from "../constants.mjs";
import { compendiumService } from "./compendium-service.mjs";
import { imageOverrideService } from "./image-override-service.mjs";

const SCHEMA_VERSION = 2;
const SUPPORTED_SCHEMA_VERSIONS = Object.freeze(new Set([1, 2]));
const EXPORTED_SETTINGS = Object.freeze([
  SETTINGS.mechanicsEnabled,
  SETTINGS.hungerThirstCompatibility,
  SETTINGS.tier2Stacking,
  SETTINGS.tier3Stacking,
  SETTINGS.tier4CooldownRule,
  SETTINGS.tierSPermanentEffects,
  SETTINGS.playerSelfConsumption,
  SETTINGS.playerServingOthers,
  SETTINGS.legendaryConfirmation,
  SETTINGS.automaticServingReduction,
  SETTINGS.deleteEmptyItems,
  SETTINGS.chatDetail,
  SETTINGS.hideImperialClassifications,
  SETTINGS.legendaryGeneration,
  SETTINGS.recipesEnabled,
  SETTINGS.spoilageEnabled,
  SETTINGS.dietaryRestrictions,
  SETTINGS.priceScale,
  SETTINGS.weightUnits,
  SETTINGS.preserveEditedImports,
  SETTINGS.menuDefaults
]);

class ImportExportService {
  async exportData({ includeSettings = true, includeImageOverrides = true, includeManagedContent = true } = {}) {
    this.#requireGM();
    const payload = {
      schema: `${MODULE_ID}.transfer`,
      schemaVersion: SCHEMA_VERSION,
      moduleId: MODULE_ID,
      moduleVersion: game.modules.get(MODULE_ID)?.version ?? null,
      foundryVersion: game.version,
      system: { id: game.system.id, version: game.system.version },
      worldId: game.world?.id ?? null,
      exportedAt: new Date().toISOString()
    };
    if (includeSettings) {
      payload.settings = Object.fromEntries(EXPORTED_SETTINGS.map(key => [key, game.settings.get(MODULE_ID, key)]));
    }
    if (includeImageOverrides) payload.imageOverrides = imageOverrideService.all();
    if (includeManagedContent) payload.managedContent = await this.#exportManagedContent();
    return payload;
  }

  preview(payload) {
    this.#validate(payload);
    return {
      moduleVersion: payload.moduleVersion ?? "?",
      exportedAt: payload.exportedAt ?? "?",
      sourceSystemId: payload.system?.id ?? null,
      currentSystemId: game.system.id,
      foodSystemCompatible: !payload.managedContent?.foods?.length || payload.system?.id === game.system.id,
      settings: Object.keys(payload.settings ?? {}).filter(key => EXPORTED_SETTINGS.includes(key)).length,
      imageOverrides: Object.keys(payload.imageOverrides ?? {}).length,
      foods: payload.managedContent?.foods?.length ?? 0,
      recipes: payload.managedContent?.recipes?.length ?? 0,
      tables: payload.managedContent?.tables?.length ?? 0
    };
  }

  async importData(payload, { importSettings = true, importImageOverrides = true, importManagedContent = true, overwriteManagedContent = false } = {}) {
    this.#requireGM();
    this.#validate(payload);
    const report = { settings: 0, imageOverrides: 0, created: 0, updated: 0, preserved: 0, errors: [] };
    if (importSettings && payload.settings) {
      for (const [key, value] of Object.entries(payload.settings)) {
        if (!EXPORTED_SETTINGS.includes(key)) continue;
        try {
          await game.settings.set(MODULE_ID, key, value);
          report.settings += 1;
        } catch (error) {
          report.errors.push({ section: "settings", key, message: error.message });
        }
      }
    }
    if (importImageOverrides && payload.imageOverrides) {
      const current = imageOverrideService.all();
      const merged = { ...current, ...payload.imageOverrides };
      await game.settings.set(MODULE_ID, SETTINGS.imageOverrides, merged);
      report.imageOverrides = Object.keys(payload.imageOverrides).length;
      await imageOverrideService.syncAllImported(merged);
    }
    if (importManagedContent && payload.managedContent) {
      for (const kind of ["foods", "recipes", "tables"]) {
        const sources = Array.isArray(payload.managedContent[kind]) ? payload.managedContent[kind] : [];
        if (!sources.length) continue;
        if (kind === "foods" && payload.system?.id !== game.system.id) {
          report.errors.push({
            section: "foods",
            message: `Managed food Items were materialized for system ${payload.system?.id ?? "unknown"}; current system is ${game.system.id}. Import the canonical foods through the current system adapter instead.`
          });
          continue;
        }
        const pack = await compendiumService.ensurePack(kind);
        const wasLocked = pack.locked;
        if (wasLocked) await pack.configure({ locked: false });
        try {
          const existing = await pack.getDocuments();
          const bySourceId = new Map(existing.map(document => [foundry.utils.getProperty(document, `flags.${FLAG_SCOPE}.sourceId`), document]));
          const creates = [];
          const updates = [];
          for (const source of sources) {
            const sourceId = foundry.utils.getProperty(source, `flags.${FLAG_SCOPE}.sourceId`);
            const sourceKind = foundry.utils.getProperty(source, `flags.${FLAG_SCOPE}.kind`);
            const importState = foundry.utils.getProperty(source, `flags.${FLAG_SCOPE}.import`) ?? {};
            const expectedKind = kind === "foods" ? "food" : kind === "recipes" ? "recipe" : "table";
            if (!sourceId || sourceKind !== expectedKind || !(importState.importedAt || importState.packagedHash || importState.managed)) {
              report.errors.push({ section: kind, sourceId: sourceId ?? null, message: "Rejected content without exact module-managed provenance." });
              continue;
            }
            const document = bySourceId.get(sourceId);
            if (!document) creates.push(stripId(source));
            else if (overwriteManagedContent) updates.push({ ...stripId(source), _id: document.id });
            else report.preserved += 1;
          }
          if (creates.length) {
            const created = await pack.documentClass.createDocuments(creates, { pack: pack.collection, keepId: false });
            report.created += created.length;
          }
          if (updates.length) {
            const updated = await pack.documentClass.updateDocuments(updates, { pack: pack.collection, diff: false, recursive: false });
            report.updated += updated.length;
          }
        } catch (error) {
          report.errors.push({ section: kind, message: error.message });
        } finally {
          if (wasLocked) await pack.configure({ locked: true });
        }
      }
    }
    return report;
  }

  download(payload, filename = `${MODULE_ID}-export.json`) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async #exportManagedContent() {
    const result = { foods: [], recipes: [], tables: [] };
    for (const kind of Object.keys(result)) {
      const pack = game.packs.get(PACKS[kind].collection);
      if (!pack) continue;
      const expectedKind = kind === "foods" ? "food" : kind === "recipes" ? "recipe" : "table";
      const documents = await pack.getDocuments();
      result[kind] = documents
        .filter(document => {
          const flags = foundry.utils.getProperty(document, `flags.${FLAG_SCOPE}`) ?? {};
          return flags.kind === expectedKind && Boolean(flags.sourceId) && Boolean(flags.import?.importedAt || flags.import?.packagedHash || flags.import?.managed);
        })
        .map(document => document.toObject());
    }
    return result;
  }

  #validate(payload) {
    if (!payload || typeof payload !== "object") throw new TypeError(game.i18n.localize(`${MODULE_ID}.Transfer.InvalidFile`));
    if (payload.schema !== `${MODULE_ID}.transfer` || payload.moduleId !== MODULE_ID) throw new TypeError(game.i18n.localize(`${MODULE_ID}.Transfer.InvalidFile`));
    if (!SUPPORTED_SCHEMA_VERSIONS.has(Number(payload.schemaVersion))) throw new TypeError(game.i18n.localize(`${MODULE_ID}.Transfer.UnsupportedSchema`));
  }

  #requireGM() {
    if (!game.user?.isGM) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.GMOnly`));
  }
}

function stripId(source) {
  const clone = foundry.utils.deepClone(source);
  delete clone._id;
  delete clone._stats;
  delete clone.folder;
  delete clone.sort;
  return clone;
}

export const importExportService = new ImportExportService();
