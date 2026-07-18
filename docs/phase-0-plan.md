# Phase 0 Audit Plan and Decision Register

## 0) Objective

Before touching business features, complete runtime alignment:
- read and verify reference requirements
- confirm repository baseline
- define Electron migration boundary and first vertical slice

## 1) Completed In-Repo Audit (2026-07-17)

Audited files used for evidence:
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/lib/store.tsx`
- `src/lib/mock-data.ts`
- `src/components/SpatialCanvas.tsx`
- `src/components/SpaceRouter.tsx`
- `src/components/TopNav.tsx`
- `src/components/MusicCore.tsx`
- `src/components/spaces/*.tsx`
- `src/server/music/contracts.ts`
- `src/server/music/index.ts`
- `src/server/music/providers/*/README.md`

## 2) Decision Register

- Should we migrate directly to Electron + Vite + React?
  - Yes. Keep Next.js as reference only.
- Should Next.js be kept as transition renderer?
  - No long-term. If temporary, only as temporary bridge and not two permanent runtimes.
- Process boundary (Main/Preload/Renderer)
  - Main owns Node APIs and DB.
  - Preload exposes signed IPC APIs only.
  - Renderer remains browser-sandboxed for UI/3D/audio analysis.
- SQLite location
  - Main process only, accessed via repository functions.
- Audio/analysis location
  - Renderer owns playback graph and analysis hooks, and emits stable metrics to UI/state.

## 3) Risk List (High to Low)

1. Rebuilding space transitions without visible jumps.
2. Preserving artistic intent while replacing DOM scenes with R3F.
3. WebGL memory/resource cleanup during scene switches.
4. State migration risk from Context to Zustand.
5. Provider/API data leakage into renderer.

## 4) Stage 1-7 Execution Strategy

### Stage 1 - Shell + IPC
- Implement Electron main/preload/renderer startup.
- Typed IPC channels for `app.ready`, `app.ping`, `app.error`.
- Add dev/build scripts and minimum safety settings.
- Include startup diagnostics forwarding through `app.error` from renderer exceptions and bootstrap failures.
- Completed baseline files:
  - `electron/main.ts`
  - `electron/preload.ts`
  - `electron/ipc/channels.ts`
  - `electron/ipc/handlers.ts`
  - `electron/windows/main-window.ts`
  - `vite.renderer.config.ts`
  - `tsconfig.electron.json`
  - `src/renderer/App.tsx`
  - `src/renderer/main.tsx`
  - `src/renderer/index.html`
  - `src/shared/ipc/*`
  - `scripts/electron-smoke.cjs` (reportError exposure + ack check)

### Stage 2 - Runtime + World Manager
- Introduce persistent R3F canvas.
- Add `WorldManager`, `CameraRig`, and stable scene switching model.
- Keep space data as in-memory domain first.
- Baseline implemented:
  - `src/renderer/worlds/WorldManager.tsx` owns the persistent Canvas.
  - `src/renderer/worlds/SpaceBackdrop.tsx` provides deterministic low-cost stars.
  - `src/renderer/camera/CameraRig.tsx` interpolates camera position, look target, and FOV.
  - `src/renderer/store/runtime.ts` owns the minimal space state in Zustand.
  - `src/renderer/worlds/HomeSpace.tsx` and `src/renderer/core/MusicCore.tsx` provide the Home slice.
  - `src/renderer/worlds/MidnightCityWorld.tsx` provides the first destination shell.

### Stage 3 - Audio Engine
- Add local playback flow and AudioContext chain.
- Add analyzer + smoothed feature extractors.
- Link features to motion values without per-frame global state writes.
- Baseline implemented:
  - `src/renderer/audio/AudioEngine.ts` owns the media element, Web Audio node graph,
    smoothed band metrics, playback events, and cleanup.
  - `src/renderer/audio/store.ts` exposes playback metadata and commands through Zustand.
  - `src/renderer/ui/AudioDock.tsx` accepts real local audio files and provides playback/progress.
  - Music Core, lighting, atmosphere, and particle systems consume metrics in R3F frame loops.

### Stage 4 - First World (Midnight City)
- Build full flow: core entry -> transition -> world response -> return.
- Implement atmosphere, fog, light layers, and basic spatial UI.
- Baseline implemented:
  - `src/renderer/worlds/CitySilhouette.tsx` provides a procedural distant city.
  - `src/renderer/worlds/MemoryField.tsx` provides gold memory particles.
  - `src/renderer/ui/SongWorldOverlay.tsx` provides minimal spatial song context.
  - `src/renderer/worlds/MidnightCityWorld.tsx` provides the return object and audio-responsive energy field.

### Stage 5 - SQLite
- Create main-process DB layer: migrations + repository + error mapping.
- Provide typed IPC access methods to renderer.
- Baseline implemented:
  - `electron/database/connection.ts` opens SQLite under Electron `userData` and enables WAL/foreign keys.
  - `electron/database/migrations/index.ts` creates migration bookkeeping and the five local data tables.
  - `electron/database/repositories/music-repository.ts` provides normalized CRUD methods and closes cleanly.
  - `src/shared/ipc/music.ts`, preload, and Main handlers expose serializable typed operations.
- Remaining packaging risk: `better-sqlite3` is native and must be rebuilt for the target Electron ABI when packaging.

### Stage 6 - Provider Abstraction
- Validate and finalize provider contracts and adapters.
- Start with one provider implementation path, mark unsupported paths clearly.
- Baseline implemented:
  - `src/shared/music/providers.ts` defines normalized references, search, detail, playable-source, capability, and error contracts.
  - `electron/providers/registry.ts` owns adapter selection and error mapping in Main.
  - `electron/providers/mock/index.ts` is an explicitly labeled metadata-only contract adapter.
  - NetEase and QQ remain unimplemented until authorized API access is available.

### Stage 7 - Quality
- Add diagnostics and lifecycle cleanup.
- Confirm performance ceilings and long-run stability.
- Baseline implemented:
  - `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
  - Electron navigation/window hardening and renderer-process diagnostics are enabled.
  - R3F DPR is capped, WebGL has an explicit fallback, audio nodes are disposed, and
    manually allocated particle resources are released on world teardown.
  - Camera transitions are cancellable GSAP envelopes over frame-local interpolation.
- Remaining verification limitation: a GUI playthrough with a user-selected local audio file
  and long-run GPU profiling still require an interactive desktop session.

### Stage 7.1 - Smoke Contract
- Add a single source of truth for runtime verification:
  - `docs/smoke-contract.md`
- Required pass criteria:
  - preload bridge available as `window.musicOS`
  - ready/ping IPC round-trip
  - shell mount and file input present
  - home-to-midnight transition and song-world overlay visibility
  - no preload/load/process startup failure signals

## 5) First Vertical Slice Scope

- `package.json` (scripts and dependency migration base)
- `electron/` (new shell layer)
- `src/shared/ipc/` (types/contracts)
- `src/renderer/` (new entry shell + world host)
- `src/lib/store` migration from Context to Zustand slice only for currently used state

## 6) Stage 2 Gate

- The Canvas remains mounted while `currentSpace` changes.
- Space changes update the world group and camera targets without a page navigation or instantaneous camera teleport.
- Renderer world code has no Node.js, SQLite, provider, or platform-secret dependency.
- Audio analysis and real playback remain explicitly deferred to Stage 3.

## 7) Gate for Stage 1 Start

- No audio/network/API business rules until shell boundary is green.
- One source of truth for state + IPC contract before adding feature modules.
- Keep existing Next.js files untouched for now; treat them as design reference.

## 8) Objective Evidence and Stage 0 Handoff

Read-before-continue requirements are now recorded with exact references:

  - Reference input C:\Users\duainan\.codex\attachments\24b7fddc-fd62-4715-bcb1-bfeee2b9a6a0\pasted-text-1.txt
- Reference input C:\Users\duainan\.codex\attachments\5b494acb-a286-4e50-9267-26db26ad4cfd\pasted-text-1.txt
  - Product vision, interaction constraints, migration decision, and phase plan were extracted from this file.
- Reference input C:\Users\duainan\.codex\attachments\67ea7f5d-7b63-4409-b8c0-32d2accfcc22\pasted-text.txt
  - Design direction and visual philosophy constraints were used as alignment baseline for architecture.
- Reference input C:\Users\duainan\.codex\attachments\943ce9cb-7dc4-4f07-8399-cf798852a396\pasted-text-1.txt
  - Playback/session continuity, metadata persistence, and latest smoke completion checkpoints were extracted from this file.
- Reference input C:\Users\duainan\.codex\attachments\822449ee-5f5b-433f-be06-c341b73f8005\pasted-text-1.txt
  - Current Goal: Track Duration and Playback Session Persistence Hardening.

Current repository evidence for the Stage 0 boundary:

- Active runtime is Electron + Vite + React + R3F entrypoint (electron/main.ts, src/renderer/main.tsx, src/renderer/worlds/WorldManager.tsx).
- Next.js entry is preserved but isolated as migration reference (src/app/page.tsx).
- Main/Preload/Renderer boundaries are split and typed (electron/ipc/*, electron/preload.ts, src/shared/ipc/*).
- SQLite, migrations, and repositories are in main process only (electron/database/*).
- Provider adapters are in main process and abstracted from renderer contracts (src/shared/music/providers.ts, electron/providers/*).
- IPC smoke contract and runtime checks exist in docs/smoke-contract.md.

Stage 0 completion criteria for execution lock:

- Confirm migration decision is accepted: Electron + Vite + R3F is the only active runtime.
- Confirm no new business feature work before Stage 1 boundary gates are met.
- Confirm each Stage 1-7 entry point has explicit task ownership, risk, and evidence row.
- Confirm this document remains the authoritative Stage 0 handoff artifact.
- Confirm `docs/goal-progress.md` is present and is updated with the active Stage 0 checkpoint and deferred items.

Immediate next tasks (before Stage 1 execution):

1) [x] Reconfirm typed IPC contracts against runtime usage before any further feature patches.
2) Continue with Stage 1-7 execution tasks only when the above evidence row checks remain green in `docs/smoke-contract.md`.
