// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { FLAG_SCOPE, HOOKS, MODULE_ID, SETTINGS } from "../constants.mjs";
import { getMechanics, getModuleFlags, nowWorldTime } from "../lib/utils.mjs";
import { systemAdapterService } from "./system-adapter-service.mjs";

class EffectService {
  async apply(actor, food, { override = false } = {}) {
    const mechanics = getMechanics(food);
    if (!game.settings.get(MODULE_ID, SETTINGS.mechanicsEnabled)) return { applied: false, reason: "disabled" };
    if (mechanics.tier === "1" || !(mechanics.effectIntents?.length)) return { applied: false, reason: "narrative" };
    if (mechanics.tier === "S" && !game.settings.get(MODULE_ID, SETTINGS.tierSPermanentEffects)) {
      return { applied: false, reason: "legendary-disabled", preserveServing: true };
    }
    if (mechanics.tier === "S") return this.#applyPermanent(actor, food, mechanics, { override });

    await this.#enforceStacking(actor, mechanics, { override });
    const applied = await systemAdapterService.applyFoodEffect({ actor, food, mechanics, permanent: false, override });
    if (!applied?.applied) return { applied: false, reason: applied?.reason ?? "adapter-declined", adapterResult: applied };

    const recordId = `${mechanics.effectId}:${foundry.utils.randomID()}`;
    const effects = { ...this.activeFoodEffects(actor) };
    effects[recordId] = {
      recordId,
      effectId: mechanics.effectId,
      sourceId: getModuleFlags(food).sourceId,
      name: food.name,
      tier: mechanics.tier,
      stackingGroup: mechanics.stackingGroup ?? `tier-${mechanics.tier}`,
      startedAtWorldTime: nowWorldTime(),
      expiresAtWorldTime: Number(mechanics.durationSeconds ?? 0) > 0 ? nowWorldTime() + Number(mechanics.durationSeconds) : null,
      adapterId: systemAdapterService.current()?.id ?? null,
      adapterState: applied.state ?? null
    };
    await actor.setFlag(FLAG_SCOPE, "activeFoodEffects", effects);
    return { applied: true, recordId, adapterResult: applied };
  }

  activeFoodEffects(actor) { return actor.getFlag(FLAG_SCOPE, "activeFoodEffects") ?? {}; }

  cooldownStatus(actor, food) {
    const mechanics = getMechanics(food);
    const cooldowns = actor.getFlag(FLAG_SCOPE, "cooldowns") ?? {};
    const now = nowWorldTime();
    const global = cooldowns.tier4 ?? 0;
    const same = cooldowns[mechanics.effectId] ?? 0;
    const until = Math.max(global, same);
    return { active: until > now, until, remaining: Math.max(0, until - now) };
  }

  permanentBenefits(actor) { return actor.getFlag(FLAG_SCOPE, "permanentBenefits") ?? {}; }
  hasPermanentBenefit(actor, effectId) { return Boolean(this.permanentBenefits(actor)[effectId]); }

  async setCooldown(actor, food) {
    const mechanics = getMechanics(food);
    if (mechanics.tier !== "4") return;
    const now = nowWorldTime();
    const cooldowns = { ...(actor.getFlag(FLAG_SCOPE, "cooldowns") ?? {}) };
    const configured = game.settings.get(MODULE_ID, SETTINGS.tier4CooldownRule);
    const until = now + Number(mechanics.cooldownSeconds ?? 0);
    cooldowns[mechanics.effectId] = until;
    if (configured === "strict") cooldowns.tier4 = Math.max(cooldowns.tier4 ?? 0, now + 86400);
    await actor.setFlag(FLAG_SCOPE, "cooldowns", cooldowns);
    Hooks.callAll(HOOKS.cooldownChanged, actor, food, cooldowns);
  }

  async clearCooldown(actor, effectId = null) {
    const cooldowns = { ...(actor.getFlag(FLAG_SCOPE, "cooldowns") ?? {}) };
    if (effectId) delete cooldowns[effectId];
    else for (const key of Object.keys(cooldowns)) delete cooldowns[key];
    await actor.setFlag(FLAG_SCOPE, "cooldowns", cooldowns);
    Hooks.callAll(HOOKS.cooldownChanged, actor, null, cooldowns);
  }

  async removePermanentBenefit(actor, effectId) {
    const benefits = { ...this.permanentBenefits(actor) };
    const benefit = benefits[effectId];
    if (!benefit) return false;
    await systemAdapterService.removeFoodEffect({ actor, record: benefit, permanent: true });
    delete benefits[effectId];
    await actor.setFlag(FLAG_SCOPE, "permanentBenefits", benefits);
    Hooks.callAll(HOOKS.permanentBenefitChanged, actor, effectId, false);
    return true;
  }

  async cleanupActor(actor) {
    const cooldowns = await this.cleanupExpiredCooldowns(actor);
    const active = { ...this.activeFoodEffects(actor) };
    const now = nowWorldTime();
    let changed = false;
    for (const [recordId, record] of Object.entries(active)) {
      if (record.expiresAtWorldTime !== null && Number(record.expiresAtWorldTime) <= now) {
        await systemAdapterService.removeFoodEffect({ actor, record, permanent: false });
        delete active[recordId];
        changed = true;
      }
    }
    if (changed) await actor.setFlag(FLAG_SCOPE, "activeFoodEffects", active);
    await systemAdapterService.cleanupFoodEffects({ actor, activeRecords: active, permanentBenefits: this.permanentBenefits(actor) });
    return { cooldowns, activeFoodEffects: active };
  }

  async cleanupExpiredCooldowns(actor) {
    const cooldowns = { ...(actor.getFlag(FLAG_SCOPE, "cooldowns") ?? {}) };
    const now = nowWorldTime();
    let changed = false;
    for (const [key, until] of Object.entries(cooldowns)) {
      if (Number(until) <= now) { delete cooldowns[key]; changed = true; }
    }
    if (changed) await actor.setFlag(FLAG_SCOPE, "cooldowns", cooldowns);
    return cooldowns;
  }

  async #enforceStacking(actor, mechanics, { override }) {
    if (override) return;
    if (mechanics.tier === "4") {
      const status = this.cooldownStatus(actor, { flags: { [FLAG_SCOPE]: { mechanics } } });
      const rule = game.settings.get(MODULE_ID, SETTINGS.tier4CooldownRule);
      if (status.active && rule !== "advisory") throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.CooldownActive`));
    }
    const setting = mechanics.tier === "2" ? SETTINGS.tier2Stacking : mechanics.tier === "3" ? SETTINGS.tier3Stacking : null;
    if (!setting || game.settings.get(MODULE_ID, setting) === "allow") return;
    const active = { ...this.activeFoodEffects(actor) };
    const group = mechanics.stackingGroup ?? `tier-${mechanics.tier}`;
    let changed = false;
    for (const [recordId, record] of Object.entries(active)) {
      if (record.stackingGroup !== group) continue;
      await systemAdapterService.removeFoodEffect({ actor, record, permanent: false });
      delete active[recordId];
      changed = true;
    }
    if (changed) await actor.setFlag(FLAG_SCOPE, "activeFoodEffects", active);
  }

  async #applyPermanent(actor, food, mechanics, { override }) {
    const benefits = { ...this.permanentBenefits(actor) };
    if (benefits[mechanics.effectId] && !override) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.DuplicateLegendary`));
    if (benefits[mechanics.effectId] && override) await systemAdapterService.removeFoodEffect({ actor, record: benefits[mechanics.effectId], permanent: true });

    const applied = await systemAdapterService.applyFoodEffect({ actor, food, mechanics, permanent: true, override });
    if (!applied?.applied) return { applied: false, reason: applied?.reason ?? "adapter-declined", preserveServing: true, adapterResult: applied };
    benefits[mechanics.effectId] = {
      effectId: mechanics.effectId,
      sourceId: getModuleFlags(food).sourceId,
      name: food.name,
      summary: mechanics.summary,
      consumedAt: new Date().toISOString(),
      actorUuid: actor.uuid,
      adapterId: systemAdapterService.current()?.id ?? null,
      adapterState: applied.state ?? null,
      effectIntents: mechanics.effectIntents ?? []
    };
    await actor.setFlag(FLAG_SCOPE, "permanentBenefits", benefits);
    Hooks.callAll(HOOKS.permanentBenefitChanged, actor, food, true);
    return { applied: true, permanent: true, adapterResult: applied };
  }
}

export const effectService = new EffectService();
