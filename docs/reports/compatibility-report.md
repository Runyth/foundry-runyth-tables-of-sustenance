# runyth-tables-of-sustenance-1.1.1

## Compatibility Report

Target: Foundry VTT 13.347–13.351, system-neutral core.

Verified statically:
- module manifest and declared runtime paths exist;
- source and built installable ES-module import graphs close without missing relative imports;
- ApplicationV2 Handlebars template paths referenced by runtime code exist;
- no D&D runtime hook/data path in the core;
- no manifest game-system dependency;
- no ApplicationV1 sheet integration;
- namespaced FilePicker usage;
- ApplicationV2 header-control contract;
- neutral content materialisation boundary;
- system-aware materialised-Item import guard;
- existing D&D companion 1.0.1 dependency range accepts core 1.1.1.

Primary Foundry references:
- https://foundryvtt.com/article/module-development/
- https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html
- https://foundryvtt.com/api/v13/
