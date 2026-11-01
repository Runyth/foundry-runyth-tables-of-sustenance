# runyth-tables-of-sustenance-1.1.1

## Security and Data Safety

- No passwords, secrets, or external network credentials are stored.
- All persistent state is namespaced to the module.
- Players can consume food only from Items embedded on Actors they own; canonical catalogue definitions are browse/preview data, not free inventory.
- Catalogue drag-to-Actor creation and direct catalogue serving/consumption are GM-only.
- Player socket requests must identify an Item embedded on an Actor the requesting user owns; source-ID-only player requests are rejected.
- Optional remote serving is executed by one active GM after validating user, world setting, actor UUID, Item ownership, and food provenance.
- Client requests cannot set a GM override.
- Import and removal affect only documents with module source flags in dedicated world compendia.
- User-edited imports are preserved by default.
- Tier S duplicate checks run before item consumption.
- HTML descriptions are packaged module content; user-provided names are escaped in generated chat and journal output.
