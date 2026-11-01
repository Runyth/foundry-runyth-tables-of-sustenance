import { FLAG_SCOPE, HOOKS, MODULE_ID } from "./constants.mjs";
import { api, exposeApi } from "./api.mjs";
import { ContentManagerApp } from "./apps/content-manager-app.mjs";
import { DashboardApp } from "./apps/dashboard-app.mjs";
import { DiagnosticsApp } from "./apps/diagnostics-app.mjs";
import { ImportExportApp } from "./apps/import-export-app.mjs";
import { WindowGeometryApp } from "./apps/window-geometry-app.mjs";
import { contentLibrary } from "./services/content-library.mjs";
import { effectService } from "./services/effect-service.mjs";
import { systemAdapterService } from "./services/system-adapter-service.mjs";
import { registerSettings } from "./settings.mjs";
import { socketService } from "./services/socket-service.mjs";

Hooks.once("init", () => {
  registerSettings({ DashboardApp, ContentManagerApp, ImportExportApp, DiagnosticsApp, WindowGeometryApp });
  exposeApi();
  console.info(`${MODULE_ID} | Initialised v${game.modules.get(MODULE_ID)?.version} as a system-neutral core.`);
});

Hooks.once("ready", async () => {
  socketService.init();
  await contentLibrary.index().catch(error => console.error(`${MODULE_ID} | Content index failed to load`, error));
  Hooks.callAll(HOOKS.apiReady, api);
  console.info(`${MODULE_ID} | Ready for ${game.system.id} ${game.system.version}; system adapter: ${systemAdapterService.current()?.id ?? "none"}.`);
});

Hooks.on("renderApplicationV2", (app, html) => {
  const ItemDirectory = foundry.applications.sidebar.tabs.ItemDirectory;
  if (ItemDirectory && app instanceof ItemDirectory) addSidebarButtons(html);
});
Hooks.on("getHeaderControlsApplicationV2", addDocumentSheetControls);
Hooks.on("dropActorSheetData", handleActorDrop);
Hooks.on("updateWorldTime", cleanupActors);

function addSidebarButtons(html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(`[data-obts-sidebar-buttons]`)) return;
  const header = root.querySelector(".directory-header .header-actions, .directory-header");
  if (!header) return;
  const wrapper = document.createElement("div");
  wrapper.dataset.obtsSidebarButtons = "true";
  wrapper.className = "obts-sidebar-buttons";
  wrapper.innerHTML = `
    <button type="button" data-action="obts-browser" title="${game.i18n.localize(`${MODULE_ID}.Browser.Title`)}"><i class="fa-solid fa-bowl-food"></i><span>${game.i18n.localize(`${MODULE_ID}.Sidebar.Browser`)}</span></button>
    <button type="button" data-action="obts-dashboard" title="${game.i18n.localize(`${MODULE_ID}.Dashboard.Title`)}"><i class="fa-solid fa-utensils"></i><span>${game.i18n.localize(`${MODULE_ID}.Sidebar.Dashboard`)}</span></button>`;
  wrapper.querySelector("[data-action='obts-browser']").addEventListener("click", () => api.apps.browser().render(true));
  wrapper.querySelector("[data-action='obts-dashboard']").addEventListener("click", () => api.apps.dashboard().render(true));
  header.append(wrapper);
}

function addDocumentSheetControls(app, controls) {
  const document = app?.document;
  if (!document || document.sheet !== app) return;

  if (document.documentName === "Item" && foundry.utils.getProperty(document, `flags.${FLAG_SCOPE}.kind`) === "food") {
    if (!controls.some(control => control.action === "obts-consume-food")) {
      controls.unshift({
        action: "obts-consume-food",
        icon: "fa-solid fa-utensils",
        label: `${MODULE_ID}.Common.Consume`,
        onClick: () => {
          void consumeFromItemSheet(document).catch(error => {
            console.error(`${MODULE_ID} | Food consumption from Item sheet failed`, error);
            ui.notifications.error(error.message);
          });
        }
      });
    }
    return;
  }

  if (document.documentName === "Actor" && !controls.some(control => control.action === "obts-food-benefits")) {
    controls.unshift({
      action: "obts-food-benefits",
      icon: "fa-solid fa-seedling",
      label: `${MODULE_ID}.Benefits.Title`,
      onClick: () => api.apps.benefits(document).render(true)
    });
  }
}

async function consumeFromItemSheet(item) {
  const actor = item.parent?.documentName === "Actor" ? item.parent : canvas.tokens?.controlled?.[0]?.actor ?? game.user.character;
  if (!actor) {
    ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.Errors.NoTargets`));
    return;
  }

  const actors = [...new Map((canvas.tokens?.controlled ?? []).map(token => [token.actor?.uuid, token.actor])).values()].filter(Boolean);
  if (actors.length > 1) await api.serve(item, actors, { sharedMealId: foundry.utils.randomID() });
  else await api.consume(item, actor);
}

async function handleActorDrop(actor, _sheet, data) {
  if (data?.type !== "OBTSFood" || !data.sourceId) return true;
  if (!game.user.isGM) return true;
  const definition = await contentLibrary.sourceById(data.sourceId, { localized: true });
  if (!definition) return false;
  try {
    const source = await systemAdapterService.materializeFood(definition, { purpose: "actor-drop", actor });
    await actor.createEmbeddedDocuments("Item", [source], { keepId: false });
  } catch (error) {
    ui.notifications.error(error.message);
  }
  return false;
}

async function cleanupActors() {
  if (!game.user.isGM) return;
  for (const actor of game.actors) {
    if (actor.getFlag(FLAG_SCOPE, "cooldowns") || actor.getFlag(FLAG_SCOPE, "activeFoodEffects")) {
      await effectService.cleanupActor(actor).catch(error => console.error(`${MODULE_ID} | Actor food-effect cleanup failed for ${actor.uuid}`, error));
    }
  }
}
