// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { FLAG_SCOPE, MODULE_ID } from "../constants.mjs";
import { formatDuration, nowWorldTime } from "../lib/utils.mjs";
import { effectService } from "../services/effect-service.mjs";
import { systemAdapterService } from "../services/system-adapter-service.mjs";
import { PersistentApplication } from "./base-app.mjs";

export class BenefitManagerApp extends PersistentApplication {
  actor;

  constructor(actor, options = {}) {
    super({ id: `${MODULE_ID}-benefits-${actor.id}`, ...options });
    this.actor = actor;
  }

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-benefits`,
    classes: ["rts", "rts-benefits"],
    tag: "section",
    position: { width: 700, height: 600 },
    window: { title: `${MODULE_ID}.Benefits.Title`, icon: "fa-solid fa-seedling", resizable: true },
    actions: {
      prime: BenefitManagerApp.#prime,
      unprime: BenefitManagerApp.#unprime,
      remove: BenefitManagerApp.#remove,
      clearCooldowns: BenefitManagerApp.#clearCooldowns
    }
  };

  static PARTS = { content: { template: `modules/${MODULE_ID}/templates/benefit-manager.hbs` } };

  async _prepareContext() {
    const benefits = [];
    for (const [effectId, benefit] of Object.entries(effectService.permanentBenefits(this.actor))) {
      const presentation = await systemAdapterService.describePermanentBenefit(this.actor, benefit) ?? {};
      benefits.push({
        effectId,
        ...benefit,
        contextual: Boolean(presentation.contextual),
        bonus: presentation.bonus ?? 0,
        context: presentation.context ?? ""
      });
    }
    const now = nowWorldTime();
    const cooldowns = Object.entries(this.actor.getFlag(FLAG_SCOPE, "cooldowns") ?? {})
      .filter(([, until]) => Number(until) > now)
      .map(([id, until]) => ({ id, remaining: formatDuration(Number(until) - now) }));
    const adapter = systemAdapterService.current();
    const primed = adapter?.getPrimedPermanentBenefit ? await adapter.getPrimedPermanentBenefit({ actor: this.actor }) : null;
    return { actor: this.actor, benefits, cooldowns, primed, isGM: game.user.isGM };
  }

  static async #prime(event, target) {
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    const benefit = effectService.permanentBenefits(this.actor)[effectId];
    if (!benefit) return;
    try {
      await systemAdapterService.primePermanentBenefit(this.actor, benefit);
      this.render({ force: true });
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }

  static async #unprime() {
    await systemAdapterService.unprimePermanentBenefit(this.actor);
    this.render({ force: true });
  }

  static async #remove(event, target) {
    if (!game.user.isGM) return;
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    await effectService.removePermanentBenefit(this.actor, effectId);
    this.render({ force: true });
  }

  static async #clearCooldowns() {
    if (!game.user.isGM) return;
    await effectService.clearCooldown(this.actor);
    this.render({ force: true });
  }
}
