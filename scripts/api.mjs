// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { HOOKS, MODULE_ID } from "./constants.mjs";
import { BenefitManagerApp } from "./apps/benefit-manager-app.mjs";
import { ContentManagerApp } from "./apps/content-manager-app.mjs";
import { DashboardApp } from "./apps/dashboard-app.mjs";
import { DiagnosticsApp } from "./apps/diagnostics-app.mjs";
import { FoodBrowserApp } from "./apps/food-browser-app.mjs";
import { ImportExportApp } from "./apps/import-export-app.mjs";
import { MealComposerApp } from "./apps/meal-composer-app.mjs";
import { MenuGeneratorApp } from "./apps/menu-generator-app.mjs";
import { contentLibrary } from "./services/content-library.mjs";
import { compendiumService } from "./services/compendium-service.mjs";
import { consumptionService } from "./services/consumption-service.mjs";
import { diagnosticsService } from "./services/diagnostics-service.mjs";
import { effectService } from "./services/effect-service.mjs";
import { imageOverrideService } from "./services/image-override-service.mjs";
import { importExportService } from "./services/import-export-service.mjs";
import { menuService } from "./services/menu-service.mjs";
import { recipeService } from "./services/recipe-service.mjs";
import { registry } from "./services/registry.mjs";
import { socketService } from "./services/socket-service.mjs";
import { systemAdapterService } from "./services/system-adapter-service.mjs";

const API_VERSION = "1.2.1";
const instances = new Map();

function singleton(key, Type) {
  if (!instances.has(key) || instances.get(key).rendered === false) instances.set(key, new Type());
  return instances.get(key);
}

const extensions = Object.freeze({
  version: API_VERSION,
  registerProvider: definition => registry.registerProvider(definition),
  unregisterProvider: (providerId, options) => registry.unregisterProvider(providerId, options),
  getProviders: () => registry.providers(),
  registerFood: (providerId, source) => registry.registerFood(providerId, source),
  registerFoods: (providerId, sources) => registry.registerFoods(providerId, sources),
  unregisterFood: sourceId => registry.unregisterFood(sourceId),
  getFoods: options => registry.foods(options),
  contract: () => ({
    apiVersion: API_VERSION,
    requiredFoodFlags: [`flags.${MODULE_ID}.sourceId`, `flags.${MODULE_ID}.meta.tier`],
    hooks: { ...HOOKS },
    duplicateSourceIdPolicy: "reject",
    registrationOrder: ["registerProvider", "registerFood/registerFoods"]
  })
});

export const api = Object.freeze({
  version: API_VERSION,
  hooks: Object.freeze({ ...HOOKS }),
  whenReady: async () => {
    if (game.ready) return api;
    await new Promise(resolve => Hooks.once("ready", resolve));
    return api;
  },
  extensions,
  registerProvider: extensions.registerProvider,
  unregisterProvider: extensions.unregisterProvider,
  registerFood: extensions.registerFood,
  registerFoods: extensions.registerFoods,
  unregisterFood: extensions.unregisterFood,
  getRegisteredProviders: extensions.getProviders,
  getRegisteredFoods: extensions.getFoods,
  registerFoodTier: definition => registry.register("tiers", definition),
  registerRegion: definition => registry.register("regions", definition),
  registerCulture: definition => registry.register("cultures", definition),
  registerVenue: definition => registry.register("venues", definition),
  registerConsumerCategory: definition => registry.register("consumers", definition),
  registerDietaryTag: definition => registry.register("dietaryTags", definition),
  registerRecipe: definition => registry.register("recipes", definition),
  registerCustomEffectHandler: (type, handler) => systemAdapterService.registerIntentHandler(type, handler),
  unregisterCustomEffectHandler: type => systemAdapterService.unregisterIntentHandler(type),
  registerSystemAdapter: (systemId, adapter) => registry.registerSystemAdapter(systemId, adapter),
  unregisterSystemAdapter: (systemId, adapterId) => registry.unregisterSystemAdapter(systemId, adapterId),
  getSystemAdapter: systemId => registry.systemAdapter(systemId),
  getSystemAdapterStatus: () => systemAdapterService.status(),
  materializeFood: (food, options) => systemAdapterService.materializeFood(food, options),
  queryFoods: query => contentLibrary.queryFoods(query),
  sourceById: (sourceId, options) => contentLibrary.sourceById(sourceId, options),
  generateRegionalMenu: options => menuService.generate(options),
  createMenuJournal: (menu, options) => menuService.createJournal(menu, options),
  consume: (food, actor, options) => consumptionService.consume(food, actor, options),
  serve: async (food, actors, options = {}) => {
    consumptionService.assertConsumableSource(food);
    const local = actors.filter(actor => game.user.isGM || actor.isOwner);
    const remote = actors.filter(actor => !game.user.isGM && !actor.isOwner);
    const localResult = local.length ? await consumptionService.serve(food, local, options) : { results: [], successful: 0 };
    const remoteResults = [];
    for (const actor of remote) {
      remoteResults.push(await socketService.remoteConsume({
        actorUuid: actor.uuid,
        itemUuid: food.uuid ?? null,
        sourceId: foundry.utils.getProperty(food, `flags.${MODULE_ID}.sourceId`) ?? null,
        options
      }));
    }
    return { ...localResult, remoteResults, successful: localResult.successful + remoteResults.length };
  },
  consumeSelected: (food, options) => consumptionService.consumeSelected(food, options),
  inspectCooldown: (actor, food) => effectService.cooldownStatus(actor, food),
  clearCooldown: (actor, effectId) => effectService.clearCooldown(actor, effectId),
  inspectPermanentBenefits: actor => effectService.permanentBenefits(actor),
  removePermanentBenefit: (actor, effectId) => effectService.removePermanentBenefit(actor, effectId),
  getDietaryRestrictions: actor => actor.getFlag(MODULE_ID, "dietaryRestrictions") ?? [],
  setDietaryRestrictions: (actor, restrictions) => actor.setFlag(MODULE_ID, "dietaryRestrictions", [...new Set(restrictions)]),
  importContent: (options, progress) => compendiumService.importContent(options, progress),
  previewImport: options => compendiumService.preview(options),
  removeImportedContent: (options, progress) => compendiumService.removeContent(options, progress),
  exportData: options => importExportService.exportData(options),
  previewDataImport: payload => importExportService.preview(payload),
  importData: (payload, options) => importExportService.importData(payload, options),
  runDiagnostics: options => diagnosticsService.run(options),
  getImageOverride: sourceId => imageOverrideService.get(sourceId),
  setImageOverride: (sourceId, path, options) => imageOverrideService.set(sourceId, path, options),
  resetImageOverride: async (sourceId, options = {}) => {
    const source = await contentLibrary.sourceById(sourceId, { localized: false, applyImageOverrides: false });
    return imageOverrideService.reset(sourceId, source?.img ?? null, options);
  },
  recipes: recipeService,
  apps: Object.freeze({
    dashboard: () => singleton("dashboard", DashboardApp),
    browser: () => singleton("browser", FoodBrowserApp),
    generator: () => singleton("generator", MenuGeneratorApp),
    manager: () => singleton("manager", ContentManagerApp),
    composer: () => singleton("composer", MealComposerApp),
    importExport: () => singleton("importExport", ImportExportApp),
    diagnostics: () => singleton("diagnostics", DiagnosticsApp),
    benefits: actor => {
      const key = `benefits:${actor.uuid}`;
      if (!instances.has(key) || instances.get(key).rendered === false) instances.set(key, new BenefitManagerApp(actor));
      return instances.get(key);
    }
  }),
  socket: socketService
});

export function exposeApi() {
  game[MODULE_ID] = api;
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = api;
}
