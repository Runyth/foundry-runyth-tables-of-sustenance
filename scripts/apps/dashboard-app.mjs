// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { APP_IDS, MODULE_ID } from "../constants.mjs";
import { contentLibrary } from "../services/content-library.mjs";
import { registry } from "../services/registry.mjs";
import { systemAdapterService } from "../services/system-adapter-service.mjs";
import { PersistentApplication } from "./base-app.mjs";

export class DashboardApp extends PersistentApplication {
  static DEFAULT_OPTIONS = {
    id: APP_IDS.dashboard,
    classes: ["rts", "rts-dashboard"],
    tag: "section",
    position: { width: 980, height: 720 },
    window: { title: `${MODULE_ID}.Dashboard.Title`, icon: "fa-solid fa-utensils", resizable: true },
    actions: {
      browser: DashboardApp.#browser,
      generator: DashboardApp.#generator,
      manager: DashboardApp.#manager,
      composer: DashboardApp.#composer,
      transfer: DashboardApp.#transfer,
      diagnostics: DashboardApp.#diagnostics,
      resetSize: DashboardApp.#resetSize,
      resetPosition: DashboardApp.#resetPosition
    }
  };

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/dashboard.hbs`, scrollable: [".rts-dashboard-scroll"] }
  };

  async _prepareContext() {
    const index = await contentLibrary.index().catch(() => null);
    const adapterStatus = systemAdapterService.status();
    return {
      isGM: game.user.isGM,
      systemTitle: game.system.title ?? game.system.id,
      systemVersion: game.system.version ?? "",
      adapterAvailable: adapterStatus.available,
      adapterName: adapterStatus.adapter?.displayName ?? adapterStatus.adapter?.id ?? "",
      moduleVersion: game.modules.get(MODULE_ID)?.version ?? "",
      foodCount: index?.counts?.foods ?? 335,
      recipeCount: index?.counts?.recipes ?? 190,
      tableCount: index?.counts?.tables ?? 12,
      providerCount: registry.providers().length,
      extensionFoodCount: registry.foods().length
    };
  }

  static #browser() { game[MODULE_ID].apps.browser().render(true); }
  static #generator() { game[MODULE_ID].apps.generator().render(true); }
  static #manager() { game[MODULE_ID].apps.manager().render(true); }
  static #composer() { game[MODULE_ID].apps.composer().render(true); }
  static #transfer() { game[MODULE_ID].apps.importExport().render(true); }
  static #diagnostics() { game[MODULE_ID].apps.diagnostics().render(true); }
  static #resetSize() { this.resetGeometry({ size: true, position: false }); }
  static #resetPosition() { this.resetGeometry({ size: false, position: true }); }
}
