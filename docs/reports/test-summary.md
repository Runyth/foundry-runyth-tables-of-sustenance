# runyth-tables-of-sustenance-1.1.1

## Test Summary

- Runtime JavaScript syntax: 27 files passed.
- Runtime asset graph: 27 ES modules and 46 referenced runtime paths validated in both source and built installable trees.
- Content validation: 335 foods, 190 recipes, 12 tables, 170 UI localisation keys, all referenced artwork.
- System-separation validation: zero D&D runtime data paths in core.
- Startup regression: standalone `food-detail-app.mjs` is absent; food detail is colocated with Food Browser; core `init` exposes API v1.2.0 before `ready`.
- Automated tests: 38 passed, 0 failed.
- D&D companion compatibility: existing companion 1.0.1 requires core >=1.1.0 with no maximum, so core 1.1.1 is accepted without a companion rebuild.
- Live Foundry client: not available in build environment; interactive acceptance is not claimed.
