# runyth-tables-of-sustenance-1.1.1

## Complementary Module Guide

There are two extension classes:

1. **Content providers** add neutral foods, metadata taxonomies and recipes.
2. **System adapters** convert neutral foods/effect intents into a game system's Documents and mechanics.

A content provider must never embed a D&D/PF2e/etc. `system` object in a core food. A system adapter should never fork or duplicate the core lore catalogue merely to make system Items.

Register providers after the core API is available. Register system adapters for the exact `game.system.id`, retain `sourceId` unchanged during materialisation, and reject unsupported intent kinds rather than silently dropping effects.

The D&D companion in this release is the reference implementation.
