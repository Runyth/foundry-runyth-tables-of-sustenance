# runyth-tables-of-sustenance-1.1.1

## Foundry v13 Manual Test Matrix

Run on Foundry 13.351 with at least one system that has no adapter and, separately, D&D 5e 5.3.3 with the companion enabled.

1. Core-only world loads without system errors.
2. Dashboard, Browser, Generator, Composer, Content Manager, Import/Export and Diagnostics open/rescale/reopen correctly.
3. Browser search focus/caret survives result updates.
4. Long English/German labels wrap without clipping.
5. GM image change/reset uses FilePicker and synchronises managed Items where an adapter exists.
6. Core-only Actor drop/import is refused clearly instead of creating malformed Items.
7. D&D companion materialises ordinary Tier 1 foods and all mechanical tiers.
8. Consume one/multiple servings; optional deletion works.
9. Selected-token serving handles owned/synthetic actors.
10. Tier 2/3 stacking settings behave as configured.
11. Tier 4 cooldown blocks repeat use and GM override behaves explicitly.
12. Tier S confirmation, permanent record and duplicate prevention work.
13. Benefit Manager removes adapter-created mechanics and core record.
14. Starfall Grain applies only after a Short Rest that spent Hit Dice.
15. Contextual Tier S bonus primes and applies to only the intended next roll.
16. Import preview/update preserves edits when configured.
17. Cross-system materialised Item transfer is refused.
18. Diagnostics reports adapter status and no duplicate source IDs.
19. Main Actor/Item sheets receive appropriate header controls.
20. Advancement/rest/roll/activity/effect/configuration dialogs do not receive Actor/Item food controls.
21. Repeated sheet renders do not duplicate controls/hooks/listeners.
22. No deprecated global FilePicker/ApplicationV1 warnings appear.
23. Ordinary menu/random generation never emits direct Tier S food unless explicit legendary generation is enabled.
24. Disable the D&D companion: core remains functional for neutral workflows.
