# runyth-tables-of-sustenance-1.1.1

## Public API — v1.2.0

Access through `game.modules.get("runyth-tables-of-sustenance").api` or `game["runyth-tables-of-sustenance"]`.

### Core queries and workflows

- `whenReady()`
- `queryFoods(query)`
- `sourceById(sourceId, options)`
- `generateRegionalMenu(options)`
- `createMenuJournal(menu, options)`
- `consume(food, actor, options)`
- `serve(food, actors, options)`
- `consumeSelected(food, options)`
- `inspectCooldown(actor, food)` / `clearCooldown(actor, effectId)`
- `inspectPermanentBenefits(actor)` / `removePermanentBenefit(actor, effectId)`
- `importContent`, `previewImport`, `removeImportedContent`
- `exportData`, `previewDataImport`, `importData`
- `runDiagnostics()`
- image override get/set/reset methods

### Complementary content

Register a provider first, then neutral food definitions. Complementary core foods must not contain game-system `type`, `system`, or `effects` payloads.

```js
const core = game.modules.get("runyth-tables-of-sustenance").api;
core.registerProvider({
  id: "example-foods",
  moduleId: "example-foods",
  version: "1.0.0",
  label: "Example Foods"
});
core.registerFood("example-foods", {
  name: "Stone-Oven Rye",
  img: "icons/consumables/grains/bread-loaf-brown.webp",
  description: "<p>A dense travelling loaf.</p>",
  unidentifiedDescription: "<p>A dark loaf.</p>",
  flags: {
    "runyth-tables-of-sustenance": {
      sourceId: "example-foods.food.stone-oven-rye",
      kind: "food",
      contentSchema: "system-neutral-food-v1",
      meta: { tier: "1", servings: 4 },
      mechanics: {
        tier: "1",
        effectId: "example-foods.effect.stone-oven-rye",
        durationSeconds: 0,
        cooldownSeconds: 0,
        permanent: false,
        effectIntents: []
      }
    }
  }
});
```

### System adapters

`registerSystemAdapter(systemId, adapter)` registers the implementation used for the active game system. Core validates stable food identity after materialisation.

Required capabilities:

- `materializeFood(definition, options)`
- `remainingServings(food)`
- `reduceServings(food, amount, options)`
- `applyFoodEffect(context)`
- `removeFoodEffect(context)`

Optional capabilities include `cleanupFoodEffects`, permanent-benefit description/priming, diagnostics, and custom intent registration.

Legacy `registerCustomEffectHandler(kind, handler)` is retained as an additive compatibility API and delegates to the active adapter's intent registry.

### Hooks

The exact names are exposed by `api.hooks` and `api.extensions.contract()`. Providers should use these rather than hard-coding ordering assumptions.
