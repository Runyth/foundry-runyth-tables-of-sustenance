// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
export const MODULE_ID = "runyth-tables-of-sustenance";
export const MODULE_TITLE = "Runyth Tables of Sustenance";
export const MODULE_VERSION = "1.1.1";
export const FLAG_SCOPE = MODULE_ID;

export const DATA_PATHS = Object.freeze({
  foods: `modules/${MODULE_ID}/data/foods.json`,
  recipes: `modules/${MODULE_ID}/data/recipes.json`,
  tables: `modules/${MODULE_ID}/data/tables.json`,
  index: `modules/${MODULE_ID}/data/content-index.json`
});

export const PACKS = Object.freeze({
  foods: Object.freeze({ collection: "world.rts-foods", name: "rts-foods", label: "Runyth: Foods", type: "Item" }),
  recipes: Object.freeze({ collection: "world.rts-recipes", name: "rts-recipes", label: "Runyth: Recipes", type: "JournalEntry" }),
  tables: Object.freeze({ collection: "world.rts-food-tables", name: "rts-food-tables", label: "Runyth: Food Tables", type: "RollTable" })
});

export const TIERS = Object.freeze(["1", "2", "3", "4", "S"]);
export const TIER_ORDER = Object.freeze({ "1": 1, "2": 2, "3": 3, "4": 4, "S": 5 });
export const APP_IDS = Object.freeze({
  dashboard: `${MODULE_ID}-dashboard`,
  browser: `${MODULE_ID}-browser`,
  generator: `${MODULE_ID}-generator`,
  manager: `${MODULE_ID}-manager`,
  composer: `${MODULE_ID}-composer`,
  transfer: `${MODULE_ID}-import-export`,
  diagnostics: `${MODULE_ID}-diagnostics`
});

export const HOOKS = Object.freeze({
  consumed: `${MODULE_ID}.consumed`,
  beforeConsume: `${MODULE_ID}.beforeConsume`,
  cooldownChanged: `${MODULE_ID}.cooldownChanged`,
  permanentBenefitChanged: `${MODULE_ID}.permanentBenefitChanged`,
  menuGenerated: `${MODULE_ID}.menuGenerated`,
  registryChanged: `${MODULE_ID}.registryChanged`,
  imageOverrideChanged: `${MODULE_ID}.imageOverrideChanged`,
  extensionChanged: `${MODULE_ID}.extensionChanged`,
  systemAdapterChanged: `${MODULE_ID}.systemAdapterChanged`,
  apiReady: `${MODULE_ID}.apiReady`
});

export const SETTINGS = Object.freeze({
  mechanicsEnabled: "mechanicsEnabled",
  hungerThirstCompatibility: "hungerThirstCompatibility",
  tier2Stacking: "tier2Stacking",
  tier3Stacking: "tier3Stacking",
  tier4CooldownRule: "tier4CooldownRule",
  tierSPermanentEffects: "tierSPermanentEffects",
  playerSelfConsumption: "playerSelfConsumption",
  playerServingOthers: "playerServingOthers",
  legendaryConfirmation: "legendaryConfirmation",
  automaticServingReduction: "automaticServingReduction",
  deleteEmptyItems: "deleteEmptyItems",
  chatDetail: "chatDetail",
  hideImperialClassifications: "hideImperialClassifications",
  legendaryGeneration: "legendaryGeneration",
  recipesEnabled: "recipesEnabled",
  spoilageEnabled: "spoilageEnabled",
  dietaryRestrictions: "dietaryRestrictions",
  priceScale: "priceScale",
  weightUnits: "weightUnits",
  preserveEditedImports: "preserveEditedImports",
  menuDefaults: "menuDefaults",
  windowState: "windowState",
  imageOverrides: "imageOverrides",
  diagnosticsHistory: "diagnosticsHistory"
});
