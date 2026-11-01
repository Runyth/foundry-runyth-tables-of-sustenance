import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("feature version and current Foundry v13 verification are coherent", async () => {
  const manifest = JSON.parse(await read("module.json"));
  const pkg = JSON.parse(await read("package.json"));
  const constants = await read("scripts/constants.mjs");
  assert.equal(manifest.version, "1.1.1");
  assert.equal(pkg.version, "1.1.1");
  assert.equal(manifest.compatibility.verified, "13.351");
  assert.match(constants, /MODULE_VERSION = "1\.1\.1"/u);
});

test("dashboard cards use content-sized responsive geometry", async () => {
  const css = await read("styles/runyth-tables-of-sustenance.css");
  assert.match(css, /repeat\(auto-fit,minmax\(min\(280px,100%\),1fr\)\)/u);
  assert.match(css, /\.rts-dashboard-grid \{[^}]*grid-auto-rows: 1fr/u);
  assert.match(css, /\.rts-dashboard-card[\s\S]*grid-template-columns: 48px minmax\(0,1fr\) auto/u);
  assert.match(css, /white-space: normal/u);
  assert.match(css, /overflow-wrap: anywhere/u);
});

test("browser keeps the search input stable through partial results rendering", async () => {
  const browser = await read("scripts/apps/food-browser-app.mjs");
  assert.match(browser, /PARTS = \{[\s\S]*filters:[\s\S]*results:/u);
  assert.match(browser, /render\(\{ parts: \["results"\] \}\)/u);
  assert.doesNotMatch(browser, /render\(\{ force: true \}\);\s*\/\/\s*search/u);
});

test("food cards expose GM image overrides and reset controls", async () => {
  const template = await read("templates/food-browser-results.hbs");
  const service = await read("scripts/services/image-override-service.mjs");
  assert.match(template, /data-action="changeImage"/u);
  assert.match(template, /data-action="resetImage"/u);
  assert.match(service, /foundry\.applications\.apps\.FilePicker\.implementation/u);
  assert.match(service, /syncAllImported/u);
});

test("window geometry is client scoped, clamped and separately resettable", async () => {
  const settings = await read("scripts/settings.mjs");
  const base = await read("scripts/apps/base-app.mjs");
  const geometry = await read("scripts/apps/window-geometry-app.mjs");
  assert.match(settings, /SETTINGS\.windowState[^\n]*scope: "client"/u);
  assert.match(base, /clampSavedPosition/u);
  assert.match(base, /addEventListener\("position"/u);
  assert.match(base, /resetGeometry\(\{ size = true, position = true \}/u);
  assert.match(geometry, /resetSizes/u);
  assert.match(geometry, /resetPositions/u);
});

test("import export and diagnostics are first-class ApplicationV2 tools", async () => {
  const settings = await read("scripts/settings.mjs");
  const api = await read("scripts/api.mjs");
  assert.match(settings, /registerMenu\("importExport"/u);
  assert.match(settings, /registerMenu\("diagnostics"/u);
  assert.match(api, /importExport: \(\) => singleton/u);
  assert.match(api, /diagnostics: \(\) => singleton/u);
});

test("import export uses strict module-managed provenance", async () => {
  const transfer = await read("scripts/services/import-export-service.mjs");
  const compendia = await read("scripts/services/compendium-service.mjs");
  assert.match(transfer, /flags\.import\?\.importedAt \|\| flags\.import\?\.packagedHash \|\| flags\.import\?\.managed/u);
  assert.match(transfer, /sourceKind !== expectedKind/u);
  assert.match(compendia, /flags\.kind === expectedKind/u);
  assert.match(compendia, /managed: true/u);
});

test("complementary provider API is additive and namespaced", async () => {
  const api = await read("scripts/api.mjs");
  const registry = await read("scripts/services/registry.mjs");
  assert.match(api, /const extensions = Object\.freeze/u);
  assert.match(api, /registerProvider/u);
  assert.match(api, /registerFoods/u);
  assert.match(api, /getRegisteredFoods/u);
  assert.match(api, /whenReady/u);
  assert.match(api, /hooks: Object\.freeze/u);
  assert.match(registry, /providerId !== providerId/u);
  assert.match(registry, /TIERS\.includes/u);
});

test("complementary foods flow into browser queries and content importing", async () => {
  const library = await read("scripts/services/content-library.mjs");
  const compendia = await read("scripts/services/compendium-service.mjs");
  assert.match(library, /includeExtensions = true/u);
  assert.match(library, /registry\.foods\(\)/u);
  assert.match(compendia, /includeExtensions: true/u);
});

test("diagnostics cover extensions, duplicate IDs and image overrides", async () => {
  const diagnostics = await read("scripts/services/diagnostics-service.mjs");
  assert.match(diagnostics, /DUPLICATE_SOURCE_ID/u);
  assert.match(diagnostics, /imageOverrideService\.validateOverrides/u);
  assert.match(diagnostics, /extensions: \{ providers, foods:/u);
  assert.match(diagnostics, /diagnosticsHistory/u);
});

test("new module interfaces have scoped responsive accessibility styling", async () => {
  const css = await read("styles/runyth-tables-of-sustenance.css");
  assert.match(css, /\.rts button:focus-visible/u);
  assert.match(css, /\.rts-card-actions \{[^}]*grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/u);
  assert.match(css, /@media \(max-width: 640px\)/u);
  assert.match(css, /\.rts-food-card \{[^}]*grid-template-columns: minmax\(112px, 34%\) minmax\(0,1fr\)/u);
});


test("transfer format is system-aware for materialized food Items", async () => {
  const transfer = await read("scripts/services/import-export-service.mjs");
  assert.match(transfer, /const SCHEMA_VERSION = 2/u);
  assert.match(transfer, /SUPPORTED_SCHEMA_VERSIONS/u);
  assert.match(transfer, /payload\.system\?\.id !== game\.system\.id/u);
  assert.match(transfer, /Import the canonical foods through the current system adapter instead/u);
});

test("document sheet controls use the public v13 ApplicationV2 header-control contract", async () => {
  const main = await read("scripts/main.mjs");
  assert.match(main, /Hooks\.on\("getHeaderControlsApplicationV2", addDocumentSheetControls\)/u);
  assert.match(main, /document\.sheet !== app/u);
  assert.match(main, /action: "rts-consume-food"/u);
  assert.match(main, /action: "rts-food-benefits"/u);
  assert.doesNotMatch(main, /renderItemSheet(?:V2)?/u);
  assert.doesNotMatch(main, /renderActorSheet(?:V2)?/u);
  assert.doesNotMatch(main, /_getHeaderButtons/u);
});


test("system-neutral dashboards expose adapter readiness without blocking narrative tools", async () => {
  const dashboard = await read("scripts/apps/dashboard-app.mjs");
  const manager = await read("scripts/apps/content-manager-app.mjs");
  const dashboardTemplate = await read("templates/dashboard.hbs");
  const managerTemplate = await read("templates/content-manager.hbs");
  assert.match(dashboard, /systemAdapterService\.status\(\)/u);
  assert.match(dashboardTemplate, /adapterAvailable/u);
  assert.match(manager, /adapterAvailable: systemAdapterService\.status\(\)\.available/u);
  assert.match(managerTemplate, /AdapterRequiredForFoods/u);
  assert.match(managerTemplate, /value="foods" \{\{#if adapterAvailable\}\}checked\{\{else\}\}disabled/u);
});

test("system adapter ownership cannot be silently replaced by another module", async () => {
  const registry = await read("scripts/services/registry.mjs");
  assert.match(registry, /existing\.moduleId !== requestedModuleId/u);
  assert.match(registry, /already owned by \$\{existing\.moduleId\}:\$\{existing\.id\}/u);
});

test("food browsing and preview remain useful without a game-system adapter", async () => {
  const browser = await read("scripts/apps/food-browser-app.mjs");
  const results = await read("templates/food-browser-results.hbs");
  assert.match(browser, /new FoodDetailApp\(\)/u);
  assert.match(browser, /adapterAvailable: systemAdapterService\.status\(\)\.available/u);
  assert.doesNotMatch(browser, /materializeFood\(definition, \{ purpose: "preview"/u);
  assert.match(results, /data-action="give"[^>]*adapterAvailable/u);
  assert.match(results, /data-action="consume"[^>]*adapterAvailable/u);
  assert.match(results, /data-action="serve"[^>]*adapterAvailable/u);
  assert.match(browser, /class FoodDetailApp extends PersistentApplication/u);
  assert.match(browser, /visibleDescription/u);
  assert.match(browser, /querySelectorAll\("\.secret"\)/u);
  assert.doesNotMatch(browser, /from "\.\/food-detail-app\.mjs"/u);
});


test("sidebar discovery uses the documented generic ApplicationV2 render hook", async () => {
  const main = await read("scripts/main.mjs");
  assert.match(main, /Hooks\.on\("renderApplicationV2"/u);
  assert.match(main, /foundry\.applications\.sidebar\.tabs\.ItemDirectory/u);
  assert.match(main, /app instanceof ItemDirectory/u);
  assert.doesNotMatch(main, /Hooks\.on\("renderItemDirectory"/u);
});

test("catalogue definitions cannot be forged into player inventory or free player servings", async () => {
  const browser = await read("scripts/apps/food-browser-app.mjs");
  const main = await read("scripts/main.mjs");
  const consumption = await read("scripts/services/consumption-service.mjs");
  const socket = await read("scripts/services/socket-service.mjs");
  assert.match(browser, /if \(!game\.user\.isGM\) return;/u);
  assert.match(main, /if \(!game\.user\.isGM\) return true;/u);
  assert.match(consumption, /assertConsumableSource\(food\)/u);
  assert.match(consumption, /food\?\.parent\?\.documentName === "Actor"/u);
  assert.match(socket, /testUserPermission\(user, ownerLevel\)/u);
  assert.match(socket, /InventoryFoodRequired/u);
});
