import { APP_IDS, MODULE_ID } from "../constants.mjs";
import { getFoodMeta, getModuleFlags } from "../lib/utils.mjs";
import { contentLibrary } from "../services/content-library.mjs";
import { menuService } from "../services/menu-service.mjs";
import { systemAdapterService } from "../services/system-adapter-service.mjs";
import { PersistentApplication } from "./base-app.mjs";

export class MenuGeneratorApp extends PersistentApplication {
  #menu = null;
  #config = { region: "*", settlement: "*", venue: "*", quality: "ordinary", socialClass: "*", season: "*", prosperity: "ordinary", scarcity: "normal", militaryPresence: "normal", culturalInfluence: "*", count: 8, maxTier: "2", includeDrinks: true, includeIllicit: false, includeLegendary: false, priceMultiplier: 1 };

  static DEFAULT_OPTIONS = {
    id: APP_IDS.generator,
    classes: ["rts", "rts-generator"],
    tag: "section",
    position: { width: 900, height: 720 },
    window: { title: `${MODULE_ID}.Generator.Title`, icon: "fa-solid fa-shop", resizable: true },
    actions: {
      generate: MenuGeneratorApp.#generate,
      journal: MenuGeneratorApp.#journal,
      clear: MenuGeneratorApp.#clear,
      add: MenuGeneratorApp.#add
    }
  };

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/menu-generator.hbs` }
  };

  async _prepareContext() {
    const options = await contentLibrary.metadataOptions();
    return {
      config: this.#config,
      options,
      menu: this.#menu ? {
        ...this.#menu,
        rows: this.#menu.foods.map(food => {
          const meta = getFoodMeta(food);
          const price = meta.generatedPrice ?? meta.purchasePrice;
          return { sourceId: getModuleFlags(food).sourceId, name: food.name, img: food.img, tier: meta.tier, origin: `${meta.originSettlement}, ${meta.originRegion}`, price: `${price.value} ${price.denomination}` };
        })
      } : null,
      isGM: game.user.isGM
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const form = this.element.querySelector("form.rts-generator-form");
    form?.addEventListener("change", () => {
      this.#config = { ...this.#config, ...new FormDataExtended(form).object };
    });
  }

  static async #generate() {
    const form = this.element.querySelector("form.rts-generator-form");
    this.#config = { ...this.#config, ...new FormDataExtended(form).object };
    try {
      this.#menu = await menuService.generate(this.#config);
      this.render({ force: true });
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }

  static async #journal() {
    if (!this.#menu) return;
    const journal = await menuService.createJournal(this.#menu);
    journal.sheet.render(true);
  }

  static #clear() { this.#menu = null; this.render({ force: true }); }

  static async #add(event, target) {
    const sourceId = target.closest("[data-source-id]")?.dataset.sourceId;
    const definition = await contentLibrary.sourceById(sourceId, { localized: true });
    const actor = canvas.tokens?.controlled?.[0]?.actor ?? game.user.character;
    if (!definition || !actor) return ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.Errors.NoTargets`));
    try {
      const source = await systemAdapterService.materializeFood(definition, { purpose: "menu-give", actor });
      await actor.createEmbeddedDocuments("Item", [source], { keepId: false });
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }
}
