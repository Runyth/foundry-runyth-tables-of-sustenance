# runyth-tables-of-sustenance-1.1.1

## Import / Export

Transfer schema v2 records the source game system and distinguishes neutral module state from materialised system Items.

Portable across systems:
- module settings selected for export;
- image overrides;
- recipes and roll tables;
- neutral provider/content metadata.

System-bound:
- already-materialised food Item Documents.

A cross-system import containing materialised Items is refused instead of guessing a destination schema. Rematerialise neutral food definitions through the destination adapter.

Imports are preview-first, provenance-aware and preserve managed user edits by default unless overwrite is explicitly selected.
