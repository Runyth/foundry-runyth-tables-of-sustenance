# runyth-tables-of-sustenance-1.1.1

## UX Standard

The responsive v1.0.1 dashboard/browser work remains the baseline in v1.1.0: content-sized controls, equalised responsive cards, `minmax(0, 1fr)` tracks, safe wrapping, visible focus states, native FilePicker image overrides, client-scoped geometry and separate size/position reset.

v1.1.0 additionally hardens sheet integration: header controls use the public ApplicationV2 control hook and only target the Document's primary sheet instance. No generic render hook may add food controls to advancement, roll, rest, effect or other secondary applications simply because they reference an Actor or Item.
