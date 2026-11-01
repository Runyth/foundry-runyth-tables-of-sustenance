# runyth-tables-of-sustenance-1.1.1

## Architecture

### Boundary

The core owns canonical cuisine content and generic workflows. A system adapter owns every operation that depends on a game-system Document schema or rules implementation.

| Core responsibility | Adapter responsibility |
|---|---|
| 335 canonical food definitions | Materialise food into the current system's Item schema |
| Lore, metadata, images and localisation | Map neutral effect intents to system mechanics |
| Recipes and roll tables | Count and reduce servings in system Items |
| Browser, menus and meal composition | Create/remove system effects |
| Tier stacking policy | Handle system-specific roll/rest hooks |
| Tier 4 cooldown records | Validate system-specific data paths |
| Tier S stable permanent-benefit records | Represent the permanent benefit mechanically |
| Import/export and diagnostics | Report adapter-specific compatibility findings |
| Complementary-food/provider registry | Optional custom intent handlers |

Canonical food definitions have no top-level `type`, `system`, or `effects`. Their mechanics are declarative `effectIntents` stored under `flags.runyth-tables-of-sustenance.mechanics`.

### Stable identity

`sourceId` identifies food content independently of name/localisation. `effectId` identifies cooldowns and permanent benefits independently of display text. Renaming or translating a food therefore does not create a duplicate legendary benefit.

### Materialisation

`registerSystemAdapter(systemId, adapter)` installs one capability-gated adapter for a game system. Core import, actor-drop, serving, and consumption workflows call the adapter rather than branching on `game.system.id`.

Required adapter functions are `materializeFood`, `remainingServings`, `reduceServings`, `applyFoodEffect`, and `removeFoodEffect`. Optional capabilities cover diagnostics, cleanup, contextual permanent benefits, and custom intent registration.

### Sheet integration

The core does not use ApplicationV1 sheet hooks. In v13 it adds Food/Benefit controls through `getHeaderControlsApplicationV2` and a positive main-sheet test (`document.sheet === application`). The generic Actor drop hook remains the Foundry-supported `dropActorSheetData` integration point.

### Persistence

Actor-owned core state is confined to namespaced flags for cooldowns, active-food records, dietary restrictions and permanent-benefit records. Mechanical system effects are adapter-owned and may be removed through the core Benefit Manager by delegation.

### Failure model

Neutral browsing and worldbuilding stay available without an adapter. Materialisation/mechanical operations fail explicitly rather than producing malformed game-system Documents. Serving reduction occurs only after the mechanical operation is safe to commit.
