import { APP_IDS, MODULE_ID } from "../constants.mjs";
import { diagnosticsService } from "../services/diagnostics-service.mjs";
import { importExportService } from "../services/import-export-service.mjs";
import { PersistentApplication } from "./base-app.mjs";

export class DiagnosticsApp extends PersistentApplication {
  #report = null;
  #busy = false;

  static DEFAULT_OPTIONS = {
    id: APP_IDS.diagnostics,
    classes: ["obts", "obts-diagnostics"],
    tag: "section",
    position: { width: 900, height: 720 },
    window: { title: `${MODULE_ID}.Diagnostics.Title`, icon: "fa-solid fa-stethoscope", resizable: true },
    actions: {
      run: DiagnosticsApp.#run,
      export: DiagnosticsApp.#export
    }
  };

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/diagnostics.hbs`, scrollable: [".obts-diagnostics-scroll"] }
  };

  async _prepareContext() {
    if (!this.#report && game.user.isGM) this.#report = await diagnosticsService.run({ persist: false });
    return { isGM: game.user.isGM, busy: this.#busy, report: this.#report };
  }

  static async #run() {
    if (!game.user.isGM) return;
    this.#busy = true;
    this.render({ force: true });
    try {
      this.#report = await diagnosticsService.run({ persist: true });
    } catch (error) {
      this.#report = { findings: [{ severity: "error", code: "DIAGNOSTICS_FAILURE", message: error.message }], summary: { errors: 1, warnings: 0, info: 0, ok: false } };
    } finally {
      this.#busy = false;
      this.render({ force: true });
    }
  }

  static #export() {
    if (!this.#report) return;
    const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
    importExportService.download(this.#report, `${MODULE_ID}-diagnostics-${stamp}.json`);
  }
}
