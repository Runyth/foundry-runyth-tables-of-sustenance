import { APP_IDS, FLAG_SCOPE, MODULE_ID, SETTINGS } from "../constants.mjs";
import { compareFoods, getFoodMeta, getMechanics, getModuleFlags } from "../lib/utils.mjs";
import { contentLibrary } from "../services/content-library.mjs";
import { imageOverrideService } from "../services/image-override-service.mjs";
import { systemAdapterService } from "../services/system-adapter-service.mjs";
import { PersistentApplication } from "./base-app.mjs";

const PAGE_SIZE = 50;
let detailApp = null;
const EMPTY_FILTERS = Object.freeze({ search: "", tier: "*", region: "*", venue: "*", consumer: "*", culture: "*", faction: "*", socialClass: "*", rarity: "*", price: "*", legality: "*", nature: "*", dietary: "*", activeEffect: "*", cooldown: "*", sort: "name" });

export class FoodBrowserApp extends PersistentApplication {
  #filters = { ...EMPTY_FILTERS };
  #view = "cards";
  #page = 1;

  static DEFAULT_OPTIONS = {
    id: APP_IDS.browser,
    classes: ["rts", "rts-browser", "rts-browser-layout"],
    tag: "section",
    position: { width: 1180, height: 780 },
    window: { title: `${MODULE_ID}.Browser.Title`, icon: "fa-solid fa-bowl-food", resizable: true },
    actions: {
      reset: FoodBrowserApp.#reset,
      cards: FoodBrowserApp.#cards,
      table: FoodBrowserApp.#table,
      previous: FoodBrowserApp.#previous,
      next: FoodBrowserApp.#next,
      preview: FoodBrowserApp.#preview,
      give: FoodBrowserApp.#give,
      consume: FoodBrowserApp.#consume,
      serve: FoodBrowserApp.#serve,
      changeImage: FoodBrowserApp.#changeImage,
      resetImage: FoodBrowserApp.#resetImage,
      savePreset: FoodBrowserApp.#savePreset,
      loadPreset: FoodBrowserApp.#loadPreset
    }
  };

  static PARTS = {
    filters: { template: `modules/${MODULE_ID}/templates/food-browser-filters.hbs` },
    results: { template: `modules/${MODULE_ID}/templates/food-browser-results.hbs`, scrollable: [".rts-food-grid", ".rts-table-scroll"] }
  };

  async _prepareContext() {
    const options = await contentLibrary.metadataOptions();
    const foods = (await contentLibrary.queryFoods(this.#filters)).sort((a, b) => compareFoods(a, b, this.#filters.sort));
    const pages = Math.max(1, Math.ceil(foods.length / PAGE_SIZE));
    this.#page = Math.min(this.#page, pages);
    const start = (this.#page - 1) * PAGE_SIZE;
    const results = foods.slice(start, start + PAGE_SIZE).map(food => this.#viewModel(food));
    const presets = game.user.getFlag(FLAG_SCOPE, "browserPresets") ?? {};
    return {
      filters: this.#filters,
      options,
      results,
      total: foods.length,
      page: this.#page,
      pages,
      hasPrevious: this.#page > 1,
      hasNext: this.#page < pages,
      cardView: this.#view === "cards",
      tableView: this.#view === "table",
      isGM: game.user.isGM,
      adapterAvailable: systemAdapterService.status().available,
      presets: Object.entries(presets).map(([id, preset]) => ({ id, name: preset.name }))
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const form = this.element.querySelector("form.rts-browser-filters");
    if (form && !form.dataset.rtsBound) {
      form.dataset.rtsBound = "true";
      form.addEventListener("input", () => this.#readFilters(form));
      form.addEventListener("change", () => this.#readFilters(form));
    }
    if (!game.user.isGM) return;
    for (const draggable of this.element.querySelectorAll("[data-food-source-id]")) {
      if (draggable.dataset.rtsDragBound) continue;
      draggable.dataset.rtsDragBound = "true";
      draggable.addEventListener("dragstart", event => {
        event.dataTransfer.setData("text/plain", JSON.stringify({ type: "OBTSFood", sourceId: draggable.dataset.foodSourceId }));
      });
    }
  }

  #readFilters(form) {
    const data = new FormDataExtended(form).object;
    this.#filters = { ...this.#filters, ...data };
    this.#page = 1;
    this.render({ parts: ["results"] });
  }

  #viewModel(food) {
    const meta = getFoodMeta(food);
    const mechanics = getMechanics(food);
    const sourceId = getModuleFlags(food).sourceId;
    return {
      sourceId,
      name: food.name,
      img: food.img,
      imageOverridden: Boolean(imageOverrideService.get(sourceId)),
      tier: meta.tier,
      tierLabel: meta.tierLabel,
      region: meta.originRegion,
      settlement: meta.originSettlement,
      venue: (meta.typicalVenue ?? []).join(", "),
      consumers: [...(meta.usualConsumers ?? []), ...(meta.preferredConsumers ?? [])].join(", "),
      price: `${meta.purchasePrice?.value ?? 0} ${meta.purchasePrice?.denomination ?? "cp"}`,
      rarity: meta.rarity,
      legality: !game.user.isGM && game.settings.get(MODULE_ID, SETTINGS.hideImperialClassifications)
        ? game.i18n.localize(`${MODULE_ID}.Common.Hidden`)
        : meta.legality,
      summary: mechanics.summary,
      activeEffect: meta.activeEffect,
      servings: meta.servings,
      unidentified: meta.identificationStatus === "unidentified"
    };
  }

  async #sourceFromAction(target, options = {}) {
    return contentLibrary.sourceById(target.closest("[data-source-id]")?.dataset.sourceId, { localized: true, ...options });
  }

  static #reset() {
    this.#filters = { ...EMPTY_FILTERS };
    this.#page = 1;
    this.render({ force: true });
  }

  static #cards() { this.#view = "cards"; this.render({ parts: ["results"] }); }
  static #table() { this.#view = "table"; this.render({ parts: ["results"] }); }
  static #previous() { this.#page = Math.max(1, this.#page - 1); this.render({ parts: ["results"] }); }
  static #next() { this.#page += 1; this.render({ parts: ["results"] }); }

  static async #preview(event, target) {
    const sourceId = target.closest("[data-source-id]")?.dataset.sourceId;
    if (!sourceId) return;
    detailApp ??= new FoodDetailApp();
    detailApp.setSourceId(sourceId).render(true);
  }

  static async #give(event, target) {
    const definition = await this.#sourceFromAction(target);
    const actor = canvas.tokens?.controlled?.[0]?.actor ?? game.user.character;
    if (!actor) return ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.Errors.NoTargets`));
    try {
      const source = await systemAdapterService.materializeFood(definition, { purpose: "give", actor });
      await actor.createEmbeddedDocuments("Item", [source], { keepId: false });
      ui.notifications.info(game.i18n.format(`${MODULE_ID}.Browser.AddedToActor`, { food: definition.name, actor: actor.name }));
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }

  static async #consume(event, target) {
    const source = await this.#sourceFromAction(target);
    const actor = canvas.tokens?.controlled?.[0]?.actor ?? game.user.character;
    if (!actor) return ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.Errors.NoTargets`));
    try {
      await game[MODULE_ID].consume(source, actor, { reduceServings: false });
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }

  static async #serve(event, target) {
    const source = await this.#sourceFromAction(target);
    const actors = [...new Map((canvas.tokens?.controlled ?? []).map(token => [token.actor?.uuid, token.actor])).values()].filter(Boolean);
    if (!actors.length) return ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.Errors.NoTargets`));
    try {
      await game[MODULE_ID].serve(source, actors, { reduceServings: false, sharedMealId: foundry.utils.randomID() });
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }

  static async #changeImage(event, target) {
    if (!game.user.isGM) return;
    const sourceId = target.closest("[data-source-id]")?.dataset.sourceId;
    const source = await contentLibrary.sourceById(sourceId, { localized: true });
    if (!source) return;
    const changed = await imageOverrideService.choose(sourceId, source.img);
    if (changed) this.render({ parts: ["results"] });
  }

  static async #resetImage(event, target) {
    if (!game.user.isGM) return;
    const sourceId = target.closest("[data-source-id]")?.dataset.sourceId;
    const packaged = await contentLibrary.sourceById(sourceId, { localized: false, applyImageOverrides: false });
    if (!packaged) return;
    await imageOverrideService.reset(sourceId, packaged.img);
    this.render({ parts: ["results"] });
  }

  static async #savePreset() {
    const name = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize(`${MODULE_ID}.Browser.SavePreset`) },
      content: `<input type="text" name="name" required aria-label="${game.i18n.localize(`${MODULE_ID}.Browser.PresetName`)}">`,
      ok: {
        label: game.i18n.localize(`${MODULE_ID}.Common.Save`),
        callback: (_event, button, dialog) => new FormDataExtended(dialog.element.querySelector("form")).object.name
      }
    });
    if (!name) return;
    const presets = foundry.utils.deepClone(game.user.getFlag(FLAG_SCOPE, "browserPresets") ?? {});
    presets[foundry.utils.slugify(name)] = { name, filters: this.#filters, view: this.#view };
    await game.user.setFlag(FLAG_SCOPE, "browserPresets", presets);
    this.render({ force: true });
  }

  static async #loadPreset(event, target) {
    const id = target.closest("[data-preset-id]")?.dataset.presetId;
    const preset = game.user.getFlag(FLAG_SCOPE, "browserPresets")?.[id];
    if (!preset) return;
    this.#filters = { ...this.#filters, ...preset.filters };
    this.#view = preset.view ?? "cards";
    this.#page = 1;
    this.render({ force: true });
  }
}


class FoodDetailApp extends PersistentApplication {
  #sourceId = null;

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-food-detail`,
    classes: ["rts", "rts-food-detail-app"],
    tag: "section",
    position: { width: 760, height: 720 },
    window: { title: `${MODULE_ID}.Detail.Title`, icon: "fa-solid fa-bowl-food", resizable: true }
  };

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/food-detail.hbs`, scrollable: [".rts-food-detail-scroll"] }
  };

  setSourceId(sourceId) {
    this.#sourceId = String(sourceId ?? "");
    return this;
  }

  async _prepareContext() {
    const food = await contentLibrary.sourceById(this.#sourceId, { localized: true });
    if (!food) return { missing: true };
    const meta = getFoodMeta(food);
    const mechanics = getMechanics(food);
    const unidentified = !game.user.isGM && meta.identificationStatus === "unidentified";
    return {
      missing: false,
      isGM: game.user.isGM,
      adapterAvailable: systemAdapterService.status().available,
      sourceId: getModuleFlags(food).sourceId,
      name: food.name,
      img: food.img,
      tier: meta.tier,
      region: meta.originRegion,
      settlement: meta.originSettlement,
      culture: meta.culture,
      venue: (meta.typicalVenue ?? []).join(", "),
      consumers: [...(meta.usualConsumers ?? []), ...(meta.preferredConsumers ?? [])].join(", "),
      rarity: meta.rarity,
      price: `${meta.purchasePrice?.value ?? 0} ${meta.purchasePrice?.denomination ?? "cp"}`,
      legality: meta.legality,
      ingredients: (meta.ingredients ?? []).join(", "),
      dietary: (meta.dietaryProperties ?? []).join(", "),
      preparationTime: meta.preparationTime,
      shelfLife: meta.shelfLife,
      servings: meta.servings,
      mechanicalSummary: unidentified ? "" : mechanics.summary,
      description: unidentified ? (food.unidentifiedDescription ?? "") : visibleDescription(food.description, game.user.isGM)
    };
  }
}

function visibleDescription(html, isGM) {
  if (isGM || !html) return html ?? "";
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  for (const secret of wrapper.querySelectorAll(".secret")) secret.remove();
  return wrapper.innerHTML;
}
