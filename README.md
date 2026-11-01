# runyth-tables-of-sustenance-1.1.1

## Runyth Tables of Sustenance

System-neutral food, cuisine, recipe, menu, serving, cooldown, legendary-benefit, import/export, diagnostics, artwork-override, and extension framework for Foundry VTT v13.

The core is authoritative for all **335 foods**, **190 recipes**, **12 roll tables**, regional/cultural metadata, food tiers, descriptions, menu generation, browser UX, recipes, serving orchestration, cooldown records, permanent-benefit identity, import/export, diagnostics, localisation, and public extension registries.

It deliberately contains **no game-system Item schema, actor data path, Active Effect path, D&D hook, or D&D-specific runtime dependency**. Game-system modules register adapters that materialise neutral food definitions into their own Items and execute the neutral mechanical intents.

### Compatibility

- Foundry VTT: minimum 13.347, verified 13.351, maximum major version 13.
- Game system: unrestricted. Core browsing/worldbuilding works in any system.
- Mechanical inventory/effects: require a compatible system adapter.
- D&D 5e 2024: install `tables-of-sustenance-dnd5e-2024` alongside this core.

Foundry v13 release history: https://foundryvtt.com/releases/

### Library

| Tier | Foods |
|---|---:|
| Tier 1 | 180 |
| Tier 2 | 80 |
| Tier 3 | 45 |
| Tier 4 | 20 |
| Tier S | 10 |
| **Total** | **335** |

Of those, **180** are narrative-only Tier 1 foods and **155** carry one or more system-neutral effect intents.

### Main interfaces

- Dashboard
- Food Browser
- Menu Generator
- Meal Composer
- Content Manager
- Import / Export
- Diagnostics
- Benefit Manager
- Window Geometry manager

All module-owned applications use Foundry v13 ApplicationV2. Main Actor/Item sheet header controls use the public `getHeaderControlsApplicationV2` hook and only attach when `document.sheet === application`, avoiding unrelated dialogs and secondary document applications.

### Development

```text
npm run generate
npm run check
npm run validate
npm test
npm run build
npm run package
```

Repository default branch: `master`.
