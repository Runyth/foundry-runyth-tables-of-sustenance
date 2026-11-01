// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { FLAG_SCOPE, MODULE_ID, SETTINGS } from "../constants.mjs";
import { contentLibrary } from "./content-library.mjs";
import { getModuleFlags } from "../lib/utils.mjs";

class RecipeService {
  knownRecipes(actor) {
    return actor?.getFlag(FLAG_SCOPE, "knownRecipes") ?? [];
  }

  async learn(actor, recipeOrSourceId) {
    if (!game.settings.get(MODULE_ID, SETTINGS.recipesEnabled)) return false;
    const sourceId = typeof recipeOrSourceId === "string" ? recipeOrSourceId : getModuleFlags(recipeOrSourceId).sourceId;
    const known = new Set(this.knownRecipes(actor));
    known.add(sourceId);
    await actor.setFlag(FLAG_SCOPE, "knownRecipes", [...known]);
    return true;
  }

  async forget(actor, sourceId) {
    const known = new Set(this.knownRecipes(actor));
    known.delete(sourceId);
    await actor.setFlag(FLAG_SCOPE, "knownRecipes", [...known]);
  }

  async available(actor, { includeUnknown = false } = {}) {
    const recipes = await contentLibrary.recipes({ localized: true });
    if (includeUnknown && game.user.isGM) return recipes;
    const known = new Set(this.knownRecipes(actor));
    return recipes.filter(recipe => known.has(getModuleFlags(recipe).sourceId));
  }

  async check(recipe, actor, { ingredients = [], tools = [], authorised = false } = {}) {
    const flags = getModuleFlags(recipe);
    const requirements = flags.requirements ?? {};
    const missingIngredients = (requirements.ingredients ?? []).filter(required => !ingredients.includes(required));
    const missingTools = (requirements.tools ?? []).filter(required => !tools.includes(required));
    const requiresAuthorisation = Boolean(requirements.authorisation) && !authorised;
    const known = this.knownRecipes(actor).includes(flags.sourceId);
    return { known, missingIngredients, missingTools, requiresAuthorisation, ready: known && !missingIngredients.length && !missingTools.length && !requiresAuthorisation };
  }

  async exportKnown(actor) {
    const sourceIds = this.knownRecipes(actor);
    const recipes = await contentLibrary.recipes();
    return {
      module: MODULE_ID,
      version: game.modules.get(MODULE_ID)?.version,
      actorUuid: actor.uuid,
      actorName: actor.name,
      exportedAt: new Date().toISOString(),
      recipes: recipes.filter(recipe => sourceIds.includes(getModuleFlags(recipe).sourceId))
    };
  }

  async importKnown(actor, payload) {
    if (payload.module !== MODULE_ID || !Array.isArray(payload.recipes)) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.InvalidRecipeImport`));
    const known = new Set(this.knownRecipes(actor));
    for (const recipe of payload.recipes) known.add(getModuleFlags(recipe).sourceId);
    await actor.setFlag(FLAG_SCOPE, "knownRecipes", [...known]);
    return known.size;
  }
}

export const recipeService = new RecipeService();
