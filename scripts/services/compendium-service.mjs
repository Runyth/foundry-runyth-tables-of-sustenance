// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { FLAG_SCOPE, MODULE_ID, PACKS, SETTINGS } from "../constants.mjs";
import { contentLibrary } from "./content-library.mjs";
import { systemAdapterService } from "./system-adapter-service.mjs";
import { deepClone, fastHash, getModuleFlags, localizeSource, stableSnapshot } from "../lib/utils.mjs";

const BATCH_SIZE = 50;

class CompendiumService {
  async ensurePack(kind) {
    const metadata = PACKS[kind];
    if (!metadata) throw new Error(`Unknown pack kind: ${kind}`);
    let pack = game.packs.get(metadata.collection);
    if (!pack) {
      pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
        name: metadata.name,
        label: metadata.label,
        type: metadata.type,
        package: "world"
      });
    }
    return pack;
  }

  async preview(options = {}) {
    const kinds = options.kinds?.length ? options.kinds : ["foods", "recipes", "tables"];
    const result = { create: 0, update: 0, preserve: 0, unchanged: 0, remove: 0, details: [] };
    for (const kind of kinds) {
      const raw = this.#selectSources(kind, await this.#loadSources(kind), options);
      const sources = [];
      for (const source of raw) sources.push(await this.#prepareImportedSource(kind, source, options));
      const pack = game.packs.get(PACKS[kind].collection);
      const existing = pack ? await pack.getDocuments() : [];
      const index = new Map(existing.map(document => [getModuleFlags(document).sourceId, document]));
      for (const source of sources) {
        const sourceId = getModuleFlags(source).sourceId;
        const document = index.get(sourceId);
        const action = this.#classifyPrepared(source, document, options);
        result[action] += 1;
        result.details.push({ kind, sourceId, name: source.name, action });
      }
    }
    return result;
  }

  async importContent(options = {}, onProgress = () => {}) {
    if (!game.user.isGM) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.GMOnly`));
    const kinds = options.kinds?.length ? options.kinds : ["foods", "recipes", "tables"];
    const report = { created: 0, updated: 0, preserved: 0, unchanged: 0, failed: 0, cancelled: false, errors: [] };
    const totalSources = (await Promise.all(kinds.map(async kind => this.#selectSources(kind, await this.#loadSources(kind), options).length))).reduce((sum, count) => sum + count, 0);
    let completed = 0;

    for (const kind of kinds) {
      if (options.signal?.aborted) { report.cancelled = true; break; }
      const pack = await this.ensurePack(kind);
      const wasLocked = pack.locked;
      if (wasLocked) await pack.configure({ locked: false });
      try {
        const rawSources = this.#selectSources(kind, await this.#loadSources(kind), options);
        const sources = [];
        for (const source of rawSources) sources.push(await this.#prepareImportedSource(kind, source, options));
        const existing = await pack.getDocuments();
        const index = new Map(existing.map(document => [getModuleFlags(document).sourceId, document]));
        const creates = [];
        const updates = [];

        for (const source of sources) {
          const sourceId = getModuleFlags(source).sourceId;
          const document = index.get(sourceId);
          const action = this.#classifyPrepared(source, document, options);
          if (action === "create") creates.push(source);
          else if (action === "update") updates.push({ ...source, _id: document.id });
          else if (action === "preserve") report.preserved += 1;
          else report.unchanged += 1;
          completed += 1;
          onProgress({ completed, total: totalSources, kind, action, name: source.name });
        }

        for (const batch of chunk(creates, BATCH_SIZE)) {
          if (options.signal?.aborted) { report.cancelled = true; break; }
          const created = await pack.documentClass.createDocuments(batch, { pack: pack.collection, keepId: true });
          report.created += created.length;
        }
        for (const batch of chunk(updates, BATCH_SIZE)) {
          if (options.signal?.aborted) { report.cancelled = true; break; }
          const updated = await pack.documentClass.updateDocuments(batch, { pack: pack.collection, diff: false, recursive: false });
          report.updated += updated.length;
        }
      } catch (error) {
        report.failed += 1;
        report.errors.push({ kind, message: error.message, stack: error.stack });
        console.error(`${MODULE_ID} | Import failure for ${kind}`, error);
      } finally {
        if (wasLocked) await pack.configure({ locked: true });
      }
    }
    return report;
  }

  async restore(sourceIds, options = {}) { return this.importContent({ ...options, sourceIds, force: true, preserveEdited: false }); }

  async selectedSourceIds(options = {}) {
    const kinds = options.kinds?.length ? options.kinds : ["foods", "recipes", "tables"];
    const selected = [];
    const selectedFoods = this.#selectSources("foods", await this.#loadSources("foods"), options);
    const selectedFoodIds = new Set(selectedFoods.map(source => getModuleFlags(source).sourceId));
    if (kinds.includes("foods")) selected.push(...selectedFoodIds);
    if (kinds.includes("recipes")) {
      const recipes = await contentLibrary.load("recipes");
      const hasFoodFilters = Boolean(options.tiers?.length || options.regions?.length || options.cultures?.length || options.categories?.length);
      selected.push(...recipes.filter(recipe => !hasFoodFilters || selectedFoodIds.has(getModuleFlags(recipe).foodSourceId)).map(recipe => getModuleFlags(recipe).sourceId));
    }
    if (kinds.includes("tables")) selected.push(...(await contentLibrary.load("tables")).map(table => getModuleFlags(table).sourceId));
    return selected;
  }

  async removeContent({ kinds = ["foods", "recipes", "tables"], sourceIds = null, signal = null } = {}, onProgress = () => {}) {
    if (!game.user.isGM) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.GMOnly`));
    const report = { removed: 0, failed: 0, cancelled: false, errors: [] };
    for (const kind of kinds) {
      if (signal?.aborted) { report.cancelled = true; break; }
      const pack = game.packs.get(PACKS[kind].collection);
      if (!pack) continue;
      const wasLocked = pack.locked;
      if (wasLocked) await pack.configure({ locked: false });
      try {
        const docs = await pack.getDocuments();
        const expectedKind = kind === "foods" ? "food" : kind === "recipes" ? "recipe" : "table";
        const ids = docs.filter(document => {
          const flags = getModuleFlags(document);
          return flags.kind === expectedKind && Boolean(flags.sourceId) && Boolean(flags.import?.importedAt || flags.import?.packagedHash || flags.import?.managed);
        }).filter(document => !sourceIds || sourceIds.includes(getModuleFlags(document).sourceId)).map(document => document.id);
        for (const batch of chunk(ids, BATCH_SIZE)) {
          if (signal?.aborted) { report.cancelled = true; break; }
          const removed = await pack.documentClass.deleteDocuments(batch, { pack: pack.collection });
          report.removed += removed.length;
          onProgress({ removed: report.removed, kind });
        }
      } catch (error) {
        report.failed += 1;
        report.errors.push({ kind, message: error.message });
        console.error(`${MODULE_ID} | Removal failure for ${kind}`, error);
      } finally {
        if (wasLocked) await pack.configure({ locked: true });
      }
    }
    return report;
  }

  async importedDocument(sourceId) {
    for (const metadata of Object.values(PACKS)) {
      const pack = game.packs.get(metadata.collection);
      if (!pack) continue;
      const index = await pack.getIndex({ fields: [`flags.${FLAG_SCOPE}.sourceId`] });
      const entry = index.find(row => foundry.utils.getProperty(row, `flags.${FLAG_SCOPE}.sourceId`) === sourceId);
      if (entry) return pack.getDocument(entry._id);
    }
    return null;
  }

  async #loadSources(kind) {
    if (kind === "foods") return contentLibrary.foods({ localized: false, includeExtensions: true, applyImageOverrides: true });
    return contentLibrary.load(kind);
  }

  async #prepareImportedSource(kind, rawSource, options) {
    const localized = options.localized === false ? deepClone(rawSource) : localizeSource(rawSource);
    const source = kind === "foods" ? await systemAdapterService.materializeFood(localized, { purpose: "compendium-import" }) : localized;
    const snapshot = stableSnapshot(source);
    const hash = fastHash(snapshot);
    foundry.utils.setProperty(source, `flags.${FLAG_SCOPE}.import`, {
      packagedHash: hash,
      importedAt: new Date().toISOString(),
      importedBy: game.user.id,
      sourceVersion: getModuleFlags(source).sourceVersion,
      managed: true,
      language: options.localized === false ? "source" : game.i18n.lang,
      materializedForSystem: kind === "foods" ? game.system.id : null,
      materializedByAdapter: kind === "foods" ? systemAdapterService.current()?.id ?? null : null
    });
    return source;
  }

  #classifyPrepared(source, document, options) {
    if (!document) return "create";
    const desiredHash = foundry.utils.getProperty(source, `flags.${FLAG_SCOPE}.import.packagedHash`);
    const importState = getModuleFlags(document).import ?? {};
    const currentHash = fastHash(stableSnapshot(document.toObject()));
    const userEdited = importState.packagedHash && currentHash !== importState.packagedHash;
    const preserveEdited = options.preserveEdited ?? game.settings.get(MODULE_ID, SETTINGS.preserveEditedImports);
    if (userEdited && preserveEdited && !options.force) return "preserve";
    if (currentHash === desiredHash && !options.force) return "unchanged";
    return "update";
  }

  #selectSources(kind, sources, options) {
    return sources.filter(source => {
      const flags = getModuleFlags(source);
      const meta = flags.meta ?? {};
      if (options.sourceIds?.length && !options.sourceIds.includes(flags.sourceId)) return false;
      if (kind === "foods") {
        if (options.tiers?.length && !options.tiers.includes(meta.tier)) return false;
        if (options.regions?.length && !options.regions.includes(meta.originRegion)) return false;
        if (options.cultures?.length && !options.cultures.includes(meta.culture)) return false;
        if (options.categories?.length && !(meta.mealType ?? []).some(value => options.categories.includes(value))) return false;
      }
      return true;
    });
  }
}

function chunk(values, size) {
  const batches = [];
  for (let index = 0; index < values.length; index += size) batches.push(values.slice(index, index + size));
  return batches;
}

export const compendiumService = new CompendiumService();
