import { FLAG_SCOPE, HOOKS, MODULE_ID, TIERS } from "../constants.mjs";
import { deepClone } from "../lib/utils.mjs";

class Registry {
  #values = new Map();
  #systemAdapters = new Map();
  #providers = new Map();
  #foods = new Map();

  constructor() {
    this.#values.set("tiers", new Map(TIERS.map(id => [id, { id, label: `${MODULE_ID}.Tier.${id}` }])));
    for (const category of ["regions", "cultures", "venues", "consumers", "dietaryTags", "recipes"]) this.#values.set(category, new Map());
  }

  register(category, definition) {
    if (!definition?.id) throw new TypeError(`Registry definition for ${category} requires a stable id.`);
    const bucket = this.#values.get(category) ?? new Map();
    bucket.set(definition.id, Object.freeze({ ...definition }));
    this.#values.set(category, bucket);
    Hooks.callAll(HOOKS.registryChanged, category, definition);
    return definition.id;
  }

  unregister(category, id) { return this.#values.get(category)?.delete(id) ?? false; }
  get(category, id) { return this.#values.get(category)?.get(id) ?? null; }
  list(category) { return [...(this.#values.get(category)?.values() ?? [])]; }

  registerProvider(definition) {
    const id = String(definition?.id ?? definition?.moduleId ?? "").trim();
    if (!id) throw new TypeError("Complementary provider registration requires a stable id.");
    const moduleId = String(definition?.moduleId ?? id).trim();
    const record = Object.freeze({
      id,
      moduleId,
      title: String(definition?.title ?? game.modules.get(moduleId)?.title ?? id),
      version: String(definition?.version ?? game.modules.get(moduleId)?.version ?? "0.0.0"),
      apiVersion: String(definition?.apiVersion ?? "1"),
      description: String(definition?.description ?? ""),
      registeredAt: new Date().toISOString()
    });
    this.#providers.set(id, record);
    Hooks.callAll(HOOKS.extensionChanged, { action: "provider-registered", provider: deepClone(record) });
    return deepClone(record);
  }

  unregisterProvider(providerId, { removeFoods = true } = {}) {
    const removed = this.#providers.delete(providerId);
    if (removeFoods) for (const [sourceId, record] of this.#foods) if (record.providerId === providerId) this.#foods.delete(sourceId);
    if (removed) Hooks.callAll(HOOKS.extensionChanged, { action: "provider-unregistered", providerId });
    return removed;
  }

  providers() { return [...this.#providers.values()].map(deepClone); }

  registerFood(providerId, source) {
    if (!this.#providers.has(providerId)) throw new Error(`Provider ${providerId} must be registered before adding food.`);
    if (!source || typeof source !== "object") throw new TypeError("Food source must be an object.");
    const clone = deepClone(source);
    if (Object.hasOwn(clone, "type") || Object.hasOwn(clone, "system") || Object.hasOwn(clone, "effects")) {
      throw new TypeError("Complementary core foods must be system-neutral definitions without type, system, or effects fields. Register game-system materialization through a system adapter instead.");
    }
    const sourceId = String(foundry.utils.getProperty(clone, `flags.${FLAG_SCOPE}.sourceId`) ?? "").trim();
    if (!sourceId) throw new TypeError(`Complementary food requires flags.${FLAG_SCOPE}.sourceId.`);
    const existing = this.#foods.get(sourceId);
    if (existing && existing.providerId !== providerId) throw new Error(`Complementary food source ID is already registered by ${existing.providerId}: ${sourceId}`);
    if (!clone.name || !clone.img) throw new TypeError(`Complementary food ${sourceId} requires name and img.`);
    foundry.utils.setProperty(clone, `flags.${FLAG_SCOPE}.kind`, "food");
    foundry.utils.setProperty(clone, `flags.${FLAG_SCOPE}.providerId`, providerId);
    foundry.utils.setProperty(clone, `flags.${FLAG_SCOPE}.sourceVersion`, foundry.utils.getProperty(clone, `flags.${FLAG_SCOPE}.sourceVersion`) ?? "1.0.0");
    const meta = foundry.utils.getProperty(clone, `flags.${FLAG_SCOPE}.meta`);
    if (!meta?.tier || !TIERS.includes(String(meta.tier))) throw new TypeError(`Complementary food ${sourceId} requires a valid metadata tier.`);
    this.#foods.set(sourceId, Object.freeze({ providerId, source: clone }));
    Hooks.callAll(HOOKS.extensionChanged, { action: "food-registered", providerId, sourceId });
    return sourceId;
  }

  registerFoods(providerId, sources) {
    if (!Array.isArray(sources)) throw new TypeError("registerFoods requires an array of food sources.");
    const snapshots = new Map();
    const registered = [];
    try {
      for (const source of sources) {
        const sourceId = String(foundry.utils.getProperty(source, `flags.${FLAG_SCOPE}.sourceId`) ?? "").trim();
        if (sourceId && !snapshots.has(sourceId)) snapshots.set(sourceId, this.#foods.get(sourceId) ?? null);
        registered.push(this.registerFood(providerId, source));
      }
      return registered;
    } catch (error) {
      for (const [sourceId, previous] of snapshots) previous ? this.#foods.set(sourceId, previous) : this.#foods.delete(sourceId);
      throw error;
    }
  }

  unregisterFood(sourceId) {
    const record = this.#foods.get(sourceId);
    const removed = this.#foods.delete(sourceId);
    if (removed) Hooks.callAll(HOOKS.extensionChanged, { action: "food-unregistered", providerId: record.providerId, sourceId });
    return removed;
  }

  foods({ providerId = null } = {}) {
    return [...this.#foods.entries()]
      .filter(([, record]) => !providerId || record.providerId === providerId)
      .map(([sourceId, record]) => ({ sourceId, providerId: record.providerId, source: deepClone(record.source) }));
  }

  registerSystemAdapter(systemId, adapter) {
    const id = String(systemId ?? "").trim();
    if (!id || !adapter || typeof adapter !== "object") throw new TypeError("System adapter requires an id and adapter object.");
    if (adapter.systemId && adapter.systemId !== id) throw new Error(`Adapter systemId ${adapter.systemId} does not match registration id ${id}.`);
    for (const capability of ["materializeFood", "remainingServings", "reduceServings", "applyFoodEffect", "removeFoodEffect"]) {
      if (typeof adapter[capability] !== "function") throw new TypeError(`System adapter ${id} is missing required capability ${capability}.`);
    }
    const existing = this.#systemAdapters.get(id);
    const requestedAdapterId = String(adapter.id ?? `${id}-adapter`);
    const requestedModuleId = String(adapter.moduleId ?? adapter.id ?? `${id}-adapter`);
    if (existing && (existing.id !== requestedAdapterId || existing.moduleId !== requestedModuleId)) {
      throw new Error(`System adapter ${id} is already owned by ${existing.moduleId}:${existing.id}.`);
    }
    const record = Object.freeze({
      ...adapter,
      id: requestedAdapterId,
      systemId: id,
      moduleId: requestedModuleId,
      version: String(adapter.version ?? "0.0.0"),
      apiVersion: String(adapter.apiVersion ?? "1"),
      capabilities: Object.freeze({ ...(adapter.capabilities ?? {}) })
    });
    this.#systemAdapters.set(id, record);
    Hooks.callAll(HOOKS.systemAdapterChanged, { action: "registered", systemId: id, adapter: record });
    return record;
  }

  unregisterSystemAdapter(systemId, adapterId = null) {
    const current = this.#systemAdapters.get(systemId);
    if (!current || (adapterId && current.id !== adapterId)) return false;
    this.#systemAdapters.delete(systemId);
    Hooks.callAll(HOOKS.systemAdapterChanged, { action: "unregistered", systemId, adapterId: current.id });
    return true;
  }

  systemAdapter(systemId = game.system.id) { return this.#systemAdapters.get(systemId) ?? null; }
  systemAdapters() { return [...this.#systemAdapters.values()]; }
}

export const registry = new Registry();
