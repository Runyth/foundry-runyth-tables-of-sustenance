# Changelog


## 1.3.0 — 2026-11-06

- The Foods browser window frames correctly: the two-column layout class moved
  from the window root onto the window content, so the window title bar rides
  the top frame again instead of being squeezed into the narrow filter column
  that previously held it.
- The module's windows adopt the fleet-wide design language by default: the
  dashboard, the Foods browser, the shop and menu generator, the meal
  composer, the content manager, the import and export tool, the diagnostics
  window, the window geometry panel, the benefit manager, the food detail
  sheet, and the confirm and preset dialogs ride the fleet shell with gold
  headings, gradient buttons, dark field controls, thin scrollbars, and the
  fleet focus ring. A new client setting, disabled by default, restores the
  earlier stock Foundry look verbatim when enabled.
- The look is applied at render time: every module window mounts its window
  identity, a window marker attribute, and the current look directly on the
  rendered element, independent of the host's handling of window classes
  options, and module-level window render hooks repeat the mount for every
  rendered module window; closing the settings configuration re-syncs all
  mounted windows in both directions.
- Added a regression suite covering the browser layout contract, the toggle
  contract, render-time mounting, hook-path sync in both look states, the
  marker-based re-sync, dialog window identity classes, and fleet-layer CSS
  scoping keyed on the fleet class alone.

## 1.2.1 — 2026-11-03

- AGENTS.md conformance release: the manifest author carries the standard organisational URL, and the shipped homebrew content states its CC BY-SA 4.0 content licence in the README and on the content ledger records. No runtime behaviour change; the signed v1.2.1 tag marks the conformance-patched release.

## 1.2.0 — 2026-11-02

- The module joins the Runyth suite as `runyth-tables-of-sustenance` / **Runyth Tables of Sustenance**: the module id, title, npm package, flag scope, pack names, stylesheet, and class scope were rebranded, and the release moves a minor version for the identity change.
- The content catalogue keeps its shape: 335 foods, 190 recipes, 12 roll tables, checksummed per-version asset paths, and the same system-neutral contract for complementary system adapters.
- Implemented the publication standard: deterministic installable `-mod`, source `-src`, and documentation `-doc` archives with per-version checksums and byte-identical rebuild verification, the standard quality and release pipelines, the full GNU AGPL-3.0-or-later licence with the standard source notice, and the publication history free of private campaign attribution.

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
