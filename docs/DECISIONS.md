# Decisions

## 2026-11-05 — Phase 1 timeline projection and data source

Phase 1 renders a local `TimelineData` object through one timeline component. Its event dates remain numeric lore positions; a piecewise D3 linear projection gives declared quiet intervals a fixed visual width without changing event order or stored dates. D3 Zoom controls the horizontal view transform. This keeps timeline breaks visible and makes the same data model usable by future world, character, and era views.

Firebase initialization is optional and never runs without all required environment values. The public timeline keeps using mock data until Firestore schema, authentication, and publishing behavior are implemented in Phase 2.
