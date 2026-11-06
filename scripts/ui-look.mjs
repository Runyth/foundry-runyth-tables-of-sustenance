// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID } from "./constants.mjs";

export const SETTING_STOCK_LOOK = "stockFoundryLook";
export const FLEET_UI_CLASS = "runyth-tables-of-sustenance-fleet-ui";

// Rendered module windows are marked with this attribute at render time so
// the fleet/class toggling reaches every mounted window even when the host
// Foundry build does not forward window `classes` options onto the element.
export const WINDOW_MARKER = "data-runyth-tables-of-sustenance-window";

export function isStockFoundryLook() {
  try {
    return Boolean(globalThis.game?.settings?.get(MODULE_ID, SETTING_STOCK_LOOK));
  } catch {
    return false;
  }
}

export function applyUiLook(element, stock = isStockFoundryLook()) {
  element?.classList?.toggle(FLEET_UI_CLASS, !stock);
}

export function windowClasses(classes) {
  if (isStockFoundryLook()) return [...classes];
  return [...classes, FLEET_UI_CLASS];
}

const WINDOW_SELECTOR = [
  `[${WINDOW_MARKER}]`,
  ".rts"
].join(",");

export function syncOpenWindows() {
  const stock = isStockFoundryLook();
  const matches = globalThis.document?.querySelectorAll?.(WINDOW_SELECTOR) ?? [];
  for (const element of new Set(matches)) {
    applyUiLook(element, stock);
  }
  return stock;
}
