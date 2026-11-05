# Decisions

## 2026-11-05 — Phase 1 timeline projection and data source

Phase 1 renders a local `TimelineData` object through one timeline component. Its event dates remain numeric lore positions; a piecewise D3 linear projection gives declared quiet intervals a fixed visual width without changing event order or stored dates. D3 Zoom controls the horizontal view transform. This keeps timeline breaks visible and makes the same data model usable by future world, character, and era views.

Firebase initialization is optional and never runs without all required environment values. The public timeline keeps using mock data until published Firestore content is connected in Phase 3.

## 2026-11-05 — Back Office before a Firebase project exists

The `#bo` route uses browser storage only in Vite development mode when Firebase is unconfigured. It is explicitly labeled as a sandbox and does not feed the public timeline. Production never enables this local editor. With Firebase configured, the editor requires email/password authentication and an `owners/{uid}` document created outside the client. Firestore rules, not route visibility, enforce owner writes and published-only public reads. The first owner document cannot be created by client rules. This avoids presenting a local demo login as real access control.

Content records are validated with Zod before storage. Published events require a timeline, source, and description. A generic JSON editor keeps all collections usable while dedicated forms and reference checks remain open work.
