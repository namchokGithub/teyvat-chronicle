# teyvat-chronicle

---

An interactive Genshin Impact lore timeline explorer, connecting Teyvat's history, characters, and events.

## Current status

The public explorer now supports search, world/character/era-region views, lore certainty filters, source details, and event deep links. Phase 2 provides a development-only local Back Office and code for Firestore, owner authentication, and draft/publish management. No Firebase project is connected yet, so public pages use clearly labeled sample records. See [Progress](docs/PROGRESS.md) for remaining work and later phases.

Phase 4 interaction work adds character focus, related event navigation, stable card placement, and keyboard timeline controls. Visual and large-data verification remain open.

Phase 5 code adds a relationship view, character comparison, a chronological story reader, and spoiler filters. The Back Office can download a JSON backup; the local sandbox can import only new records from a validated backup. Spoiler labels and Firebase import remain open work.

## Run locally

Requires Node.js and pnpm.

```sh
pnpm install
pnpm dev
```

The explorer works without Firebase credentials. When a Firebase project is available, copy `.env.example` to `.env.local` and fill in its values. It then queries published Firestore records; live access still needs project setup and verification.

Open `/#bo` while running `pnpm dev` to try the local Back Office. Its records stay in your browser and are separate from the public mock timeline. On a deployed build, the Back Office requires Firebase configuration and an authorized owner account. See [Firebase setup](docs/FIREBASE-SETUP.md).

---

© _2026 Namchok Singhachai_. Teyvat-chronicle is released under the [MIT License](LICENSE).
