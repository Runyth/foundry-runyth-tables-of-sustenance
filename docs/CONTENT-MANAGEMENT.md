# runyth-tables-of-sustenance-1.1.1

## Content Management

## Stable identity

Every packaged document has two stable identifiers:

- a Foundry `_id` used when first creating the world-compendium document;
- `flags.runyth-tables-of-sustenance.sourceId`, which remains authoritative across localisation and display-name changes.

Imported documents also receive a packaged-content hash. On later updates, the manager compares the current editable snapshot with the hash from the previous import.

## Actions

### Preview

Reports how many entries would be created, updated, preserved as user-edited, or left unchanged.

### Import or update

Creates missing entries and updates matching entries in batches of 50. It can filter by content type, food tier, region, culture, and meal category.

### Preserve edits

Enabled by default. A matching document whose editable snapshot differs from its previous packaged hash is not overwritten.

### Force restoration

Disables edit preservation for the selected entries and restores canonical names, descriptions, images, metadata, and mechanics.

### Remove

Deletes only module-managed entries matching the current selection. It does not delete unmanaged documents or the packaged source library.

## Interruption and recovery

Each batch is independently committed to a world compendium. Cancellation stops before the next batch. Re-running the same operation skips unchanged entries and continues safely. No separate recovery database is required.
