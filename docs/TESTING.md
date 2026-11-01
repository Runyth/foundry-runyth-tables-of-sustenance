# runyth-tables-of-sustenance-1.1.1

## Testing

Release qualification runs:

```text
npm run check
npm run validate
npm test
npm run build
npm run package
```

Automated coverage includes tier distribution, Tier S exclusion, ApplicationV2 UX contracts, image overrides, import/export provenance, extension API, localisation parity, neutral food schema, absence of D&D runtime paths, system-adapter capability enforcement, provider neutrality, custom intent delegation, manifest compatibility, public ApplicationV2 hook ownership, catalogue-to-inventory authorization, socket ownership checks, and entrypoint hooks.

Live Foundry VTT execution is not claimed in the build environment. Use `docs/manual-tests/MANUAL-TEST-MATRIX.md` for hosted acceptance.
