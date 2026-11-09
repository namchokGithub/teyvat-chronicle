# Teyvat Chronicle

---

An interactive Genshin Impact lore timeline explorer, connecting Teyvat's history, characters, and events.

## Current status

The public explorer supports search, world/character/era-region views, lore certainty filters, source details, and event deep links. Phase 1 Firebase connection and timeline checks are complete per the owner's report. With Firebase configuration, the public explorer reads published records; without it, the app uses labeled sample records. Phase 2 provides owner authentication, forms for every content collection, and draft/publish management. See [Progress](docs/PROGRESS.md) for live data and permission checks still open in later phases.

Phase 4 interaction work adds character focus, related event navigation, stable card placement, and keyboard timeline controls. Visual and large-data verification remain open.

Phase 5 code adds a relationship view, character comparison, a chronological story reader, and spoiler filters. The Back Office can download a JSON backup; the local sandbox can import only new records from a validated backup. Spoiler labels and Firebase import remain open work.

## Run locally

Requires Node.js and pnpm.

```sh
pnpm install
pnpm dev
```

The explorer works without Firebase credentials. For a new environment, copy `.env.example` to `.env.local` and fill in its values to query published Firestore records.

Open `/#bo` while running `pnpm dev`. With Firebase configured, sign in as an authorized owner. Without Firebase configuration, development mode offers a local sandbox whose records stay in the browser and do not appear on the public sample timeline. See [Firebase setup](docs/FIREBASE-SETUP.md).

To create a timeline, open **Timelines → New**, enter an ID, title, start/end years, and optional breaks, then Save or Publish. Create and publish a **Source** before publishing an **Event**; in the event form, select that timeline and source under **Linked records**. Only published records appear in the Firebase-backed public explorer.

## Data sources

Character and region seed data comes from [genshin-db](https://github.com/theBowja/genshin-db) (MIT, © 2020 theBowja). [paimon-moe](https://github.com/MadeBaruna/paimon-moe) (MIT, © 2021 Made Baruna) is kept as a secondary reference for character metadata; no data is imported from it yet.

Both repositories are expected as read-only sibling checkouts (`../genshin-db`, `../paimon-moe`). To regenerate the import snapshot:

```sh
node scripts/import-genshin-db.ts
```

This writes `data/import/genshin-db-characters-regions.json` with draft characters, regions, and a `genshin-db` source record. Import it from the local Back Office sandbox (add-only); review and publish records there. Character icons link to HoYoverse's official CDN.

Genshin Impact names, text, and images belong to HoYoverse. This project is a fan-made lore explorer and is not affiliated with HoYoverse.

---

© _2026 Namchok Singhachai_. Teyvat-chronicle is released under the [MIT License](LICENSE).
