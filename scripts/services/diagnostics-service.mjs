// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { FLAG_SCOPE, MODULE_ID, PACKS, SETTINGS } from "../constants.mjs";
import { contentLibrary } from "./content-library.mjs";
import { imageOverrideService } from "./image-override-service.mjs";
import { registry } from "./registry.mjs";
import { systemAdapterService } from "./system-adapter-service.mjs";

class DiagnosticsService {
  async run({ persist = true } = {}) {
    const generatedAt = new Date().toISOString();
    const findings = [];
    const content = { foods: 0, recipes: 0, tables: 0, tierS: 0 };
    const imported = {};

    if (Number(String(game.version).split(".")[0]) !== 13) findings.push(finding("error", "FOUNDRY_VERSION", format("FoundryVersion", { version: game.version })));

    const adapterStatus = systemAdapterService.status();
    if (!adapterStatus.available) findings.push(finding("warning", "SYSTEM_ADAPTER_MISSING", format("SystemAdapter", { system: game.system.id })));

    try {
      const foods = await contentLibrary.foods({ localized: false });
      const recipes = await contentLibrary.recipes();
      const tables = await contentLibrary.tables();
      content.foods = foods.length;
      content.recipes = recipes.length;
      content.tables = tables.length;
      content.tierS = foods.filter(food => foundry.utils.getProperty(food, `flags.${FLAG_SCOPE}.meta.tier`) === "S").length;
      if (foods.length < 335) findings.push(finding("error", "FOOD_COUNT", format("FoodCount", { count: foods.length })));
      if (content.tierS < 10) findings.push(finding("warning", "LEGENDARY_COUNT", format("LegendaryCount", { count: content.tierS })));
    } catch (error) {
      findings.push(finding("error", "CONTENT_LOAD", format("ContentLoad", { message: error.message })));
    }

    for (const [kind, metadata] of Object.entries(PACKS)) {
      const pack = game.packs.get(metadata.collection);
      if (!pack) { imported[kind] = { present: false, count: 0, duplicates: 0 }; continue; }
      try {
        const index = await pack.getIndex({ fields: [`flags.${FLAG_SCOPE}.sourceId`, `flags.${FLAG_SCOPE}.kind`, `flags.${FLAG_SCOPE}.import.materializedForSystem`] });
        const ids = index.map(row => foundry.utils.getProperty(row, `flags.${FLAG_SCOPE}.sourceId`)).filter(Boolean);
        const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
        const systems = [...new Set(index.map(row => foundry.utils.getProperty(row, `flags.${FLAG_SCOPE}.import.materializedForSystem`)).filter(Boolean))];
        imported[kind] = { present: true, count: ids.length, duplicates: new Set(duplicates).size, locked: pack.locked, systems };
        if (duplicates.length) findings.push(finding("error", "DUPLICATE_SOURCE_ID", format("DuplicateSourceId", { kind }), { kind, sourceIds: [...new Set(duplicates)] }));
        if (kind === "foods" && systems.some(system => system !== game.system.id)) {
          findings.push(finding("warning", "FOOD_PACK_SYSTEM_MISMATCH", format("FoodPackSystemMismatch", { systems: systems.join(", "), system: game.system.id }), { systems }));
        }
      } catch (error) {
        findings.push(finding("error", "PACK_INDEX", format("PackIndex", { kind, message: error.message })));
      }
    }

    findings.push(...await imageOverrideService.validateOverrides());
    const adapterDiagnostics = await systemAdapterService.diagnostics().catch(error => ({ error: error.message }));
    if (adapterDiagnostics?.findings) findings.push(...adapterDiagnostics.findings);

    const providers = registry.providers().map(provider => {
      const module = game.modules.get(provider.moduleId);
      const active = provider.moduleId === MODULE_ID ? true : Boolean(module?.active);
      if (provider.moduleId !== MODULE_ID && !module) findings.push(finding("warning", "PROVIDER_MODULE_MISSING", format("ProviderMissing", { provider: provider.id, module: provider.moduleId }), { providerId: provider.id }));
      return { ...provider, active };
    });

    const report = {
      schema: `${MODULE_ID}.diagnostics.v2`,
      generatedAt,
      module: { id: MODULE_ID, version: game.modules.get(MODULE_ID)?.version ?? null },
      foundry: { version: game.version },
      system: { id: game.system.id, version: game.system.version },
      systemAdapter: adapterStatus,
      adapterDiagnostics,
      content,
      imported,
      extensions: { providers, foods: registry.foods().length, systemAdapters: registry.systemAdapters().map(adapter => ({ id: adapter.id, systemId: adapter.systemId, moduleId: adapter.moduleId, version: adapter.version })) },
      imageOverrides: Object.keys(imageOverrideService.all()).length,
      findings,
      summary: summarize(findings)
    };

    if (persist && game.user.isGM) {
      const history = [...(game.settings.get(MODULE_ID, SETTINGS.diagnosticsHistory) ?? [])];
      history.unshift({ generatedAt, summary: report.summary, content, imageOverrides: report.imageOverrides, systemAdapter: adapterStatus.adapter?.id ?? null });
      await game.settings.set(MODULE_ID, SETTINGS.diagnosticsHistory, history.slice(0, 5));
    }
    return report;
  }
}

function format(key, data = {}) { return game.i18n.format(`${MODULE_ID}.Diagnostics.${key}`, data); }
function finding(severity, code, message, data = {}) { return { severity, code, message, data }; }
function summarize(findings) {
  const summary = { errors: 0, warnings: 0, info: 0, ok: true };
  for (const item of findings) {
    if (item.severity === "error") summary.errors += 1;
    else if (item.severity === "warning") summary.warnings += 1;
    else summary.info += 1;
  }
  summary.ok = summary.errors === 0;
  return summary;
}

export const diagnosticsService = new DiagnosticsService();
