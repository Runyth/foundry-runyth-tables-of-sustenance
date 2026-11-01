import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const moduleId = "runyth-tables-of-sustenance";
const errors = [];
const warnings = [];
const foods = json("data/foods.json");
const recipes = json("data/recipes.json");
const tables = json("data/tables.json");
const manifest = json("module.json");
const packageJson = json("package.json");
const en = json("lang/en.json");
const de = json("lang/de.json");
const flags = source => source.flags?.[moduleId] ?? {};
const meta = source => flags(source).meta ?? {};
const mechanics = source => flags(source).mechanics ?? {};

assert(manifest.id === moduleId, "Manifest id must match the flag namespace.");
assert(manifest.version === packageJson.version, "Manifest and package versions must match.");
const allowedManifestKeys = new Set([
  "id", "title", "description", "version", "authors", "compatibility", "relationships",
  "esmodules", "scripts", "styles", "languages", "socket", "manifest", "download", "license",
  "readme", "bugs", "changelog", "url", "media", "packs", "packFolders", "flags",
  "persistentStorage", "protected", "exclusive", "coreTranslation", "documentTypes", "library"
]);
const unknownManifestKeys = Object.keys(manifest).filter(key => !allowedManifestKeys.has(key));
assert(unknownManifestKeys.length === 0, `Unknown Foundry v13 module manifest keys: ${unknownManifestKeys.join(", ")}`);
assert(!manifest.relationships?.systems?.length && !manifest.relationships?.requires?.some(entry => entry.type === "system"), "Core manifest must not require a game system.");
for (const path of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(language => language.path)]) assert(existsSync(join(root, path)), `Manifest path does not exist: ${path}`);

const expected = { "1": 180, "2": 80, "3": 45, "4": 20, "S": 10 };
const counts = Object.fromEntries(Object.keys(expected).map(tier => [tier, foods.filter(food => meta(food).tier === tier).length]));
for (const [tier, count] of Object.entries(expected)) assert(counts[tier] === count, `Tier ${tier} expected ${count}, found ${counts[tier]}.`);
assert(foods.length === 335, `Expected 335 foods, found ${foods.length}.`);
assert(recipes.length >= 190, `Expected at least 190 recipes, found ${recipes.length}.`);
assert(tables.length === 12, `Expected 12 tables, found ${tables.length}.`);
unique(foods.map(food => food._id), "food _id");
unique(foods.map(food => flags(food).sourceId), "food sourceId");
unique(recipes.map(recipe => recipe._id), "recipe _id");
unique(recipes.map(recipe => flags(recipe).sourceId), "recipe sourceId");
unique(tables.map(table => table._id), "table _id");
unique(tables.map(table => flags(table).sourceId), "table sourceId");

const requiredEnglishSections = ["Overview", "Origin", "Availability", "Typical Consumers", "Preparation", "Cultural Meaning", "Mechanical Effect", "Consumption and Cooldown", "Imperial Status", "GM Notes"];
const requiredGermanSections = ["Überblick", "Herkunft", "Verfügbarkeit", "Typische Verbraucher", "Zubereitung", "Kulturelle Bedeutung", "Mechanischer Effekt", "Verzehr und Abklingzeit", "Imperialer Status", "SL-Hinweise"];
const validIntentKinds = new Set(["check-bonus", "resistance-test-bonus", "concentration-test-bonus", "movement-speed-bonus", "ignore-difficult-terrain", "movement-speed-match", "damage-resistance", "maximum-vitality-bonus", "contextual-resistance-test-bonus", "contextual-check-bonus", "rest-recovery-bonus"]);
for (const food of foods) {
  const f = flags(food);
  const m = meta(food);
  const mech = mechanics(food);
  assert(food.type === undefined, `${food.name}: system-neutral food must not define a Foundry Item type.`);
  assert(food.system === undefined, `${food.name}: system-neutral food must not carry a game-system data model.`);
  assert(food.effects === undefined, `${food.name}: system-neutral food must not carry Active Effects.`);
  assert(typeof food.description === "string", `${food.name}: missing neutral description.`);
  assert(Boolean(f.sourceId), `${food.name}: missing sourceId.`);
  assert(f.contentSchema === "system-neutral-food-v1", `${food.name}: missing system-neutral content schema marker.`);
  assert(Boolean(m.originRegion && m.originSettlement && m.culture), `${food.name}: missing origin metadata.`);
  assert(Array.isArray(m.ingredients) && m.ingredients.length > 0, `${food.name}: missing ingredients.`);
  assert(Number(m.servings) >= 1, `${food.name}: invalid servings.`);
  assert(mech.changes === undefined && mech.custom === undefined, `${food.name}: game-system effect implementation leaked into the core.`);
  assert(Array.isArray(mech.effectIntents), `${food.name}: effectIntents must be an array.`);
  for (const intent of mech.effectIntents) assert(validIntentKinds.has(intent.kind), `${food.name}: unknown neutral effect intent ${intent.kind}.`);
  assert(!JSON.stringify(mech).includes("system."), `${food.name}: game-system data path leaked into neutral mechanics.`);
  for (const section of requiredEnglishSections) assert(food.description.includes(section), `${food.name}: missing English section ${section}.`);
  const german = f.localizations?.de?.description ?? "";
  assert(Boolean(f.localizations?.de?.name), `${food.name}: missing German name.`);
  for (const section of requiredGermanSections) assert(german.includes(section), `${food.name}: missing German section ${section}.`);
  const relativeImage = food.img?.replace(`modules/${moduleId}/`, "");
  assert(Boolean(relativeImage && existsSync(join(root, relativeImage))), `${food.name}: missing image ${food.img}.`);
  if (m.tier === "1") {
    assert(mech.effectIntents.length === 0, `${food.name}: Tier 1 must be narrative-only.`);
    assert(!mech.permanent, `${food.name}: Tier 1 cannot be permanent.`);
  }
  if (m.tier === "4") {
    assert(Number(mech.cooldownSeconds) >= 86400, `${food.name}: Tier 4 needs a strong cooldown.`);
    assert(mech.requiresConfirmation === true, `${food.name}: Tier 4 requires confirmation.`);
    assert(mech.stackingGroup === "tier-4", `${food.name}: Tier 4 stacking group missing.`);
    assert(mech.requiresQualifiedCook === true, `${food.name}: Tier 4 qualified-cook restriction missing.`);
    assert(Number(mech.spoilageSeconds) > 0, `${food.name}: Tier 4 spoilage window missing.`);
  }
  if (m.tier === "S") {
    assert(mech.permanent === true, `${food.name}: Tier S must be permanent.`);
    assert(mech.requiresConfirmation === true, `${food.name}: Tier S requires confirmation.`);
    assert(mech.duplicatePolicy === "deny-and-preserve-item", `${food.name}: Tier S duplicate policy invalid.`);
    assert(Boolean(m.legend && m.provenance && m.discoveryConditions), `${food.name}: Tier S legend/provenance/discovery metadata missing.`);
    assert(m.identificationStatus === "unidentified", `${food.name}: Tier S should begin unidentified.`);
    assert(Boolean(food.unidentifiedDescription), `${food.name}: Tier S unidentified description missing.`);
    assert(food.description.includes("once-in-many-sessions narrative reward"), `${food.name}: Tier S campaign warning missing.`);
  }
}

const foodSourceIds = new Set(foods.map(food => flags(food).sourceId));
for (const recipe of recipes) {
  const f = flags(recipe);
  assert(f.kind === "recipe", `${recipe.name}: invalid recipe kind.`);
  assert(foodSourceIds.has(f.foodSourceId), `${recipe.name}: target food sourceId does not exist.`);
  assert(Boolean(f.localizations?.de?.name && f.localizations?.de?.content), `${recipe.name}: German recipe localization missing.`);
  assert(Array.isArray(recipe.pages) && recipe.pages.length > 0, `${recipe.name}: missing journal page.`);
}
for (const table of tables) {
  const f = flags(table);
  assert(f.containsTierSFood === false, `${table.name}: direct Tier S result is forbidden.`);
  assert(Boolean(f.localizations?.de?.name), `${table.name}: German localization missing.`);
  assert(Array.isArray(table.results) && table.results.length > 0, `${table.name}: empty roll table.`);
  assert(table.formula === `1d${table.results.length}`, `${table.name}: formula/result count mismatch.`);
  for (const result of table.results) assert(result.flags?.[moduleId]?.tierSDirectResult !== true, `${table.name}: Tier S direct result found.`);
}
const clueTable = tables.find(table => flags(table).sourceId === "table.legendary-clues");
assert(Boolean(clueTable && flags(clueTable).containsTierSClues), "Legendary clue table is missing.");

const templateKeys = new Set();
for (const file of readdirSync(join(root, "templates"))) {
  const text = readFileSync(join(root, "templates", file), "utf8");
  for (const match of text.matchAll(/runyth-tables-of-sustenance\.([A-Za-z0-9_.]+)/g)) templateKeys.add(match[1]);
}
for (const key of templateKeys) {
  assert(hasPath(en[moduleId], key), `Missing English localization key: ${key}`);
  assert(hasPath(de[moduleId], key), `Missing German localization key: ${key}`);
}
const runtimeText = collectRuntimeText();
assert(!runtimeText.includes('Hooks.on("dnd5e.') && !runtimeText.includes("system.attributes.") && !runtimeText.includes("system.skills.") && !runtimeText.includes("system.abilities."), "D&D-specific runtime implementation leaked into core runtime.");
assert(!runtimeText.includes("globalThis.FilePicker") && !runtimeText.includes("const FilePicker = FilePicker"), "Deprecated global FilePicker usage detected.");
assert(runtimeText.includes("foundry.applications.apps.FilePicker.implementation"), "Image picker must use the configured Foundry v13 FilePicker implementation.");

const report = { generatedAt: new Date().toISOString(), moduleVersion: manifest.version, status: errors.length ? "failed" : "passed", systemNeutral: true, foods: foods.length, recipes: recipes.length, tables: tables.length, counts, tierSDirectRandomGeneration: false, checkedImages: foods.length, checkedLocalizationKeys: templateKeys.size, errors, warnings };
writeFileSync(join(root, "docs/reports/validation-report.json"), `${JSON.stringify(report, null, 2)}\n`);
if (errors.length) { for (const error of errors) console.error(`ERROR: ${error}`); process.exitCode = 1; }
else console.log(`Validated system-neutral core: ${foods.length} foods, ${recipes.length} recipes, ${tables.length} tables, ${templateKeys.size} UI localization keys, all artwork, and zero D&D runtime data paths.`);

function json(path) { return JSON.parse(readFileSync(join(root, path), "utf8")); }
function assert(condition, message) { if (!condition) errors.push(message); }
function unique(values, label) { const duplicates = values.filter((value, index) => values.indexOf(value) !== index); assert(duplicates.length === 0, `Duplicate ${label}: ${[...new Set(duplicates)].join(", ")}`); }
function hasPath(object, path) { return path.split(".").every(part => (object = object?.[part]) !== undefined); }
function collectRuntimeText() {
  const stack = [join(root, "scripts")];
  let text = "";
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) stack.push(path);
      else if (entry.name.endsWith(".mjs")) text += `\n${readFileSync(path, "utf8")}`;
    }
  }
  return text;
}
