import { APP_IDS, MODULE_ID } from "../constants.mjs";
import { importExportService } from "../services/import-export-service.mjs";
import { PersistentApplication } from "./base-app.mjs";

export class ImportExportApp extends PersistentApplication {
  #payload = null;
  #preview = null;
  #report = null;
  #busy = false;

  static DEFAULT_OPTIONS = {
    id: APP_IDS.transfer,
    classes: ["rts", "rts-transfer"],
    tag: "section",
    position: { width: 860, height: 700 },
    window: { title: `${MODULE_ID}.Transfer.Title`, icon: "fa-solid fa-right-left", resizable: true },
    actions: {
      export: ImportExportApp.#export,
      chooseFile: ImportExportApp.#chooseFile,
      apply: ImportExportApp.#apply,
      clear: ImportExportApp.#clear
    }
  };

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/import-export.hbs`, scrollable: [".rts-transfer-scroll"] }
  };

  async _prepareContext() {
    return { isGM: game.user.isGM, busy: this.#busy, preview: this.#preview, report: this.#report, reportJson: this.#report ? JSON.stringify(this.#report, null, 2) : "" };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const input = this.element.querySelector("input[data-rts-import-file]");
    input?.addEventListener("change", async event => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      try {
        this.#payload = JSON.parse(await file.text());
        this.#preview = importExportService.preview(this.#payload);
        this.#report = null;
      } catch (error) {
        this.#payload = null;
        this.#preview = null;
        this.#report = { errors: [{ message: error.message }] };
      }
      this.render({ force: true });
    }, { once: true });
  }

  #formData() {
    const form = this.element.querySelector("form.rts-transfer-form");
    return new FormDataExtended(form).object;
  }

  static async #export() {
    if (!game.user.isGM) return;
    this.#busy = true;
    this.render({ force: true });
    try {
      const data = this.#formData();
      const payload = await importExportService.exportData({
        includeSettings: Boolean(data.exportSettings),
        includeImageOverrides: Boolean(data.exportImages),
        includeManagedContent: Boolean(data.exportContent)
      });
      const date = new Date().toISOString().slice(0, 10);
      importExportService.download(payload, `${MODULE_ID}-${date}.json`);
      this.#report = { exported: true, settings: Object.keys(payload.settings ?? {}).length, images: Object.keys(payload.imageOverrides ?? {}).length, content: Object.values(payload.managedContent ?? {}).reduce((sum, rows) => sum + rows.length, 0), errors: [] };
    } catch (error) {
      this.#report = { errors: [{ message: error.message }] };
    } finally {
      this.#busy = false;
      this.render({ force: true });
    }
  }

  static #chooseFile() {
    this.element.querySelector("input[data-rts-import-file]")?.click();
  }

  static async #apply() {
    if (!game.user.isGM || !this.#payload) return;
    const data = this.#formData();
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize(`${MODULE_ID}.Transfer.ImportTitle`) },
      content: `<p>${game.i18n.localize(`${MODULE_ID}.Transfer.ImportWarning`)}</p>`,
      yes: { label: game.i18n.localize(`${MODULE_ID}.Transfer.Apply`) },
      no: { label: game.i18n.localize(`${MODULE_ID}.Common.Cancel`) }
    });
    if (!confirmed) return;
    this.#busy = true;
    this.render({ force: true });
    try {
      this.#report = await importExportService.importData(this.#payload, {
        importSettings: Boolean(data.importSettings),
        importImageOverrides: Boolean(data.importImages),
        importManagedContent: Boolean(data.importContent),
        overwriteManagedContent: Boolean(data.overwriteContent)
      });
      if (!this.#report.errors?.length) ui.notifications.info(game.i18n.localize(`${MODULE_ID}.Transfer.ImportComplete`));
    } catch (error) {
      this.#report = { errors: [{ message: error.message }] };
    } finally {
      this.#busy = false;
      this.render({ force: true });
    }
  }

  static #clear() {
    this.#payload = null;
    this.#preview = null;
    this.#report = null;
    this.render({ force: true });
  }
}
