# Design context

Phase 1 presents the public chronicle as a quiet archival atlas. The timeline is the main tool; the opening section introduces its subject and directs readers to it.

- **Color:** midnight navy `#101923`, deep blue `#1b2b39`, parchment `#e7e0d0`, ink `#263139`, and aged gold `#d7b881`. Violet and teal distinguish event records without changing their meaning.
- **Type:** Cormorant Garamond for titles, DM Sans for reading text, and Space Mono for dates, controls, and archive labels.
- **Layout:** a restrained masthead and introduction lead to a full-width, horizontally explorable timeline. Cards sit on three lanes around a single time axis.
- **Signature:** a compressed interval remains visible as a patterned break in the axis, making uncertainty in the historical record part of the interface.
- **Interaction:** pointer drag and wheel zoom share the same view state as visible pan, zoom, and reset buttons. Event details use an accessible dialog. Reduced-motion settings remove transitions.

Runtime colors and type choices live in `src/styles.css`. This is the Phase 1 visual baseline, not a final brand system.

## Back Office extension

The editor uses the same navy, parchment, and aged gold tokens. A fixed navigation rail groups the content collections; on narrow screens it becomes a horizontal section list. The working area keeps record selection separate from editing, shows save/publish results in text, and confirms deletion in a dialog. The current JSON editor is a temporary code-first surface; dedicated content forms remain open work.

## Public explorer extension

Three view tabs and compact filters sit between the opening section and the shared timeline. Character selection reveals a small archive profile; era and region selection reuses the same time axis. Certainty badges use gold, teal, and violet, while date precision remains written separately. Empty results and undated events have explicit places outside the axis. The timeline remains the main visual focus.
