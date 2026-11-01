# runyth-tables-of-sustenance-1.1.1

## Troubleshooting

### Food can be browsed but not dragged/imported
Run Diagnostics. If no adapter is registered for the active game system, install the matching complementary module.

### Existing D&D food Items do not update after upgrading from 1.0.1
Enable both core 1.1.0 and the D&D 5e 2024 companion, then use Content Manager preview/update. Stable source IDs are retained.

### A Tier S duplicate is refused
This is intentional. Permanent benefits are keyed by stable `effectId`, not food name. A GM may remove a recorded benefit in Benefit Manager before deliberate reapplication.

### A contextual benefit does not apply automatically
The active adapter may require priming for narrow checks/saves. Open Benefit Manager and follow the adapter-provided workflow.

### Diagnostics reports mismatched materialisation
The imported Item was created by another system/adapter or predates the current adapter contract. Preview a managed-content update rather than manually changing provenance flags.

## Core fails before the adapter becomes ready

Core 1.1.1 removes the startup-critical standalone `food-detail-app.mjs` dependency that could prevent the core API from being exposed if that browser request failed. If an older 1.1.0 installation reports that request failure, replace the complete core module directory with 1.1.1 rather than overlaying only selected files. The D&D companion requires the core API to reach its ready state, so its "core v1.1.0 or newer is required" message can be a downstream symptom of core startup failure.
