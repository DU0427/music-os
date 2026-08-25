# Music OS Architecture Audit (Phase 0)

## 1) Current State (as of active repository scan)

- Electron + Vite is now the active desktop runtime baseline.
  - `electron/main.ts` owns the desktop lifecycle.
  - `electron/preload.ts` exposes the typed renderer boundary.
  - `src/renderer/main.tsx` is the Vite renderer entry.
- The legacy Next.js prototype remains in the repository as a visual migration reference only.
- The legacy visual prototype is DOM-driven with `motion` and a 2D canvas; it is retained as
  migration reference only:
  - `src/components/SpatialCanvas.tsx` implements a 2D canvas particle background.
  - `src/components/SpaceRouter.tsx` mounts space views via animated DOM components.
- Legacy context state remains in the reference code:
  - `src/lib/store.tsx` provides `AppProvider` and `useAppStore`.
  - Many legacy space/song/ui example views mutate space/song/ui state through that context.
- Server-side provider boundary is implemented under Electron main (`electron/providers`);
  the legacy `src/server/music/*` contracts and adapters remain migration references only.
  - `src/shared/music/providers.ts` defines normalized provider contracts.
  - `electron/providers/registry.ts` owns adapter selection and error mapping.
  - `electron/providers/mock/index.ts` provides a deterministic mock playable stream for provider contract validation.
- Electron shell and minimal typed IPC now exist:
  - `app:ready` and `app:ping` are handled in Electron Main.
  - Renderer access is limited to the `musicOS` preload API.
- Persistent data layer and audio pipeline are partially implemented and now have baseline checks:
  - SQLite repository and migration scaffolding exist in `electron/database`.
  - Renderer-local playback and analysis exist in `src/renderer/audio/*`.

## 2) Target Architecture (aligned with provided objective)

- Desktop shell: Electron.
- Renderer: React + TypeScript + Zustand + R3F.
- Audio: Web Audio API in renderer process.
- Data persistence: SQLite in Electron main process.
- Integrations: music providers isolated in `electron/providers`, not renderer.
- IPC: explicit typed contracts between main, preload, renderer.
- Rendering: a single, persistent R3F canvas owned by `WorldManager`.
- Animation: GSAP transition envelopes plus R3F frame-local interpolation.

## 3) Migration Decision

Decision: move from Next.js to Electron + Vite + React + R3F as the long-term runtime now.

Rationale:
- Keep one runtime only, avoiding split ownership with Next.js routes and App Router.
- Satisfy security boundary requirements (Node APIs and secrets stay in main/preload).
- Enable continuous 3D scene ownership and explicit process boundaries.
- Reduce long-term migration debt from DOM 3D mockups to production 3D runtime.

Non-goal in this phase:
- Do not preserve a parallel Next.js renderer after migration baseline is in place.

## 4) Key Evidence Mismatches to Fix

- Legacy DOM scene modules (`src/components/*`) should remain reference-only and not be routed into the active renderer.
- `typed IPC` and preload contract should remain stable while features expand.
- Audio and rendering quality still need long-run verification beyond smoke checks (GUI flow and profiling).

## 5) Phase 0 Deliverables for Stage Handoff

- Current architecture map: source files listed above.
- Target architecture map: Electron + Vite + React + R3F runtime.
- Migration strategy: single-pass shell-first migration, preserving visual concepts as migration assets.
- Risk log: documented below in `docs/phase-0-plan.md`.
- Stage plan: explicit per-phase execution list in `docs/phase-0-plan.md`.
- Stage handoff tracker: `docs/goal-progress.md`.
- Phase 1 bootstrap status: baseline shell files are added and wired to typed IPC (`app:ready`, `app:ping`) for runtime handoff.
- Phase 2 baseline status: a single persistent R3F Canvas now owns `WorldManager`, camera interpolation, Home Space, Music Core, and the initial Midnight world shell.
- Phase 3 baseline status: renderer-local playback uses a real local file, Web Audio analysis,
  smoothed metrics, and frame-local visual bindings without storing FFT arrays in Zustand.
- Phase 4 baseline status: Midnight City World includes procedural atmosphere, skyline,
  memory particles, spatial song labeling, audio response, and a spatial return object.
- Phase 5 baseline status: SQLite migrations and repositories run in Electron Main, with typed
  CRUD IPC contracts for tracks, history, memories, world settings, and playback state.
- Phase 6 baseline status: provider contracts and a Main-process registry exist; a deterministic
  mock stream adapter is active while NetEase/QQ adapters remain unimplemented.

## 6) Runtime Verification Contract

- Baseline smoke gate: `docs/smoke-contract.md`
- Required baseline checks:
  - `window.musicOS` bridge availability.
  - `app:ready` and `app:ping` IPC success.
  - renderer shell mount + audio input presence.
  - home-to-midnight transition and Song World overlay visibility.
  - no preload-load/render startup failure signals.

## 7) Stage 0 Read-Continue References

- Primary reference: `C:\Users\duainan\.codex\attachments\24b7fddc-fd62-4715-bcb1-bfeee2b9a6a0\pasted-text-1.txt`.
- Continuity reference: `C:\Users\duainan\.codex\attachments\5b494acb-a286-4e50-9267-26db26ad4cfd\pasted-text-1.txt`.
- Vision/interaction baseline: `C:\Users\duainan\.codex\attachments\67ea7f5d-7b63-4409-b8c0-32d2accfcc22\pasted-text.txt`.
- Active product-slice continuation: `C:\Users\duainan\.codex\attachments\cb278536-ac97-411f-88b8-eb23ed075eee\pasted-text-1.txt`.
- Playback/session continuity spec extension: `C:\Users\duainan\.codex\attachments\943ce9cb-7dc4-4f07-8399-cf798852a396\pasted-text-1.txt`.
- Latest playback continuity + product polish continuation: `C:\Users\duainan\.codex\attachments\beb857a0-692b-49e8-9dea-843d15121189\pasted-text-1.txt`.
