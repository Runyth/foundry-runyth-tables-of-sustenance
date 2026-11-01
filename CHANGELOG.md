# Changelog


## 1.1.1 — 2026-08-12

- Fixed a startup-critical ES-module dependency on `scripts/apps/food-detail-app.mjs`.
- Folded the food-detail ApplicationV2 implementation into the Food Browser module so food preview remains available without an additional startup request.
- Removed the standalone `food-detail-app.mjs` runtime file and its static import edge.
- Added source and built-installable ES-module graph validation so every relative import target must exist inside the package that Foundry actually installs.
- Added runtime asset validation for manifest scripts/styles/languages and ApplicationV2 Handlebars template paths.
- Added regression coverage proving the core entrypoint can initialise without a standalone food-detail module.
- Re-audited Foundry v13 public API usage and module manifest/runtime paths.
- No API, content, stable-ID, system-adapter, cooldown, or Tier S identity changes.


## 1.1.0 — 2026-08-09

- Feature release: decoupled all game-system implementation from the core.
- Converted all 335 canonical foods to `system-neutral-food-v1` definitions with declarative effect intents.
- Added capability-gated system-adapter architecture and public API v1.2.0.
- Moved Item materialisation, serving-field mutation and mechanical effect application behind adapters.
- Preserved lore, recipes, menus, cooldown identities, Tier S effect IDs, image overrides and managed-content provenance.
- Added system-aware Import/Export safeguards that reject cross-system transfer of materialised food Items.
- Hardened complementary-food registration to reject system Document payloads in core definitions.
- Preserved legacy custom-effect registration by delegating it to the active adapter.
- Replaced legacy/dynamic Actor/Item sheet render hooks with Foundry v13 `getHeaderControlsApplicationV2` and positive primary-sheet eligibility.
- Added D&D 5e 2024 as a separate complementary module.
- Full defect/API/v13 regression scan and updated automated validation.
- Added a neutral Food Detail ApplicationV2 so browsing and lore preview continue to work without a game-system adapter.
- Added explicit dashboard/Content Manager adapter readiness; system-specific food import is unavailable until a compatible adapter is active, while recipes and tables remain usable.
- Hardened adapter ownership so another module cannot silently replace an already registered system adapter.
- Hardened catalogue ownership: players cannot consume or drag canonical catalogue definitions as free inventory; player consumption requires an owned Actor Item.
- Hardened socket serving validation with Actor ownership checks and rejected player source-ID-only requests.
- Replaced Item-directory-specific discovery with the documented generic `renderApplicationV2` hook plus positive ItemDirectory eligibility.

## 1.0.1 — 2026-08-09

- Responsive dashboard/browser UX overhaul.
- Runtime food image overrides.
- Import/Export and Diagnostics applications.
- Complementary-content provider API.
