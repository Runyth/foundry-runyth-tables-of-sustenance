# Runyth Tables of Sustenance

System-neutral food, cuisine, recipe, menu, serving, cooldown, legendary-benefit, import/export, diagnostics, artwork-override, and extension framework for Foundry VTT v13.

The core is authoritative for all **335 foods**, **190 recipes**, **12 roll tables**, regional/cultural metadata, food tiers, descriptions, menu generation, browser UX, recipes, serving orchestration, cooldown records, permanent-benefit identity, import/export, diagnostics, localisation, and public extension registries.

It deliberately contains **no game-system Item schema, actor data path, Active Effect path, D&D hook, or D&D-specific runtime dependency**. Game-system modules register adapters that materialise neutral food definitions into their own Items and execute the neutral mechanical intents.

### Compatibility

- Foundry VTT: minimum 13.347, verified 13.351, maximum major version 13.
- Game system: unrestricted. Core browsing/worldbuilding works in any system.
- Mechanical inventory/effects: require a compatible system adapter.
- D&D 5e 2024: install `runyth-tables-of-sustenance-dnd5e-2024` alongside this core.

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
npm test
npm run check
npm run generate
npm run validate
```

Repository default branch: `master`.

## Releases

The GitHub repository is
[`Runyth/foundry-runyth-tables-of-sustenance`](https://github.com/Runyth/foundry-runyth-tables-of-sustenance).
Every release attaches:

```text
runyth-tables-of-sustenance-v<version>-mod.zip
runyth-tables-of-sustenance-v<version>-src.zip
runyth-tables-of-sustenance-v<version>-doc.zip
module.json
runyth-tables-of-sustenance-v<version>-SHA256SUMS.txt
```

The `module.json` manifest download URL points at the matching release's installable
archive, and the marked Latest release is always the highest published version.

## Licence
Copyright © 2026  [Daniel Braniewski](https://brani.dev/)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
