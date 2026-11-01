import { MODULE_ID, SETTINGS } from "../constants.mjs";
import { PersistentApplication } from "./base-app.mjs";

export class WindowGeometryApp extends PersistentApplication {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-window-geometry`,
    classes: ["obts", "obts-window-geometry"],
    tag: "section",
    position: { width: 620, height: 420 },
    window: { title: `${MODULE_ID}.WindowGeometry.Title`, icon: "fa-solid fa-up-right-and-down-left-from-center", resizable: true },
    actions: {
      resetSizes: WindowGeometryApp.#resetSizes,
      resetPositions: WindowGeometryApp.#resetPositions,
      resetAll: WindowGeometryApp.#resetAll
    }
  };

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/window-geometry.hbs`, scrollable: [".obts-window-geometry-scroll"] }
  };

  async _prepareContext() {
    const state = game.settings.get(MODULE_ID, SETTINGS.windowState) ?? {};
    return { savedWindows: Object.keys(state).length };
  }

  static async #resetSizes() {
    await updateAllGeometry({ size: true, position: false });
    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.WindowGeometry.SizeReset`));
    this.render({ force: true });
  }

  static async #resetPositions() {
    await updateAllGeometry({ size: false, position: true });
    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.WindowGeometry.PositionReset`));
    this.render({ force: true });
  }

  static async #resetAll() {
    await game.settings.set(MODULE_ID, SETTINGS.windowState, {});
    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.WindowGeometry.AllReset`));
    this.render({ force: true });
  }
}

async function updateAllGeometry({ size, position }) {
  const state = foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTINGS.windowState) ?? {});
  for (const [appId, geometry] of Object.entries(state)) {
    if (size) {
      delete geometry.width;
      delete geometry.height;
    }
    if (position) {
      delete geometry.left;
      delete geometry.top;
    }
    if (!Object.keys(geometry).length) delete state[appId];
  }
  await game.settings.set(MODULE_ID, SETTINGS.windowState, state);
}
