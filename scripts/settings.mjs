// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID, SETTINGS } from "./constants.mjs";
import { SETTING_STOCK_LOOK, syncOpenWindows } from "./ui-look.mjs";

const booleanSettings = [
  [SETTINGS.mechanicsEnabled, true],
  [SETTINGS.hungerThirstCompatibility, false],
  [SETTINGS.tierSPermanentEffects, true],
  [SETTINGS.playerSelfConsumption, true],
  [SETTINGS.playerServingOthers, false],
  [SETTINGS.legendaryConfirmation, true],
  [SETTINGS.automaticServingReduction, true],
  [SETTINGS.deleteEmptyItems, false],
  [SETTINGS.hideImperialClassifications, false],
  [SETTINGS.legendaryGeneration, false],
  [SETTINGS.recipesEnabled, true],
  [SETTINGS.spoilageEnabled, false],
  [SETTINGS.dietaryRestrictions, false],
  [SETTINGS.preserveEditedImports, true]
];

export function registerSettings({ DashboardApp, ContentManagerApp, ImportExportApp, DiagnosticsApp, WindowGeometryApp } = {}) {
  for (const [key, defaultValue] of booleanSettings) {
    game.settings.register(MODULE_ID, key, {
      name: `${MODULE_ID}.Settings.${key}.Name`,
      hint: `${MODULE_ID}.Settings.${key}.Hint`,
      scope: "world",
      config: true,
      type: Boolean,
      default: defaultValue
    });
  }

  registerChoice(SETTINGS.tier2Stacking, "strongest", {
    strongest: `${MODULE_ID}.Settings.Stacking.Strongest`,
    one: `${MODULE_ID}.Settings.Stacking.One`,
    allow: `${MODULE_ID}.Settings.Stacking.Allow`
  });
  registerChoice(SETTINGS.tier3Stacking, "one", {
    strongest: `${MODULE_ID}.Settings.Stacking.Strongest`,
    one: `${MODULE_ID}.Settings.Stacking.One`,
    allow: `${MODULE_ID}.Settings.Stacking.Allow`
  });
  registerChoice(SETTINGS.tier4CooldownRule, "strict", {
    strict: `${MODULE_ID}.Settings.Cooldown.Strict`,
    sameDish: `${MODULE_ID}.Settings.Cooldown.SameDish`,
    advisory: `${MODULE_ID}.Settings.Cooldown.Advisory`
  });
  registerChoice(SETTINGS.chatDetail, "standard", {
    terse: `${MODULE_ID}.Settings.Chat.Terse`,
    standard: `${MODULE_ID}.Settings.Chat.Standard`,
    detailed: `${MODULE_ID}.Settings.Chat.Detailed`
  });
  registerChoice(SETTINGS.weightUnits, "imperial", {
    imperial: `${MODULE_ID}.Settings.Weight.Imperial`,
    metric: `${MODULE_ID}.Settings.Weight.Metric`
  });

  game.settings.register(MODULE_ID, SETTINGS.priceScale, {
    name: `${MODULE_ID}.Settings.${SETTINGS.priceScale}.Name`,
    hint: `${MODULE_ID}.Settings.${SETTINGS.priceScale}.Hint`,
    scope: "world",
    config: true,
    type: Number,
    default: 1,
    range: { min: 0.1, max: 10, step: 0.1 }
  });

  game.settings.register(MODULE_ID, SETTINGS.menuDefaults, {
    scope: "world",
    config: false,
    type: Object,
    default: { count: 8, maxTier: "2", includeDrinks: true, includeIllicit: false, priceMultiplier: 1 }
  });
  game.settings.register(MODULE_ID, SETTING_STOCK_LOOK, {
    name: `${MODULE_ID}.Settings.StockFoundryLook.Name`,
    hint: `${MODULE_ID}.Settings.StockFoundryLook.Hint`,
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, SETTINGS.windowState, { scope: "client", config: false, type: Object, default: {} });
  game.settings.register(MODULE_ID, SETTINGS.imageOverrides, { scope: "world", config: false, type: Object, default: {} });
  game.settings.register(MODULE_ID, SETTINGS.diagnosticsHistory, { scope: "world", config: false, type: Array, default: [] });

  Hooks.on("closeSettingsConfig", () => syncOpenWindows());

  registerMenu("dashboard", DashboardApp, "fa-solid fa-utensils", false, "Dashboard");
  registerMenu("contentManager", ContentManagerApp, "fa-solid fa-box-archive", true, "ContentManager");
  registerMenu("importExport", ImportExportApp, "fa-solid fa-right-left", true, "ImportExport");
  registerMenu("diagnostics", DiagnosticsApp, "fa-solid fa-stethoscope", true, "Diagnostics");
  registerMenu("windowGeometry", WindowGeometryApp, "fa-solid fa-up-right-and-down-left-from-center", false, "WindowGeometry");
}

function registerMenu(key, Type, icon, restricted, localizeKey) {
  if (!Type) return;
  game.settings.registerMenu(MODULE_ID, key, {
    name: `${MODULE_ID}.Settings.${localizeKey}.Name`,
    label: `${MODULE_ID}.Settings.${localizeKey}.Label`,
    hint: `${MODULE_ID}.Settings.${localizeKey}.Hint`,
    icon,
    type: Type,
    restricted
  });
}

function registerChoice(key, defaultValue, choices) {
  game.settings.register(MODULE_ID, key, {
    name: `${MODULE_ID}.Settings.${key}.Name`,
    hint: `${MODULE_ID}.Settings.${key}.Hint`,
    scope: "world",
    config: true,
    type: String,
    default: defaultValue,
    choices
  });
}
