import { DATA_PATHS } from "../constants.mjs";
import { deepClone, getFoodMeta, getModuleFlags, localizeSource, normalizeText, uniqueSorted } from "../lib/utils.mjs";
import { imageOverrideService } from "./image-override-service.mjs";
import { registry } from "./registry.mjs";

class ContentLibrary {
  #cache = new Map();
  #indexes = null;

  async load(kind, { localized = false, fresh = false } = {}) {
    if (fresh) this.#cache.delete(kind);
    if (!this.#cache.has(kind)) {
      const path = DATA_PATHS[kind];
      if (!path) throw new Error(`Unknown content kind: ${kind}`);
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error(`Unable to load ${path}: ${response.status}`);
      const data = await response.json();
      this.#cache.set(kind, Object.freeze(data));
    }
    const sources = this.#cache.get(kind);
    return localized ? sources.map(source => localizeSource(source)) : sources.map(deepClone);
  }

  async foods({ localized = false, fresh = false, includeExtensions = true, applyImageOverrides = true } = {}) {
    const packaged = await this.load("foods", { localized, fresh });
    const extensionFoods = includeExtensions
      ? registry.foods().map(record => localized ? localizeSource(record.source) : deepClone(record.source))
      : [];
    const seen = new Set(packaged.map(source => getModuleFlags(source).sourceId));
    const combined = [...packaged];
    for (const source of extensionFoods) {
      const sourceId = getModuleFlags(source).sourceId;
      if (!seen.has(sourceId)) {
        combined.push(source);
        seen.add(sourceId);
      }
    }
    return applyImageOverrides ? combined.map(source => imageOverrideService.apply(source)) : combined;
  }

  async recipes(options = {}) {
    return this.load("recipes", options);
  }

  async tables(options = {}) {
    return this.load("tables", options);
  }

  async index({ fresh = false } = {}) {
    if (fresh) this.#indexes = null;
    if (!this.#indexes) {
      const response = await fetch(DATA_PATHS.index, { cache: "no-store" });
      if (!response.ok) throw new Error(`Unable to load ${DATA_PATHS.index}: ${response.status}`);
      this.#indexes = await response.json();
    }
    return deepClone(this.#indexes);
  }

  async sourceById(sourceId, { localized = false, applyImageOverrides = true } = {}) {
    const packagedFood = (await this.load("foods")).find(entry => getModuleFlags(entry).sourceId === sourceId);
    if (packagedFood) {
      const source = localized ? localizeSource(packagedFood) : deepClone(packagedFood);
      return applyImageOverrides ? imageOverrideService.apply(source) : source;
    }
    const registeredFood = registry.foods().find(entry => entry.sourceId === sourceId)?.source;
    if (registeredFood) {
      const source = localized ? localizeSource(registeredFood) : deepClone(registeredFood);
      return applyImageOverrides ? imageOverrideService.apply(source) : source;
    }
    for (const kind of ["recipes", "tables"]) {
      const source = (await this.load(kind)).find(entry => getModuleFlags(entry).sourceId === sourceId);
      if (source) return localized ? localizeSource(source) : source;
    }
    return null;
  }

  async metadataOptions() {
    const foods = await this.foods({ localized: true });
    const metas = foods.map(getFoodMeta);
    const collect = key => uniqueSorted(metas.flatMap(meta => Array.isArray(meta[key]) ? meta[key] : [meta[key]]));
    return {
      tiers: collect("tier"),
      regions: collect("originRegion"),
      settlements: collect("originSettlement"),
      cultures: collect("culture"),
      factions: collect("factionAssociation"),
      venues: collect("typicalVenue"),
      consumers: uniqueSorted(metas.flatMap(meta => [
        ...(meta.usualConsumers ?? []),
        ...(meta.preferredConsumers ?? [])
      ])),
      socialClasses: collect("socialClass"),
      rarities: collect("rarity"),
      prices: collect("priceCategory"),
      legalities: collect("legality"),
      natures: collect("nature"),
      dietary: collect("dietaryProperties"),
      mealTypes: collect("mealType")
    };
  }

  async queryFoods(query = {}) {
    const foods = await this.foods({ localized: query.localized ?? true });
    const search = normalizeText(query.search);
    const matchArray = (values, expected) => !expected || expected === "*" || (values ?? []).includes(expected);
    return foods.filter(food => {
      const meta = getFoodMeta(food);
      if (search) {
        const haystack = normalizeText([
          food.name,
          food.description ?? foundry.utils.getProperty(food, "system.description.value"),
          meta.originRegion,
          meta.originSettlement,
          meta.culture,
          ...(meta.ingredients ?? []),
          ...(meta.typicalVenue ?? []),
          ...(meta.usualConsumers ?? []),
          ...(meta.preferredConsumers ?? [])
        ].join(" "));
        if (!haystack.includes(search)) return false;
      }
      if (query.tier && query.tier !== "*" && meta.tier !== query.tier) return false;
      if (query.region && query.region !== "*" && meta.originRegion !== query.region) return false;
      if (query.venue && !matchArray(meta.typicalVenue, query.venue)) return false;
      if (query.consumer && !matchArray([...(meta.usualConsumers ?? []), ...(meta.preferredConsumers ?? [])], query.consumer)) return false;
      if (query.culture && query.culture !== "*" && meta.culture !== query.culture) return false;
      if (query.faction && !matchArray(meta.factionAssociation, query.faction)) return false;
      if (query.socialClass && !matchArray(meta.socialClass, query.socialClass)) return false;
      if (query.rarity && query.rarity !== "*" && meta.rarity !== query.rarity) return false;
      if (query.price && query.price !== "*" && meta.priceCategory !== query.price) return false;
      if (query.legality && query.legality !== "*" && meta.legality !== query.legality) return false;
      if (query.nature && query.nature !== "*" && meta.nature !== query.nature) return false;
      if (query.dietary && !matchArray(meta.dietaryProperties, query.dietary)) return false;
      if (query.activeEffect === "yes" && !meta.activeEffect) return false;
      if (query.activeEffect === "no" && meta.activeEffect) return false;
      if (query.cooldown === "yes" && !(Number(meta.cooldownSeconds) > 0)) return false;
      if (query.cooldown === "no" && Number(meta.cooldownSeconds) > 0) return false;
      return true;
    });
  }
}

export const contentLibrary = new ContentLibrary();
