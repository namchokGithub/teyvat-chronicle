# Design context

Phase 1 presents the public chronicle as a quiet archival atlas. The timeline is the main tool; the opening section introduces its subject and directs readers to it.

- **Color:** midnight navy `#101923`, deep blue `#1b2b39`, parchment `#e7e0d0`, ink `#263139`, and aged gold `#d7b881`. Violet and teal distinguish event records without changing their meaning.
- **Type:** Cormorant Garamond for titles, DM Sans for reading text, and Space Mono for dates, controls, and archive labels.
- **Layout:** a restrained masthead and introduction lead to a full-width, horizontally explorable timeline. Cards sit on three lanes around a single time axis.
- **Signature:** a compressed interval remains visible as a patterned break in the axis, making uncertainty in the historical record part of the interface.
- **Interaction:** pointer drag and wheel zoom share the same view state as visible pan, zoom, and reset buttons. Event details use an accessible dialog. Reduced-motion settings remove transitions.

Runtime colors and type choices live in `src/styles.css`. This is the Phase 1 visual baseline, not a final brand system.
