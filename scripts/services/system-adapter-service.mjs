import { MODULE_ID } from "../constants.mjs";
import { getFoodMeta, getMechanics, getModuleFlags } from "../lib/utils.mjs";
import { registry } from "./registry.mjs";

class SystemAdapterService {
  current() {
    return registry.systemAdapter(game.system.id);
  }

  status() {
    const adapter = this.current();
    return {
      systemId: game.system.id,
      systemVersion: game.system.version,
      available: Boolean(adapter),
      adapter: adapter ? {
        id: adapter.id,
        moduleId: adapter.moduleId,
        version: adapter.version,
        apiVersion: adapter.apiVersion,
        capabilities: { ...(adapter.capabilities ?? {}) }
      } : null
    };
  }

  require(capability) {
    const adapter = this.current();
    if (!adapter) throw new Error(game.i18n.format(`${MODULE_ID}.Errors.SystemAdapterMissing`, { system: game.system.id }));
    if (typeof adapter[capability] !== "function") {
      throw new Error(game.i18n.format(`${MODULE_ID}.Errors.SystemAdapterCapabilityMissing`, { capability, system: game.system.id }));
    }
    return adapter;
  }

  async materializeFood(food, options = {}) {
    const adapter = this.require("materializeFood");
    const source = await adapter.materializeFood(food, options);
    if (!source || typeof source !== "object") throw new TypeError(`System adapter ${adapter.id} returned invalid food data.`);
    const sourceId = getModuleFlags(food).sourceId;
    const materializedId = foundry.utils.getProperty(source, `flags.${MODULE_ID}.sourceId`);
    if (materializedId !== sourceId) throw new Error(`System adapter ${adapter.id} changed stable food source id ${sourceId}.`);
    return source;
  }

  remainingServings(food) {
    const adapter = this.current();
    if (adapter?.remainingServings) return Math.max(0, Number(adapter.remainingServings(food) ?? 0));
    return Math.max(0, Number(getFoodMeta(food).servings ?? 1));
  }

  async reduceServings(food, amount, options = {}) {
    if (!food?.update) return { remaining: this.remainingServings(food), changed: false };
    const adapter = this.require("reduceServings");
    return adapter.reduceServings(food, amount, options);
  }

  async applyFoodEffect(context) {
    const intents = getMechanics(context.food).effectIntents ?? [];
    if (!intents.length) return { applied: false, state: null, reason: "no-intent" };
    return this.require("applyFoodEffect").applyFoodEffect(context);
  }

  async removeFoodEffect(context) {
    const adapter = this.current();
    if (!adapter?.removeFoodEffect) return { removed: false, reason: "adapter-unavailable" };
    return adapter.removeFoodEffect(context);
  }

  async cleanupFoodEffects(context) {
    const adapter = this.current();
    if (!adapter?.cleanupFoodEffects) return { removed: 0 };
    return adapter.cleanupFoodEffects(context);
  }

  async describePermanentBenefit(actor, benefit) {
    const adapter = this.current();
    if (!adapter?.describePermanentBenefit) return null;
    return adapter.describePermanentBenefit({ actor, benefit });
  }

  async primePermanentBenefit(actor, benefit) {
    const adapter = this.require("primePermanentBenefit");
    return adapter.primePermanentBenefit({ actor, benefit });
  }

  async unprimePermanentBenefit(actor) {
    const adapter = this.current();
    if (!adapter?.unprimePermanentBenefit) return false;
    return adapter.unprimePermanentBenefit({ actor });
  }

  registerIntentHandler(kind, handler) {
    const adapter = this.require("registerIntentHandler");
    return adapter.registerIntentHandler(kind, handler);
  }

  unregisterIntentHandler(kind) {
    const adapter = this.current();
    if (!adapter?.unregisterIntentHandler) return false;
    return adapter.unregisterIntentHandler(kind);
  }

  async diagnostics() {
    const adapter = this.current();
    if (!adapter?.diagnostics) return null;
    return adapter.diagnostics();
  }
}

export const systemAdapterService = new SystemAdapterService();
