// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID, SETTINGS } from "../constants.mjs";
import { contentLibrary } from "./content-library.mjs";

class SocketService {
  #pending = new Map();
  #handler = this.#onMessage.bind(this);

  init() {
    game.socket.on(`module.${MODULE_ID}`, this.#handler);
  }

  destroy() {
    game.socket.off(`module.${MODULE_ID}`, this.#handler);
    for (const pending of this.#pending.values()) pending.reject(new Error("Socket service stopped."));
    this.#pending.clear();
  }

  async remoteConsume({ actorUuid, itemUuid = null, sourceId = null, options = {} }) {
    const requestId = foundry.utils.randomID();
    const payload = {
      type: "consume-request",
      requestId,
      userId: game.user.id,
      actorUuid,
      itemUuid,
      sourceId,
      options: { rest: options.rest ?? null, sharedMealId: options.sharedMealId ?? null }
    };
    const promise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pending.delete(requestId);
        reject(new Error(game.i18n.localize(`${MODULE_ID}.Errors.SocketTimeout`)));
      }, 15000);
      this.#pending.set(requestId, { resolve, reject, timeout });
    });
    game.socket.emit(`module.${MODULE_ID}`, payload);
    return promise;
  }

  async #onMessage(payload) {
    if (!payload?.type || !payload.requestId) return;
    if (payload.type === "consume-response" && payload.targetUserId === game.user.id) {
      const pending = this.#pending.get(payload.requestId);
      if (!pending) return;
      clearTimeout(pending.timeout);
      this.#pending.delete(payload.requestId);
      if (payload.ok) pending.resolve(payload.result);
      else pending.reject(new Error(payload.error));
      return;
    }
    if (payload.type !== "consume-request" || !this.#isPrimaryGM()) return;
    const response = { type: "consume-response", requestId: payload.requestId, targetUserId: payload.userId, ok: false };
    try {
      const user = game.users.get(payload.userId);
      if (!user?.active) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.InvalidSocketUser`));
      if (!game.settings.get(MODULE_ID, SETTINGS.playerServingOthers)) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.ServingOthersDisabled`));
      const actor = await fromUuid(payload.actorUuid);
      if (!actor || actor.documentName !== "Actor") throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.NoTargets`));
      let food = payload.itemUuid ? await fromUuid(payload.itemUuid) : null;
      if (food) {
        const ownerActor = food.parent?.documentName === "Actor" ? food.parent : null;
        const ownerLevel = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
        if (!ownerActor?.testUserPermission(user, ownerLevel)) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.InventoryFoodRequired`));
      } else if (payload.sourceId) {
        throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.InventoryFoodRequired`));
      }
      if (!food) throw new Error(game.i18n.localize(`${MODULE_ID}.Errors.NotFood`));
      const result = await game[MODULE_ID].consume(food, actor, { ...payload.options, skipConfirmation: true, reduceServings: Boolean(food.update) });
      response.ok = true;
      response.result = { consumed: result.consumed, actorUuid: actor.uuid, foodName: food.name };
    } catch (error) {
      response.error = error.message;
      console.error(`${MODULE_ID} | Rejected socket consumption request`, error);
    }
    game.socket.emit(`module.${MODULE_ID}`, response);
  }

  #isPrimaryGM() {
    const primary = game.users.filter(user => user.active && user.isGM).sort((a, b) => a.id.localeCompare(b.id))[0];
    return primary?.id === game.user.id;
  }
}

export const socketService = new SocketService();
