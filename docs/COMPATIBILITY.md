# runyth-tables-of-sustenance-1.1.1

## Compatibility

| Component | Contract |
|---|---|
| Foundry VTT | 13.347–13.351; manifest maximum major 13 |
| Game system | No core dependency |
| Application framework | ApplicationV2 |
| Canonical food schema | `system-neutral-food-v1` |
| Core public API | 1.2.0 |
| System-adapter contract | 1.0.0 |

The core no longer creates game-system Items or effects by itself. A world can use the browser, recipes, menus, metadata, artwork overrides, diagnostics and transfer features on any game system. Inventory import, serving mutation, and food mechanics require an adapter registered for `game.system.id`.

The D&D 5e 2024 implementation is provided separately by `tables-of-sustenance-dnd5e-2024`.

### Foundry v13 audit

- Uses namespaced v13 FilePicker implementation.
- Uses ApplicationV2 module applications.
- Uses public `getHeaderControlsApplicationV2` instead of ApplicationV1 sheet-header mutation.
- Uses native HTMLElement APIs in owned render roots.
- Does not use `data.data`, global deprecated ApplicationV1 classes, or D&D-specific hooks in core runtime.
- Generic document controls positively target the Document's primary `sheet` instance.

References:
- https://foundryvtt.com/releases/
- https://foundryvtt.com/api/v13/modules/hookEvents.html
- https://foundryvtt.com/api/v13/interfaces/foundry.applications.types.ApplicationHeaderControlsEntry.html
- https://foundryvtt.com/api/v13/classes/foundry.ClientDocument.html
