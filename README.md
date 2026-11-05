# teyvat-chronicle

---

An interactive Genshin Impact lore timeline explorer, connecting Teyvat's history, characters, and events.

## Current status

Phase 1 provides a React timeline prototype with mock records, zoom, pan, point and range events, a compressed break, image cards, and event details. Phase 2 adds a development-only local Back Office and code for Firestore, owner authentication, and draft/publish management. No Firebase project is connected yet. See [Progress](docs/PROGRESS.md) for remaining work and later phases.

## Run locally

Requires Node.js and pnpm.

```sh
pnpm install
pnpm dev
```

The timeline works without Firebase credentials. When a Firebase project is available, copy `.env.example` to `.env.local` and fill in its values. Live Firestore integration still needs project setup and verification.

Open `/#bo` while running `pnpm dev` to try the local Back Office. Its records stay in your browser and are separate from the public mock timeline. On a deployed build, the Back Office requires Firebase configuration and an authorized owner account. See [Firebase setup](docs/FIREBASE-SETUP.md).

---

© _2026 Namchok Singhachai_. Teyvat-chronicle is released under the [MIT License](LICENSE).
