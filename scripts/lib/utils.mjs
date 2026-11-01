// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { FLAG_SCOPE, MODULE_ID, TIER_ORDER } from "../constants.mjs";

export function deepClone(value) {
  return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : structuredClone(value);
}

export function getModuleFlags(documentOrSource) {
  return foundry.utils.getProperty(documentOrSource, `flags.${FLAG_SCOPE}`) ?? {};
}

export function getFoodMeta(documentOrSource) {
  return getModuleFlags(documentOrSource).meta ?? {};
}

export function getMechanics(documentOrSource) {
  return getModuleFlags(documentOrSource).mechanics ?? {};
}

export function isFood(documentOrSource) {
  return getModuleFlags(documentOrSource).kind === "food";
}

export function isRecipe(documentOrSource) {
  return getModuleFlags(documentOrSource).kind === "recipe";
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), game.i18n.lang));
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return game.i18n.localize(`${MODULE_ID}.Common.Permanent`);
  if (!seconds) return game.i18n.localize(`${MODULE_ID}.Common.None`);
  const units = [
    [86400, `${MODULE_ID}.Time.Days`],
    [3600, `${MODULE_ID}.Time.Hours`],
    [60, `${MODULE_ID}.Time.Minutes`],
    [1, `${MODULE_ID}.Time.Seconds`]
  ];
  for (const [size, key] of units) {
    if (seconds >= size && seconds % size === 0) {
      return game.i18n.format(key, { count: seconds / size });
    }
  }
  return game.i18n.format(`${MODULE_ID}.Time.Seconds`, { count: seconds });
}

export function compareFoods(a, b, field = "name") {
  const ma = getFoodMeta(a);
  const mb = getFoodMeta(b);
  switch (field) {
    case "tier": return (TIER_ORDER[ma.tier] ?? 99) - (TIER_ORDER[mb.tier] ?? 99) || a.name.localeCompare(b.name);
    case "price": return copperValue(ma.purchasePrice) - copperValue(mb.purchasePrice) || a.name.localeCompare(b.name);
    case "origin": return String(ma.originRegion).localeCompare(String(mb.originRegion)) || a.name.localeCompare(b.name);
    case "rarity": return String(ma.rarity).localeCompare(String(mb.rarity)) || a.name.localeCompare(b.name);
    case "preparationTime": return parseDurationText(ma.preparationTime) - parseDurationText(mb.preparationTime) || a.name.localeCompare(b.name);
    case "duration": return Number(ma.effectDurationSeconds ?? Number.MAX_SAFE_INTEGER) - Number(mb.effectDurationSeconds ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name);
    default: return a.name.localeCompare(b.name, game.i18n.lang);
  }
}

export function copperValue(price = {}) {
  const multipliers = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };
  return Number(price.value ?? 0) * (multipliers[price.denomination] ?? 1);
}

export function parseDurationText(value) {
  const text = normalizeText(value);
  const number = Number.parseFloat(text) || 0;
  if (text.includes("day")) return number * 86400;
  if (text.includes("hour")) return number * 3600;
  if (text.includes("minute")) return number * 60;
  return number;
}

export function localizeSource(source, lang = game.i18n.lang) {
  const clone = deepClone(source);
  const localized = getModuleFlags(clone).localizations?.[lang];
  if (!localized) return clone;
  if (localized.name) clone.name = localized.name;
  if (localized.description) {
    if (clone.system?.description) foundry.utils.setProperty(clone, "system.description.value", localized.description);
    else clone.description = localized.description;
  }
  if (localized.content && clone.pages?.[0]?.text) clone.pages[0].text.content = localized.content;
  if (localized.pageName && clone.pages?.[0]) clone.pages[0].name = localized.pageName;
  return clone;
}

export function htmlEscape(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

export function stableSnapshot(source) {
  return {
    name: source.name,
    type: source.type,
    img: source.img,
    description: source.description,
    unidentifiedDescription: source.unidentifiedDescription,
    system: source.system,
    effects: source.effects,
    ownership: source.ownership,
    flags: {
      [FLAG_SCOPE]: {
        sourceId: getModuleFlags(source).sourceId,
        sourceVersion: getModuleFlags(source).sourceVersion,
        kind: getModuleFlags(source).kind,
        meta: getModuleFlags(source).meta,
        mechanics: getModuleFlags(source).mechanics,
        localizations: getModuleFlags(source).localizations
      }
    }
  };
}

export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

export function fastHash(value) {
  const text = typeof value === "string" ? value : stableStringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function notify(level, key, data = {}) {
  const message = Object.keys(data).length ? game.i18n.format(key, data) : game.i18n.localize(key);
  ui.notifications?.[level]?.(message);
}

export function canManageContent() {
  return game.user.isGM;
}

export function canConsumeForActor(actor) {
  if (!actor) return false;
  if (game.user.isGM) return true;
  return actor.isOwner;
}

export function nowWorldTime() {
  return Number(game.time?.worldTime ?? 0);
}
