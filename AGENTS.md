# AGENTS.md

Instructions for AI coding agents working on Teyvat Chronicle.

## Project Summary

- Requirements source: `docs/REQUIREMENT.md`. It describes a proposed product and draft roadmap; distinguish planned features from implemented behavior.
- Product goal: an interactive Genshin Impact lore explorer connecting events, characters, eras, regions, and sources. The public experience includes a world timeline, character timeline, and era/region timeline backed by shared data; a private back office manages that data.

## Tech Stack (quick reference)

- Proposed frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, and Radix UI.
- Proposed timeline: custom SVG + HTML with D3 Scale and D3 Zoom; Motion for animation.
- Proposed app/data tools: Zustand, TanStack Query, Firebase Firestore and Authentication, Zod, React Hook Form, and MiniSearch.
- Hosting options in the requirement: GitHub Pages or Firebase Hosting. Cloud Storage for back office uploads is optional.
- Some tools are now installed for Phase 1. Check `package.json` before using a dependency; the other requirement proposals are not yet implemented.

## Commands

- `pnpm dev`: run the local Vite app.
- `pnpm exec vitest run src/timeline/projection.test.ts`: focused timeline projection test.
- `pnpm exec vitest run src/content/workflow.test.ts`: focused Back Office draft/publish flow test.
- `pnpm exec vitest run src/features/explorer/explorer.test.ts`: focused public filtering and deep-link flow test.
- `pnpm exec eslint src` and `pnpm exec prettier --check <files>`: code checks.
- `pnpm build`: typecheck and production build when warranted by the change.

## Project Structure

- `docs/REQUIREMENT.md`: product requirements, proposed data model, and draft roadmap.
- `docs/image/REQUIREMENT/`: images referenced by the requirements.
- `src/timeline/`: mock chronology, timeline types, and the break-aware projection.
- `src/App.tsx`: public/Back Office route switch; `src/styles.css`: shared visual theme.
- `public/images/events/`: local illustrative event art.
- `src/lib/firebase.ts`: optional Firebase app initialization; no live project is connected.
- `src/content/`: Phase 2 Zod schemas, templates, and local/Firestore repositories.
- `src/features/bo/`: Back Office UI, local development sandbox, and owner sign-in gate.
- `src/features/explorer/`: public data adapter, published Firestore loader, filters, URL state, and explorer UI.
- `firestore.rules`: proposed server-side access policy; it has not been deployed or verified against a real project.
- Firebase collections remain proposed resources, not deployed data.
- Proposed Firestore collections: `timelines`, `events`, `characters`, `eras`, `regions`, `sources`, `relationships`, and `settings`.

## Architecture Rules

- Use one timeline data model and timeline engine for world, character, and era/region views. Apply filters and focus behavior to shared event data instead of maintaining separate copies of events.
- Represent lore time with numeric positions when estimable and `null` when unknown. Do not use JavaScript `Date` as the primary timeline value; keep time precision separate from lore certainty.
- Design timeline rendering for zoom, pan, point/range events, and configurable breaks that remain visible to the reader. Keep display details separate from event content and time data.
- Keep event links to timelines, eras, regions, characters, and sources explicit. Use relationships when the connection needs metadata such as relation type or importance.
- Preserve source references and distinguish confirmed lore from inference or theory. Keep draft content out of the public explorer until published.
- Support the image sources named in the requirement: assets under `public/images/`, permitted external URLs, and optional Cloud Storage uploads through the back office.
- The back office is private and intended for an authenticated owner. Treat spoiler controls, character comparison, story mode, and other later-phase features as planned work until their scope is approved.

## Working Conventions

- **Agent collaboration and approval:** Think independently to understand the task, identify risks, and prepare a recommendation, but present that recommendation and wait for explicit approval before making changes, executing a plan, or taking an external action. Do not decide and act beyond the user's explicit scope.
- If work cannot be completed safely or clearly—because requirements, authority, access, consequences, or a technical constraint are unclear—ask first. Do not force a workaround that changes scope or assumptions.
- Ask for help, request clarification, or use available collaboration when it would improve confidence; do not carry uncertainty alone.
- State the relevant fact and ask the next useful question rather than repeatedly apologizing. Confirmation is more useful than an apology.
- Don't add features, refactors, or abstractions beyond what's asked. This project favors small, focused, calm implementations (see README "Development Principles").
- When adding a new event or relationship concept, keep the data schema, timeline/filter handling, and back office editing flow aligned. Add tests only when the testing policy below calls for them.
- **Testing policy:** Do not create or update automated tests for UI-only work (visual styling, layout, presentation components, or page appearance); the user performs that verification manually. For timeline calculations, filtering, content validation, Firestore data flows, or publish behavior, create or update automated tests only when they cover an important flow or a meaningful regression risk. Prioritize complete flows such as displaying an event in the correct timeline, filtering by character or era, resolving uncertain time, and keeping drafts out of public results. Avoid trivial, narrow, or implementation-mirroring tests; if a test would add little confidence, do not create one. Only change a UI test when the user explicitly asks for it or a UI change also changes non-visual behavior.
- **UI-only changes — verification checklist:**
  1. Do not write or update tests.
  2. Do not run `pnpm test` (full or focused), `pnpm build`, or `tsc -b`.
  3. Do not start the dev server or drive a browser (Playwright, Chrome automation) unless the user asks.
  4. Run only Prettier and ESLint on the touched files, e.g. `pnpm exec prettier --write <files>` and `pnpm exec eslint <files>`.
  5. Hand off: tell the user what to check by eye (pages, widths such as 360px and 1280px, states), and name any existing test that may break because visible text or markup changed.
- For timeline logic, content schema, or publishing changes, run the focused existing test command(s) that cover the changed behavior, if the project has tests configured. Do not run a full test suite by default.
- **Build verification:** Do not run `pnpm build` by default for small, isolated work that touches only a few files, and never for UI-only changes. Run it only when the change's risk warrants it, the user requests it, or it materially validates the work; otherwise, tell the user that they can build locally.
- For a multi-step implementation plan, when a build is warranted, run `pnpm build` once during final verification—not after each step.
- Record non-obvious architectural choices in `docs/DECISIONS.md`, not as scattered code comments. Update the authoritative topic document when a decision changes its model or policy.
- Track detailed implementation status in `docs/PROGRESS.md`. Read its
  **Open work index** (every item not `Done`) first and open only the section
  you need; when a status changes, update the item's row and keep the index in
  sync. `README.md` carries the high-level MVP/post-MVP overview; keep its
  summary and roadmap aligned with material status changes.
- Log completed non-UI units of work by appending a short entry to the current month's file, `docs/log/YYYY-MM.md` (rules in `docs/COMPLETE-LOG.md`). Do not update the completion log for UI-only visual, layout, or presentation changes. Do not read earlier months to add an entry.

## Git Commit Message

- Before making any change, present the proposed scope and wait for explicit user approval. This applies even to clear, small, low-risk, or cosmetic changes.
- Ask before proceeding whenever scope is ambiguous, an action is destructive or irreversible, adds dependencies, changes external services, affects data outside the workspace, or cannot be completed as requested.
- After completing code changes:
  - Summarize what changed.
  - List important files changed.
  - Mention any remaining concerns or follow-up work.
  - Suggest a concise Git commit message based on the actual changes.
  - Use Conventional Commits format when appropriate.
  - Never run `git commit` unless explicitly requested.
- Never add AI/agent attribution to commits, tags, pull requests, or release notes (for example `Co-Authored-By: Claude …` or "Generated with …"). GitHub counts co-author trailers as repository contributors, and a pushed trailer cannot be removed without rewriting history.
- Never run `git push` (branches, tags, or `--force`) or create a GitHub Release. Prepare the commit or tag locally, then hand the user the exact push/release command to run.

```
You are a senior software engineer reviewing git changes.

Your task:
Generate a high-quality commit message based ONLY on the relevant git changes.

Rules:

1. If staged changes exist (git diff --cached), use ONLY staged changes.
2. If no staged changes exist, use the regular git diff.
3. Never mix staged and unstaged changes.
4. Use Conventional Commit format.
5. Include scope if identifiable (e.g., engine, content, save, player, bo, audio).
6. If Jira keys appear in the diff, include them after the scope.
7. Keep subject line concise (<= 100 chars).
8. Focus on business impact, not syntax noise.
9. Ignore whitespace-only or formatting-only changes.

Output format: feat(feature_name): short summary

Example:
fix(save): keep RNG results in save so reloading never changes event outcomes
```
