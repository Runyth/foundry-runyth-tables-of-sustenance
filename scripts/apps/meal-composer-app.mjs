import { APP_IDS, MODULE_ID } from "../constants.mjs";
import { getFoodMeta, getMechanics, getModuleFlags } from "../lib/utils.mjs";
import { contentLibrary } from "../services/content-library.mjs";
import { PersistentApplication } from "./base-app.mjs";

const SLOTS = ["main", "side", "staple", "drink", "dessert", "supplement"];

export class MealComposerApp extends PersistentApplication {
  #slots = Object.fromEntries(SLOTS.map(slot => [slot, null]));
  #rule = "strongest";

  static DEFAULT_OPTIONS = {
    id: APP_IDS.composer,
    classes: ["rts", "rts-composer"],
    tag: "section",
    position: { width: 850, height: 680 },
    window: { title: `${MODULE_ID}.Composer.Title`, icon: "fa-solid fa-plate-wheat", resizable: true },
    actions: {
      clear: MealComposerApp.#clear,
      consume: MealComposerApp.#consume
    }
  };

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/meal-composer.hbs` }
  };

  async _prepareContext() {
    const foods = await contentLibrary.foods({ localized: true });
    const options = foods.map(food => ({ sourceId: getModuleFlags(food).sourceId, name: food.name, tier: getFoodMeta(food).tier }));
    const selected = [];
    for (const [slot, sourceId] of Object.entries(this.#slots)) {
      const food = sourceId ? await contentLibrary.sourceById(sourceId, { localized: true }) : null;
      selected.push({ slot, sourceId, food, labelKey: `${MODULE_ID}.Composer.Slot.${slot}` });
    }
    const effects = selected.filter(row => row.food).map(row => ({ slot: row.slot, name: row.food.name, tier: getMechanics(row.food).tier, summary: getMechanics(row.food).summary }));
    const applied = this.#resolveEffects(effects);
    return { options, selected, effects, applied, rule: this.#rule };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const form = this.element.querySelector("form.rts-composer-form");
    form?.addEventListener("change", () => {
      const data = new FormDataExtended(form).object;
      for (const slot of SLOTS) this.#slots[slot] = data[slot] || null;
      this.#rule = data.rule ?? "strongest";
      this.render({ force: true });
    });
  }

  #resolveEffects(effects) {
    if (this.#rule === "narrative") return [];
    if (this.#rule === "strongest") {
      return effects.sort((a, b) => tierValue(b.tier) - tierValue(a.tier)).slice(0, 1);
    }
    if (this.#rule === "onePerTier") {
      return [...new Map(effects.sort((a, b) => tierValue(b.tier) - tierValue(a.tier)).map(effect => [effect.tier, effect])).values()];
    }
    return effects;
  }

  static #clear() { this.#slots = Object.fromEntries(SLOTS.map(slot => [slot, null])); this.render({ force: true }); }

  static async #consume() {
    const actor = canvas.tokens?.controlled?.[0]?.actor ?? game.user.character;
    if (!actor) return ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.Errors.NoTargets`));
    const foods = [];
    for (const sourceId of Object.values(this.#slots).filter(Boolean)) {
      const food = await contentLibrary.sourceById(sourceId, { localized: true });
      if (food) foods.push(food);
    }
    const effects = this.#resolveEffects(foods.map(food => ({ food, tier: getMechanics(food).tier })));
    const sharedMealId = foundry.utils.randomID();
    for (const entry of effects) {
      const food = entry.food ?? foods.find(candidate => getMechanics(candidate).tier === entry.tier);
      if (food) await game[MODULE_ID].consume(food, actor, { reduceServings: false, sharedMealId });
    }
  }
}

function tierValue(tier) { return ({ "1": 1, "2": 2, "3": 3, "4": 4, "S": 5 })[tier] ?? 0; }
