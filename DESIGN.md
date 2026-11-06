# Design context

Phase 1 presents the public chronicle as a quiet archival atlas. The timeline is the main tool; the opening section introduces its subject and directs readers to it.

- **Color:** midnight navy `#101923`, deep blue `#1b2b39`, parchment `#e7e0d0`, ink `#263139`, and aged gold `#d7b881`. Violet and teal distinguish event records without changing their meaning.
- **Type:** Cormorant Garamond for titles, DM Sans for reading text, and Space Mono for dates, controls, and archive labels.
- **Layout:** a restrained masthead and introduction lead to a full-width, horizontally explorable timeline. Cards sit on three lanes around a single time axis.
- **Signature:** a compressed interval remains visible as a patterned break in the axis, making uncertainty in the historical record part of the interface.
- **Interaction:** pointer drag and wheel zoom share the same view state as visible pan, zoom, and reset buttons. Event details use an accessible dialog. Reduced-motion settings remove transitions.

Runtime colors and type choices live in `src/styles.css`. This is the Phase 1 visual baseline, not a final brand system.

## Back Office extension

The editor uses the same navy, parchment, and aged gold tokens. A fixed navigation rail groups the content collections; on narrow screens it becomes a horizontal section list. The working area keeps record selection separate from editing, shows save/publish results in text, and confirms deletion in a dialog. Dedicated forms group content, time, display, and linked records. Existing IDs remain visible but locked; Save and Publish continue to use the same validation path.

## Public explorer extension

Three view tabs and compact filters sit between the opening section and the shared timeline. Character selection reveals a small archive profile; era and region selection reuses the same time axis. Certainty badges use gold, teal, and violet, while date precision remains written separately. Empty results and undated events have explicit places outside the axis. The timeline remains the main visual focus.

## Interaction extension

Character focus dims context records while keeping them keyboard reachable; hover, focus, and the event dialog surface related records. Card rows are assigned at the minimum zoom and remain stable during zoom and pan. Motion is limited to the introduction and emphasis transitions, with reduced-motion settings removing those effects. The timeline exposes visible controls and keyboard shortcuts for equivalent navigation.

## Advanced lore extension

The advanced tools sit after the timeline as a quiet reading desk. Relationship, comparison, and story views share the same parchment surface and event detail dialog. Spoiler level stays beside the existing archive filters; quest gates are disclosed only when the published data uses them. The JSON backup action stays in the Back Office overview and labels local-only import explicitly.
