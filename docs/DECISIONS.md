# Decisions

## 2026-11-05 — Phase 1 timeline projection and data source

Phase 1 renders a local `TimelineData` object through one timeline component. Its event dates remain numeric lore positions; a piecewise D3 linear projection gives declared quiet intervals a fixed visual width without changing event order or stored dates. D3 Zoom controls the horizontal view transform. This keeps timeline breaks visible and makes the same data model usable by future world, character, and era views.

Firebase initialization is optional and never runs without all required environment values. The public timeline keeps using mock data until published Firestore content is connected in Phase 3.

## 2026-11-05 — Back Office before a Firebase project exists

The `#bo` route uses browser storage only in Vite development mode when Firebase is unconfigured. It is explicitly labeled as a sandbox and does not feed the public timeline. Production never enables this local editor. With Firebase configured, the editor requires email/password authentication and an `owners/{uid}` document created outside the client. Firestore rules, not route visibility, enforce owner writes and published-only public reads. The first owner document cannot be created by client rules. This avoids presenting a local demo login as real access control.

Content records are validated with Zod before storage. Published events require a timeline, source, and description. A generic JSON editor keeps all collections usable while dedicated forms and reference checks remain open work.

## 2026-11-05 — Public explorer data and URL state

All public views filter one event collection through a shared timeline renderer. With Firebase configured, public queries request only published documents, matching the Firestore rules; data errors surface instead of silently switching to sample lore. Without Firebase configuration, a labeled sample archive keeps the explorer usable. The primary timeline is `teyvat-history` when published, otherwise the first published timeline by sort order.

Unknown event times stay out of the numeric axis and appear in a separate list. Published relationships supplement direct character links. Public details display only published sources and entities. Search and filters use URL query parameters, including `event` for shareable event links; MiniSearch indexes local public data with a substring fallback for text its tokenizer does not match.

## 2026-11-05 — Stable card placement and focus context

The timeline assigns card rows using projected dates at the minimum supported zoom. The assignment stays stable while panning or zooming, and extra rows are added when crowded dates cannot fit in the existing rows. Character focus keeps the world view as context and dims events without that character; it never changes the underlying event set. Published event-to-event relationships drive both the visual connector and the textual links in event details. Zoom updates are scheduled once per animation frame to avoid synchronously rendering for every pointer event.

## 2026-11-05 — Phase 5 visibility and backup boundary

Optional event `spoilerLevel` values 0–3 and `requiredQuestIds` preserve older records at level 0. The public viewer starts at level 0 with no completed quests. One filter path determines timeline, deep-link detail, relationship explorer, comparison, and story visibility. Spoiler preferences stay in the current page session and are omitted from shared URLs, so opening a deep link never unlocks hidden details automatically. These labels are provisional until a sourced quest/version catalog exists.

Backups serialize all content collections with a format version. Import validates every record and checks every collection for duplicate IDs before writing. Import is add-only and available only in the local development sandbox; Firebase is export-only until conflict and recovery rules are defined.
