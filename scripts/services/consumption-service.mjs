// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { FLAG_SCOPE, HOOKS, MODULE_ID, SETTINGS } from "../constants.mjs";
import { canConsumeForActor, formatDuration, getFoodMeta, getMechanics, getModuleFlags, htmlEscape, isFood, notify } from "../lib/utils.mjs";
import { effectService } from "./effect-service.mjs";
import { systemAdapterService } from "./system-adapter-service.mjs";

class ConsumptionService {
  async consume(food, actor, options = {}) {
    if (!isFood(food)) throw new TypeError(game.i18n.localize(`${MODULE_ID}.Errors.NotFood`));
    this.assertConsumableSource(food);
    if (!canConsumeForActor(actor)) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.NoActorPermission`));
    if (!game.user.isGM && !game.settings.get(MODULE_ID, SETTINGS.playerSelfConsumption)) {
      throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.PlayerConsumptionDisabled`));
    }

    const mechanics = getMechanics(food);
    const meta = getFoodMeta(food);
    const count = Math.max(1, Number(options.servings ?? 1));
    const available = this.remainingServings(food);
    if (available < count) throw new Error(game.i18n.format(`${MODULE_ID}.Errors.NotEnoughServings`, { available, requested: count }));

    const dietaryConflicts = this.dietaryConflicts(actor, food);
    if (dietaryConflicts.length && !options.skipConfirmation) {
      const accepted = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize(`${MODULE_ID}.Consume.DietaryTitle`) },
        content: `<p>${game.i18n.format(`${MODULE_ID}.Consume.DietaryWarning`, { actor: htmlEscape(actor.name), conflicts: htmlEscape(dietaryConflicts.join(", ")) })}</p>`,
        yes: { label: game.i18n.localize(`${MODULE_ID}.Consume.ContinueAnyway`) },
        no: { label: game.i18n.localize(`${MODULE_ID}.Common.Cancel`) }
      });
      if (!accepted) return { consumed: false, cancelled: true, reason: "dietary" };
    }

    const legendaryConfirmation = mechanics.tier === "S"
      && (!game.user.isGM || game.settings.get(MODULE_ID, SETTINGS.legendaryConfirmation));
    const highTierConfirmation = mechanics.tier === "4" || legendaryConfirmation;
    if (!options.skipConfirmation && highTierConfirmation) {
      const confirmed = await this.confirm(food, [actor], options);
      if (!confirmed) return { consumed: false, cancelled: true };
    }

    const allowed = Hooks.call(HOOKS.beforeConsume, food, actor, options);
    if (allowed === false) return { consumed: false, cancelled: true, reason: "hook" };

    const result = await effectService.apply(actor, food, { override: options.override && game.user.isGM });
    if (result.preserveServing) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.MechanicalConsumptionUnavailable`));
    if (mechanics.tier === "4" && result.applied) await effectService.setCooldown(actor, food);
    if (game.settings.get(MODULE_ID, SETTINGS.automaticServingReduction) && options.reduceServings !== false) {
      await this.reduceServings(food, count);
    }
    await this.#recordMeal(actor, food, options);
    await this.#postChat(food, actor, result, options);
    Hooks.callAll(HOOKS.consumed, { food, actor, result, options, user: game.user });
    return { consumed: true, actor, food, result };
  }

  assertConsumableSource(food) {
    if (game.user.isGM) return true;
    const ownerActor = food?.parent?.documentName === "Actor" ? food.parent : null;
    if (!ownerActor?.isOwner) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.InventoryFoodRequired`));
    return true;
  }

  async serve(food, actors, options = {}) {
    const uniqueActors = [...new Map(actors.filter(Boolean).map(actor => [actor.uuid, actor])).values()];
    if (!uniqueActors.length) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.NoTargets`));
    if (!game.user.isGM && uniqueActors.some(actor => !actor.isOwner)) {
      if (!game.settings.get(MODULE_ID, SETTINGS.playerServingOthers)) {
        throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.ServingOthersDisabled`));
      }
    }
    const available = this.remainingServings(food);
    if (available < uniqueActors.length) {
      throw new Error(game.i18n.format(`${MODULE_ID}.Errors.NotEnoughServings`, { available, requested: uniqueActors.length }));
    }
    const tier = getMechanics(food).tier;
    const legendaryConfirmation = tier === "S"
      && (!game.user.isGM || game.settings.get(MODULE_ID, SETTINGS.legendaryConfirmation));
    if (!options.skipConfirmation && (tier === "4" || legendaryConfirmation)) {
      const confirmed = await this.confirm(food, uniqueActors, options);
      if (!confirmed) return { served: false, cancelled: true, results: [] };
    }

    const results = [];
    for (const actor of uniqueActors) {
      try {
        results.push(await this.consume(food, actor, {
          ...options,
          servings: 1,
          skipConfirmation: true,
          reduceServings: false
        }));
      } catch (error) {
        results.push({ consumed: false, actor, error });
        if (!options.continueOnError) break;
      }
    }
    const successful = results.filter(result => result.consumed).length;
    if (successful && game.settings.get(MODULE_ID, SETTINGS.automaticServingReduction) && options.reduceServings !== false) {
      await this.reduceServings(food, successful);
    }
    return { served: successful > 0, successful, results };
  }

  async consumeSelected(food, options = {}) {
    const actors = [...new Map((canvas.tokens?.controlled ?? []).map(token => [token.actor?.uuid, token.actor])).values()].filter(Boolean);
    if (!actors.length && options.actor) actors.push(options.actor);
    return this.serve(food, actors, options);
  }

  dietaryConflicts(actor, food) {
    if (!game.settings.get(MODULE_ID, SETTINGS.dietaryRestrictions)) return [];
    const restrictions = new Set(actor.getFlag(FLAG_SCOPE, "dietaryRestrictions") ?? []);
    return (getFoodMeta(food).dietaryProperties ?? []).filter(tag => restrictions.has(tag));
  }

  remainingServings(food) {
    return systemAdapterService.remainingServings(food);
  }

  async reduceServings(food, amount = 1) {
    const result = await systemAdapterService.reduceServings(food, amount, {
      deleteEmpty: game.settings.get(MODULE_ID, SETTINGS.deleteEmptyItems)
    });
    return result?.remaining ?? this.remainingServings(food);
  }

  async confirm(food, actors, options = {}) {
    const mechanics = getMechanics(food);
    const cooldownRows = actors.map(actor => {
      const status = effectService.cooldownStatus(actor, food);
      const statusText = status.active
        ? game.i18n.format(`${MODULE_ID}.Consume.CooldownRemaining`, { duration: formatDuration(status.remaining) })
        : game.i18n.localize(`${MODULE_ID}.Consume.Available`);
      return `<li><strong>${htmlEscape(actor.name)}</strong>: ${htmlEscape(statusText)}</li>`;
    }).join("");
    const permanentWarning = mechanics.tier === "S"
      ? `<p class="notification warning">${game.i18n.localize(`${MODULE_ID}.Consume.LegendaryWarning`)}</p>`
      : "";
    const override = options.override && game.user.isGM
      ? `<p>${game.i18n.localize(`${MODULE_ID}.Consume.OverrideEnabled`)}</p>`
      : "";
    const content = `
      <div class="rts-confirm">
        ${permanentWarning}
        <p><strong>${htmlEscape(food.name)}</strong></p>
        <p>${htmlEscape(mechanics.summary)}</p>
        <p>${game.i18n.format(`${MODULE_ID}.Consume.Duration`, { duration: formatDuration(mechanics.durationSeconds) })}</p>
        <ul>${cooldownRows}</ul>
        ${override}
      </div>`;
    return foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize(`${MODULE_ID}.Consume.ConfirmTitle`) },
      content,
      yes: { label: game.i18n.localize(`${MODULE_ID}.Common.Consume`), icon: "fa-solid fa-utensils" },
      no: { label: game.i18n.localize(`${MODULE_ID}.Common.Cancel`), icon: "fa-solid fa-xmark" },
      rejectClose: false,
      modal: true
    });
  }

  async #recordMeal(actor, food, options) {
    const history = [...(actor.getFlag(FLAG_SCOPE, "mealHistory") ?? [])];
    history.push({
      sourceId: getModuleFlags(food).sourceId,
      name: food.name,
      tier: getMechanics(food).tier,
      at: new Date().toISOString(),
      rest: options.rest ?? null,
      sharedMealId: options.sharedMealId ?? null,
      userId: game.user.id
    });
    while (history.length > 100) history.shift();
    await actor.setFlag(FLAG_SCOPE, "mealHistory", history);
  }

  async #postChat(food, actor, result, options) {
    const detail = game.settings.get(MODULE_ID, SETTINGS.chatDetail);
    if (detail === "terse") {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<p>${game.i18n.format(`${MODULE_ID}.Chat.ConsumedTerse`, { actor: htmlEscape(actor.name), food: htmlEscape(food.name) })}</p>`
      });
      return;
    }
    const meta = getFoodMeta(food);
    const mechanics = getMechanics(food);
    const content = await renderTemplate(`modules/${MODULE_ID}/templates/chat-consumption.hbs`, {
      actorName: actor.name,
      foodName: food.name,
      img: food.img,
      tier: mechanics.tier,
      summary: mechanics.summary,
      origin: `${meta.originSettlement}, ${meta.originRegion}`,
      applied: result.applied,
      permanent: mechanics.tier === "S",
      detailed: detail === "detailed",
      imperialStatus: !game.user.isGM && game.settings.get(MODULE_ID, SETTINGS.hideImperialClassifications)
        ? game.i18n.localize(`${MODULE_ID}.Common.Hidden`)
        : meta.legality,
      rest: options.rest ?? null
    });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
  }
}

export const consumptionService = new ConsumptionService();
