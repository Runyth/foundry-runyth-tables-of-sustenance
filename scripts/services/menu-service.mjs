// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { HOOKS, MODULE_ID, SETTINGS, TIER_ORDER } from "../constants.mjs";
import { contentLibrary } from "./content-library.mjs";
import { copperValue, deepClone, getFoodMeta, getModuleFlags } from "../lib/utils.mjs";

const TIER_WEIGHTS = Object.freeze({ "1": 100, "2": 24, "3": 6, "4": 1, "S": 0 });

class MenuService {
  async generate(options = {}) {
    const defaults = game.settings.get(MODULE_ID, SETTINGS.menuDefaults);
    const config = {
      region: "*",
      settlement: "*",
      venue: "*",
      quality: "ordinary",
      socialClass: "*",
      season: "*",
      prosperity: "ordinary",
      scarcity: "normal",
      militaryPresence: "normal",
      culturalInfluence: "*",
      count: defaults.count ?? 8,
      maxTier: defaults.maxTier ?? "2",
      includeDrinks: defaults.includeDrinks ?? true,
      includeIllicit: defaults.includeIllicit ?? false,
      includeLegendary: false,
      priceMultiplier: defaults.priceMultiplier ?? 1,
      ...options
    };

    if (config.includeLegendary && !game.settings.get(MODULE_ID, SETTINGS.legendaryGeneration)) {
      throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.LegendaryGenerationDisabled`));
    }

    const all = await contentLibrary.foods({ localized: true });
    const candidates = all.filter(food => this.#matches(food, config));
    const selected = weightedDistinct(candidates, Math.min(Number(config.count), candidates.length), food => this.#weight(food, config));
    const menu = selected.map(food => {
      const clone = deepClone(food);
      const meta = getFoodMeta(clone);
      meta.generatedPrice = {
        ...meta.purchasePrice,
        value: roundPrice(Number(meta.purchasePrice?.value ?? 0) * Number(config.priceMultiplier ?? 1))
      };
      return clone;
    });
    const result = {
      id: foundry.utils.randomID(),
      generatedAt: new Date().toISOString(),
      config,
      foods: menu,
      sourceIds: menu.map(food => getModuleFlags(food).sourceId)
    };
    Hooks.callAll(HOOKS.menuGenerated, result);
    return result;
  }

  async createJournal(menu, { name = null, folder = null } = {}) {
    if (!game.user.isGM) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.GMOnly`));
    const rows = menu.foods.map(food => {
      const meta = getFoodMeta(food);
      const price = meta.generatedPrice ?? meta.purchasePrice;
      return `<tr><td><img src="${food.img}" width="32" height="32" alt=""></td><td><strong>${foundry.utils.escapeHTML(food.name)}</strong><br><small>${foundry.utils.escapeHTML(meta.originSettlement)}</small></td><td>${foundry.utils.escapeHTML(meta.tier)}</td><td>${price.value} ${price.denomination}</td></tr>`;
    }).join("");
    const content = `<table><thead><tr><th></th><th>${game.i18n.localize(`${MODULE_ID}.Browser.Name`)}</th><th>${game.i18n.localize(`${MODULE_ID}.Browser.Tier`)}</th><th>${game.i18n.localize(`${MODULE_ID}.Browser.Price`)}</th></tr></thead><tbody>${rows}</tbody></table>`;
    return JournalEntry.create({
      name: name ?? game.i18n.localize(`${MODULE_ID}.Generator.GeneratedMenu`),
      folder,
      pages: [{ name: game.i18n.localize(`${MODULE_ID}.Generator.MenuPage`), type: "text", text: { content, format: 1 } }],
      flags: { [MODULE_ID]: { kind: "generated-menu", menu } }
    });
  }

  #matches(food, config) {
    const meta = getFoodMeta(food);
    if (TIER_ORDER[meta.tier] > TIER_ORDER[config.maxTier]) return false;
    if (meta.tier === "S" && !config.includeLegendary) return false;
    if (config.region !== "*" && meta.originRegion !== config.region) return false;
    if (config.settlement !== "*" && meta.originSettlement !== config.settlement) return false;
    if (config.venue !== "*" && !(meta.typicalVenue ?? []).includes(config.venue)) return false;
    if (config.socialClass !== "*" && !(meta.socialClass ?? []).includes(config.socialClass)) return false;
    if (config.season !== "*" && !(meta.season ?? []).includes(config.season) && !(meta.season ?? []).includes("all year")) return false;
    if (config.culturalInfluence !== "*" && meta.culture !== config.culturalInfluence) return false;
    if (!config.includeDrinks && (meta.mealType ?? []).includes("drink")) return false;
    if (!config.includeIllicit && ["corruptive edible", "spirit-bound contraband", "classified anomaly"].includes(meta.legality)) return false;
    return true;
  }

  #weight(food, config) {
    const meta = getFoodMeta(food);
    let weight = TIER_WEIGHTS[meta.tier] ?? 1;
    if (config.region !== "*" && meta.originRegion === config.region) weight *= 6;
    if (config.settlement !== "*" && meta.originSettlement === config.settlement) weight *= 8;
    if (config.venue !== "*" && (meta.typicalVenue ?? []).includes(config.venue)) weight *= 6;
    if (config.prosperity === "poor" && ["cheap", "common"].includes(meta.priceCategory)) weight *= 3;
    if (config.prosperity === "wealthy" && ["expensive", "luxury", "priceless"].includes(meta.priceCategory)) weight *= 3;
    if (config.scarcity === "severe" && ["ration", "preserved"].some(tag => (meta.mealType ?? []).includes(tag) || meta.preservationMethod?.includes(tag))) weight *= 2;
    if (config.militaryPresence === "heavy" && (meta.usualConsumers ?? []).includes("soldiers")) weight *= 4;
    return Math.max(0, weight);
  }
}

function weightedDistinct(values, count, weightFn) {
  const pool = values.map(value => ({ value, weight: weightFn(value) })).filter(entry => entry.weight > 0);
  const selected = [];
  while (pool.length && selected.length < count) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    let selectedIndex = 0;
    for (let index = 0; index < pool.length; index += 1) {
      roll -= pool[index].weight;
      if (roll <= 0) {
        selectedIndex = index;
        break;
      }
    }
    selected.push(pool.splice(selectedIndex, 1)[0].value);
  }
  return selected;
}

function roundPrice(value) {
  if (value < 1) return Math.max(0, Math.round(value * 10) / 10);
  return Math.max(1, Math.round(value));
}

export const menuService = new MenuService();
