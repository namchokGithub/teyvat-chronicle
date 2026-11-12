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

Backups serialize all content collections with a format version. Import validates every record and checks every collection for duplicate IDs before writing. Import is add-only. Firebase import was added on 2026-11-09; see the entry below.

## 2026-11-06 — Back Office form editing

The Back Office now edits the existing content records through dedicated fields for each collection rather than a JSON textarea. Draft form state may contain numeric input strings until Save or Publish, when one normalization step restores numbers and nullable values before the unchanged Zod/store validation. Reference selectors load records from the same store and retain missing IDs visibly instead of silently dropping them. This preserves existing Firestore documents and the publish workflow while allowing editors to manage timeline breaks and links without writing JSON.

## 2026-11-09 — Character and region seed from genshin-db

`scripts/import-genshin-db.ts` reads the sibling read-only `genshin-db` checkout and writes a version 1 backup snapshot to `data/import/genshin-db-characters-regions.json`. The snapshot goes through the existing add-only Back Office import, so app code and storage paths stay unchanged. The script validates every record with the same Zod schemas and fails without writing output if a record is invalid or a region is unknown.

Record IDs are slugs of the English display name (`kamisato-ayaka`, `nod-krai`), which keeps the existing sample IDs (`venti`, `zhongli`, `mondstadt`, `liyue`, `khaenriah`) valid. All records import as `draft` so nothing reaches the public explorer before review. Each character cites one `genshin-db` source record. Character images hotlink HoYoverse's official icon CDN (`mihoyo_icon`) because the Fandom fields cover few characters; two characters without an icon keep `image: null`. Regions are the eight nations from the data plus Khaenri'ah and Celestia; genshin-db has no nation-level text, so region descriptions start empty. Thai names are stored only when they differ from English, since the Thai localization keeps most names romanized.

## 2026-11-09 — Firebase backup import

The signed-in Back Office can now import a backup into Firestore with the same add-only rule as the local sandbox: every record is validated and every ID is checked against existing data before any write. `ContentStore.saveAll` writes the whole import in one Firestore write batch, so a failed import writes nothing and needs no recovery step. One batch accepts at most 500 writes; larger backups are rejected before writing instead of being split, because a split import could stop halfway. The ID check and the batch are not one transaction, so a record created with the same ID between them would be overwritten; with a single owner this is accepted. Firestore rules are unchanged: owners may already create records whose `id` matches the document ID.

## 2026-11-09 — shadcn/ui setup and Back Office notifications

shadcn/ui is initialized for Vite with the Radix base and the `nova` preset (`components.json`), using the `@/*` path alias. The generated global CSS was trimmed so it cannot restyle the existing theme: the Geist font import and the `@layer base` rules that set `body` colors, `html` font, and global border/outline colors were removed, `--font-sans` points at the existing `--font-family`, and the shadcn color tokens use the dark palette directly in `:root` because the app has a single dark theme. The Sonner `Toaster` is fixed to `theme="dark"` instead of reading `next-themes`, so no theme provider is added.

Back Office editor feedback (save, publish, delete, backup, import, and unsaved-change warnings) uses Sonner toasts, which are announced through an ARIA live region instead of moving focus to an inline message. The sign-in form keeps its inline error because it belongs to that form.

## 2026-11-09 — Custom select instead of native select

All dropdowns in the Back Office and the public explorer use `AppSelect`, a thin wrapper over the shadcn/Radix Select. Native `<select>` menus are drawn by the operating system and cannot follow the archive palette. The wrapper keeps one style for every context (cream surface, square corners, the shared focus outline, and the invalid-field border), with size adjustments for the explorer filters. Radix reserves the empty string for "no value", so empty options such as "Any era" or "Choose a record" use an internal stand-in value that is converted back to `""` before it reaches filters or form data; stored records and URL state are unchanged.

## 2026-11-09 — Back Office location and remembered owner

The Back Office keeps its location in the URL hash: `#bo`, `#bo/<collection>`, or `#bo/<collection>/<id>`. A refresh reopens the same list or saved record, and browser back/forward moves between Back Office views (blocked while the open record has unsaved changes). Unsaved new records are not restored because they have no ID; an unknown ID falls back to the collection list.

After the `owners/<uid>` check passes, the uid is remembered in `localStorage`. On the next load, once Firebase Auth restores that same user, the editor opens without waiting for the owner read; the read still runs in the background and returns the user to the access screen if the owner document is gone. Signing out clears the remembered uid. This is a display shortcut only: Firestore rules remain the access boundary for every read and write.

## 2026-11-11 — Timeline preview in the Back Office overview

The Back Office overview renders the same `Timeline` component as the public explorer (moved to `src/features/explorer/Timeline.tsx`) so the preview always matches public layout and projection. It is built with `buildPublishedArchive(records, { includeDrafts: true })` from the lists the editor already loaded, so it adds no Firestore reads. The option defaults to off: public callers still receive published records only. In the preview, draft events carry `draft: true` and show a dashed card with a "Draft" badge; an "Include drafts" switch shows the published-only view. Selecting a card opens that event in the editor instead of the public detail dialog.

## 2026-11-12 — Signed years, adaptive ticks, and timeline lanes

Lore years are relative to the present: negative values are the past, `0` is the present, and positive values are the future. Cards and dialogs read "500 years ago" or "1,000 years after present"; the axis uses short signed labels (`−5,000`, `Present`, `+1,000`). Earlier labels used the absolute value, so past and future years looked identical. Back Office year fields state this convention.

Axis ticks are round numbers (1, 2, or 5 × 10ⁿ years) chosen so labels stay at least 90 px apart at the current zoom, and ticks inside a compressed break are skipped. The timeline's `laneCount` now sets the reserved card rows, and an event's preferred lane may use any of them; crowded dates still add rows. Panning stops at the timeline ends, and the view starts with the whole axis fitted to the viewport (within the minimum zoom). Event dates outside a linked timeline still render at the nearest edge, so the Back Office warns after such a save rather than blocking it.
