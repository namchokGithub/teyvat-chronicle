# teyvat-chronicle

---

An interactive Genshin Impact lore timeline explorer, connecting Teyvat's history, characters, and events.

## Current status

Phase 1 code is in place: a React timeline prototype with mock records, zoom, pan, point and range events, a compressed break, image cards, and event details. Firebase is optional in code and is not connected yet. See [Progress](docs/PROGRESS.md) for remaining work and later phases.

## Run locally

Requires Node.js and pnpm.

```sh
pnpm install
pnpm dev
```

The timeline works without Firebase credentials. When a Firebase project is available, copy `.env.example` to `.env.local` and fill in its values. The Firestore data flow is planned for Phase 2.

---

© _2026 Namchok Singhachai_. Teyvat-chronicle is released under the [MIT License](LICENSE).
