// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { APP_IDS, MODULE_ID } from "../constants.mjs";
import { contentLibrary } from "../services/content-library.mjs";
import { compendiumService } from "../services/compendium-service.mjs";
import { systemAdapterService } from "../services/system-adapter-service.mjs";
import { PersistentApplication } from "./base-app.mjs";

export class ContentManagerApp extends PersistentApplication {
  #preview = null;
  #report = null;
  #progress = null;
  #controller = null;
  #busy = false;

  static DEFAULT_OPTIONS = {
    id: APP_IDS.manager,
    classes: ["rts", "rts-manager"],
    tag: "section",
    position: { width: 900, height: 720 },
    window: { title: `${MODULE_ID}.Manager.Title`, icon: "fa-solid fa-box-archive", resizable: true },
    actions: {
      preview: ContentManagerApp.#previewAction,
      import: ContentManagerApp.#importAction,
      remove: ContentManagerApp.#removeAction,
      cancel: ContentManagerApp.#cancelAction,
      refresh: ContentManagerApp.#refreshAction
    }
  };

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/content-manager.hbs` }
  };

  async _prepareContext() {
    const metadata = await contentLibrary.metadataOptions();
    return {
      metadata,
      preview: this.#preview,
      report: this.#report,
      reportJson: this.#report ? JSON.stringify(this.#report, null, 2) : null,
      progress: this.#progress,
      busy: this.#busy,
      isGM: game.user.isGM,
      adapterAvailable: systemAdapterService.status().available
    };
  }

  #options() {
    const form = this.element.querySelector("form.rts-manager-form");
    const data = new FormDataExtended(form).object;
    return {
      kinds: arrayValue(data.kinds),
      tiers: arrayValue(data.tiers),
      regions: arrayValue(data.regions),
      cultures: arrayValue(data.cultures),
      categories: arrayValue(data.categories),
      preserveEdited: Boolean(data.preserveEdited),
      localized: Boolean(data.localized),
      force: Boolean(data.force)
    };
  }

  static async #previewAction() {
    this.#busy = true;
    this.#report = null;
    this.render({ force: true });
    try {
      this.#preview = await compendiumService.preview(this.#options());
    } catch (error) {
      this.#report = { errors: [{ message: error.message }] };
    } finally {
      this.#busy = false;
      this.render({ force: true });
    }
  }

  static async #importAction() {
    this.#busy = true;
    this.#controller = new AbortController();
    this.#report = null;
    this.#progress = { completed: 0, total: 1, percent: 0 };
    this.render({ force: true });
    try {
      this.#report = await compendiumService.importContent({ ...this.#options(), signal: this.#controller.signal }, progress => {
        this.#progress = { ...progress, percent: progress.total ? Math.round(progress.completed / progress.total * 100) : 0 };
        this.render({ force: true });
      });
      if (!this.#report.errors?.length && !this.#report.cancelled) {
        ui.notifications.info(game.i18n.localize(`${MODULE_ID}.Manager.ImportComplete`));
      }
    } catch (error) {
      this.#report = { errors: [{ message: error.message }] };
    } finally {
      this.#busy = false;
      this.#controller = null;
      this.render({ force: true });
    }
  }

  static async #removeAction() {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      classes: windowClasses(["rts-confirm-dialog"]),
      window: { title: game.i18n.localize(`${MODULE_ID}.Manager.RemoveTitle`) },
      content: `<p>${game.i18n.localize(`${MODULE_ID}.Manager.RemoveWarning`)}</p>`,
      yes: { label: game.i18n.localize(`${MODULE_ID}.Common.Remove`) },
      no: { label: game.i18n.localize(`${MODULE_ID}.Common.Cancel`) }
    });
    if (!confirmed) return;
    this.#busy = true;
    this.#controller = new AbortController();
    this.render({ force: true });
    try {
      const options = this.#options();
      const sourceIds = await compendiumService.selectedSourceIds(options);
      this.#report = await compendiumService.removeContent({ kinds: options.kinds, sourceIds, signal: this.#controller.signal });
    } catch (error) {
      this.#report = { errors: [{ message: error.message }] };
    } finally {
      this.#busy = false;
      this.#controller = null;
      this.render({ force: true });
    }
  }

  static #cancelAction() { this.#controller?.abort(); }
  static #refreshAction() { this.#preview = null; this.#report = null; this.render({ force: true }); }
}

function arrayValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return [value];
}
