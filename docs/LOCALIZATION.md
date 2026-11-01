# runyth-tables-of-sustenance-1.1.1

## Localisation

The module provides English (`en`) and German (`de`) language files. Player-facing interface strings use namespaced localisation keys; no interface label depends on hard-coded English text.

Packaged foods contain a German localisation projection under:

```text
flags.runyth-tables-of-sustenance.localizations.de
```

The projection includes a localised name and complete description sections. Recipes include a German title, page title, and recipe body. Roll tables include German names and descriptions.

The Content Manager imports the active language by default while preserving all language projections in flags. A later forced import can switch an imported compendium to another active language without changing stable source IDs.

Missing content translations fall back to the canonical English source. Missing UI keys use Foundry’s normal language fallback behaviour.

## Adding a language

1. Copy `lang/en.json` to `lang/<code>.json`.
2. Translate every value without changing keys.
3. Add the language entry to `module.json`.
4. Add content projections through a generator or third-party integration.
5. Run `npm run validate` to verify all template keys exist in English and German; extend the validator for the new language.
