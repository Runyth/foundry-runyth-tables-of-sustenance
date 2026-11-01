# runyth-tables-of-sustenance-1.1.1

## Release Qualification

### Result

Qualified for release by static validation, automated startup regression tests, source and built-installable runtime-graph validation, deterministic packaging, archive safety checks, and source reconstruction. A live licensed Foundry client was not available, so hosted runtime acceptance is deliberately not claimed.

### Startup defect correction

- v1.1.0 statically imported `scripts/apps/food-detail-app.mjs` through the Food Browser. Any failed request for that optional preview component aborted the entire ES-module graph before the core API could be exposed.
- v1.1.1 colocates `FoodDetailApp` with `FoodBrowserApp`, removing the separate startup request while retaining the same ApplicationV2 preview behaviour and template.
- The old standalone runtime file and import edge are absent from both source and installable builds.
- The startup smoke test now invokes the registered `init` hook and asserts API v1.2.0 is exposed before `ready`, matching the dependency boundary required by system adapters.

### Automated qualification

- Runtime JavaScript syntax: 27 module files passed.
- Runtime asset graph: 27 ES modules and 46 referenced paths passed in source and built installable trees.
- Canonical content: 335 foods, 190 recipes, 12 roll tables passed validation.
- UI localisation references: 170 keys resolved in both English and German.
- Artwork references: all 335 packaged food references resolved.
- System separation: no D&D hooks or D&D Actor/Item data paths remain in core runtime code.
- Automated tests: 38 passed, 0 failed.
- Tier S direct ordinary random generation: rejected by validation/tests.
- Catalogue authorization rules remain unchanged.

### Foundry v13/API audit

- Manifest uses the existing v13 package contract and remains system-neutral.
- UI applications use ApplicationV2/HandlebarsApplicationMixin.
- Primary Actor/Item sheet controls use `getHeaderControlsApplicationV2` with positive primary-sheet eligibility.
- Sidebar discovery uses `renderApplicationV2` with positive ItemDirectory eligibility.
- No legacy `renderItemSheet*`, `renderActorSheet*`, or `renderItemDirectory` hook remains.
- File selection uses `foundry.applications.apps.FilePicker.implementation`; no deprecated global FilePicker access is used.
- No FormApplication/ApplicationV1 implementation, private `_render`, `_getHeaderButtons`, `data.data`, `game.system.data`, or `manifestPlusVersion` usage was found.
- Static relative ES-module imports and module-local template/data/assets are release-validated after the runtime tree is copied into `dist/module`.

### Companion compatibility

The released D&D 5e 2024 companion 1.0.1 declares core compatibility minimum 1.1.0 and no maximum. Core 1.1.1 therefore satisfies the existing relationship contract. No companion code change is required for this patch. Its startup warning should disappear once the corrected core reaches `init` and exposes its API.

### Packaging qualification

- Two consecutive package runs produced byte-identical ZIP archives.
- Source, installable, and documentation ZIPs passed CRC/integrity validation.
- Every archive entry was checked for absolute paths and `..` traversal segments; none were present.
- Extracting the source ZIP, rebuilding the installable tree, and packaging it with the retained deterministic zipper reproduced the installable ZIP byte-for-byte.
- Source repository policy remains `master`.

### Hosted acceptance boundary

Run `docs/manual-tests/MANUAL-TEST-MATRIX.md` in Foundry VTT 13.351 before campaign deployment when live-client qualification is required.
