# Electron Smoke Contract

## Purpose

This document defines the authoritative runtime checks for the Electron desktop migration baseline.
It captures the minimum verified behavior for a successful smoke gate and is aligned with the
phase-0 goals (main/preload boundary, renderer mount, and first world transition).

## Baseline Run Command

- `npm run build:renderer`
- `npm run build:electron`
- `($env:ELECTRON_RUN_AS_NODE=$null; npm run smoke:electron)` (required in this environment to avoid running Electron in Node-only mode)

Run commands are expected to be executed against the same repository snapshot as the active
`docs/goal-progress.md` checkpoint.

## Expected Smoke Contract

The smoke script (`scripts/electron-smoke.cjs`) must pass only when all of the following
conditions are satisfied in the JSON payload printed by the harness:

- `result.apiType === 'object'`
- `result.canvas === true` **or** `result.webglFallback === true`
- `result.audioInput === true`
- `result.playbackStateReadable === true`
- `result.playbackStateWritable === true`
- `result.hasHistoryAdd === true`
- `result.hasHistoryUpdate === true`
- `result.hasHistoryList === true`
- `result.listeningHistoryRoundTrip === true`
- `result.trackListReadable === true`
- `result.trackDurationMetadataRoundTrip === true`
- `result.listeningHistoryApiAvailable === true`
- `result.audioSessionReadable === true`
- `result.audioSessionState?.canPlay === true`
- `result.providerSearchContracts === true`
- `result.shellVisible === true`
- `result.homeState === true`
- `result.hasPrepareToCloseListener === true`
- `result.prepareToCloseAcked === true`
- `result.ping.message === 'ack:electron-smoke'`
- no `preloadError`
- no `failedLoad`
- no `renderProcessGone`
- no CSP warning text in `consoleMessages`
- transition path:
  - `transitionResult.beforeDetected === true`
  - `transitionResult.afterDetected === true`
  - `transitionResult.songWorldOverlayVisible === true`
- `transitionResult.conflictIgnored === true`
- `transitionResult.afterReturnDetected === true`
- `transitionResult.repeatedTransitionHealthy === true`
- `playbackStressResult?.ok === true`
- `playbackStressResult?.frameStats?.frameProfilerSupported === false || playbackStressResult?.frameStats?.frameStabilityOk === true`
- `playbackStressResult?.cycleCount >= 6`
- `playbackStressResult?.allCyclesAdvanced === true`
- `playbackStressResult?.heapSupported === false || playbackStressResult?.heapStabilityOk === true`
- `playbackStressResult?.heapBytesMax - playbackStressResult?.heapBytesFromStart <= 64 * 1024 * 1024` (when `heapSupported`)
- `playbackStressResult?.frameStats?.sampleCount` can be used for trend diagnosis (non-fatal when not supported).
- `playbackStressResult?.eventLoopStats?.supported === false || playbackStressResult?.eventLoopStats?.loopHealthOk === true`
- `playbackStressResult?.eventLoopStats` can be used for main-thread jitter trend diagnosis.

## Stage Gates

Use this matrix to validate cross-stage progress before broader playtest:

### Stage 1 Gate - Shell + Boundary

Must validate:

- App window can be created with isolated renderer context.
- `app:ready` and `app:ping` are callable from renderer through `window.musicOS`.
- `ready()` returns a serializable payload with `appName` and `startedAt`.
- `window.musicOS.reportError()` is callable and returns `{ acknowledged: true }` for diagnostic submission.
- No startup diagnostics indicate preload/load failures.

Evidence:

- `npm run build:renderer`
- `npm run build:electron`
- `npm run smoke:electron`
- log payload includes `result.apiType === 'object'`
- log payload includes `result.ping.message === 'ack:electron-smoke'`
- `window.musicOS.reportError` is exposed (function check)
- `preloadError`, `failedLoad`, `renderProcessGone` are null/absent

### Stage 6 Gate - Provider Boundary

Must validate:

- Provider search/track/playable contracts are reachable through `window.musicOS`.
- Search query returns normalized provider references and track records.
- Track detail call returns a structured `providerId/reference` envelope.
- Playable source call should be successful when the provider declares `playableSource` capability.
- For providers that still only expose metadata, `playableSource` should be explicit `NOT_IMPLEMENTED`.

Evidence:

- `npm run smoke:electron`
- log payload includes `result.providerSearchContracts === true`
- `providerTrack`, `providerPlayable`, and `providerSearch` channel contracts are available from `window.musicOS`.

### Stage 2 Gate - Spatial Runtime Baseline

Must validate:

- One persistent R3F canvas instance is present.
- Home and Midnight worlds switch through `currentSpace` updates without page reload/navigation.
- Camera transition appears continuous (no frame-teleport symptom in smoke/manual spot check).

Evidence:

- `docs/smoke-contract.md` transition checks remain green:
  - `transitionResult.beforeDetected === true`
  - `transitionResult.afterDetected === true`
  - `transitionResult.conflictIgnored === true`
  - `transitionResult.afterReturnDetected === true`
- `result.shellVisible === true`
- `result.homeState === true`
- state checks are resolved from hidden diagnostics attributes:
  - `#audio-session-debug[data-current-space="home"]` at baseline
  - `#audio-session-debug[data-current-space="midnight"]` after transition
  - `#audio-session-debug[data-is-transitioning="0"]` for settle checks

### Stage 3 Gate - Audio Reactive Layer

Must validate:

- Local file playback can be selected and audio graph initializes.
- Playback metrics become non-zero for active tracks.
- Visual feedback in at least one world layer changes with music energy.

Evidence:

- `src/renderer/audio/*` present and wired to analyzer graph
- smoke still passes `audioInput === true`
- smoke passes repeated local playback cycle with long-run health:
  - `playbackStressResult?.ok === true`
  - `playbackStressResult?.cycleCount >= 6`
  - `playbackStressResult?.allCyclesAdvanced === true`
  - `playbackStressResult?.frameStats?.frameProfilerSupported === false || playbackStressResult?.frameStats?.frameStabilityOk === true`
  - `playbackStressResult?.eventLoopStats?.supported === false || playbackStressResult?.eventLoopStats?.loopHealthOk === true`
- manual pass: change track energy and observe:
  - `src/renderer/core/MusicCore.tsx` motion/amplitude changes
  - `src/renderer/worlds/SpaceBackdrop.tsx` star size/opacity modulation
  - `src/renderer/worlds/CitySilhouette.tsx` building emissive response
  - `src/renderer/worlds/MemoryField.tsx` particle field response

### Stage 4 Gate - Song World Content

Must validate:

- Midnight City entry renders atmosphere, city structure, energy field, and spatial UI.
- Return flow to Home exists and is object-driven.

Evidence:

 - `#audio-session-debug[data-current-space]` transitions home -> midnight via scene object interaction
 - `#song-world-overlay` exists only in midnight space
- scene includes `MidnightCityWorld.tsx` components and `CitySilhouette`/`MemoryField`.

### Stage 5 Gate - Data Boundary

Must validate:

- SQLite migrations and repository code are present in main process.
- Renderer accesses persistence via shared IPC only.
  - Data contracts are callable from renderer:
    - `listTracks`
    - `upsertTrack`
    - `addListeningHistory`
    - `updateListeningHistory`
    - `listListeningHistory`
    - `getPlaybackState`
    - `savePlaybackState`
  - Smoke payload includes hard checks:
  - `result.trackListReadable === true`
  - `result.hasHistoryAdd === true`
  - `result.hasHistoryUpdate === true`
  - `result.hasHistoryList === true`
  - `result.listeningHistoryRoundTrip === true`
  - `result.listeningHistoryApiAvailable === true`
  - `result.playbackStateReadable === true`
  - `result.playbackStateWritable === true`
  - `result.audioSessionReadable === true`

Evidence:

- `electron/database/*`, `electron/ipc/*`, `src/shared/ipc/*` exist
- no renderer direct SQLite imports
- `preload` bridge only exposes explicit API surface

### Stage 7 Gate - Quality Baseline

Must validate:

- startup failures remain low-risk:
  - no CSP warnings
  - no repeated render process termination on repeated entry/exit transitions
- smoke output is stable after repeated execution.

Evidence:

- repeated successful `npm run smoke:electron` runs
- stable console payload shape across runs with contract fields unchanged

## Expected DOM Sentinels

The UI state checks are intentionally resilient to rendering drift:

- startup shell confirms:
  - `#root` exists
  - `#audio-session-debug[data-current-space="home"]`
- transition result confirms:
  - `#audio-session-debug[data-current-space="midnight"]`
  - `#audio-session-debug[data-is-transitioning="0"]`
  - `#song-world-overlay` exists

## Failure Classes and Next Actions

- `preloadError`:
  - build path mismatch, missing IPC module, or preload import issues.
  - Next action: inspect compiled `dist/electron/preload.js` and module graph.
- `failedLoad`:
  - invalid renderer URL/path or permission issues during `loadFile`.
  - Next action: inspect `out/renderer/index.html` and `main-window` URL/path policy.
- missing `audioInput` / missing world overlay:
  - input field or overlay not yet wired in renderer shell.
  - Next action: check `AudioDock.tsx`, `SongWorldOverlay.tsx`, runtime state transitions.
- transition checks fail:
  - IPC/DOM bridge unavailable to external automation, or runtime store not mutating to `midnight`.
  - Next action: inspect the space transition contract and event hook.

## Current Evidence Snapshot

- `2026-07-18 03:58 UTC` snapshot recorded in [`docs/goal-progress.md`](/d:/code/music-os/docs/goal-progress.md)
  - `npm run build:renderer` success.
  - `npm run build:electron` success.
  - `($env:ELECTRON_RUN_AS_NODE=$null; npm run smoke:electron)` success with `prepareToClose` idempotency path.
  - `result.apiType === 'object'`
  - `result.canvas === true`
  - `result.audioInput === true`
  - `result.trackListReadable === true`
  - `result.trackDurationMetadataRoundTrip === true`
  - `result.playbackStateReadable === true`
  - `result.playbackStateWritable === true`
  - `result.hasHistoryAdd === true`
  - `result.hasHistoryUpdate === true`
  - `result.hasHistoryList === true`
  - `result.listeningHistoryRoundTrip === true`
  - `result.listeningHistoryApiAvailable === true`
  - `result.audioSessionReadable === true`
  - `result.providerSearchContracts === true`
  - `result.shellVisible === true`
  - `result.homeState === true`
  - `result.ping.message === 'ack:electron-smoke'`
  - `result.reportErrorAcknowledged?.acknowledged === true`
  - `result.hasPrepareToCloseListener === true`
  - `result.prepareToCloseAcked === true`
  - `transitionResult.beforeDetected === true`
  - `transitionResult.afterDetected === true`
  - `transitionResult.conflictIgnored === true`
  - `transitionResult.afterReturnDetected === true`
  - `transitionResult.songWorldOverlayVisible === true`
  - `transitionResult.repeatedTransitionHealthy === true`
  - no `preloadError`
  - no `failedLoad`
  - no `renderProcessGone`
  - no CSP warning text in `consoleMessages`
  - fallback IPC handler path was used because `better-sqlite3` binding was unavailable in this environment; smoke gates still passed.

- `2026-07-18 03:50 UTC` snapshot recorded in [`docs/goal-progress.md`](/d:/code/music-os/docs/goal-progress.md)
  - `npm run build:renderer` success.
  - `npm run build:electron` success.
  - `($env:ELECTRON_RUN_AS_NODE=$null; npm run smoke:electron)` success with Stage 5.5 follow-up code.
  - `result.apiType === 'object'`
  - `result.canvas === true`
  - `result.audioInput === true`
  - `result.trackListReadable === true`
  - `result.trackDurationMetadataRoundTrip === true`
  - `result.playbackStateReadable === true`
  - `result.playbackStateWritable === true`
  - `result.listeningHistoryApiAvailable === true`
  - `result.listeningHistoryRoundTrip === true`
  - `result.providerSearchContracts === true`
  - `result.shellVisible === true`
  - `result.homeState === true`
  - `result.ping.message === 'ack:electron-smoke'`
  - `result.reportErrorAcknowledged?.acknowledged === true`
  - `result.hasHistoryAdd === true`
  - `result.hasHistoryUpdate === true`
  - `result.hasHistoryList === true`
  - `result.hasPrepareToCloseListener === true`
  - `result.prepareToCloseAcked === true`
  - `transitionResult.beforeDetected === true`
  - `transitionResult.afterDetected === true`
  - `transitionResult.conflictIgnored === true`
  - `transitionResult.afterReturnDetected === true`
  - `transitionResult.songWorldOverlayVisible === true`
  - `transitionResult.repeatedTransitionHealthy === true`
  - no `preloadError`
  - no `failedLoad`
  - no `renderProcessGone`
  - no CSP warning text in `consoleMessages`
  - fallback IPC handler path was used because `better-sqlite3` binding was unavailable in this environment; smoke gates still passed.

- `2026-07-17 08:53 UTC` snapshot recorded in [`docs/goal-progress.md`](/d:/code/music-os/docs/goal-progress.md)
  - `npm run build:renderer` success.
  - `npm run build:electron` success.
  - `($env:ELECTRON_RUN_AS_NODE=$null; npm run smoke:electron)` success with Stage 5+ persistence checks.
  - `result.apiType === 'object'`
  - `result.canvas === true`
  - `result.audioInput === true`
  - `result.trackListReadable === true`
  - `result.trackDurationMetadataRoundTrip === true`
  - `result.playbackStateReadable === true`
  - `result.playbackStateWritable === true`
  - `result.listeningHistoryApiAvailable === true`
  - `result.providerSearchContracts === true`
  - `result.shellVisible === true`
  - `result.homeState === true`
  - `transitionResult.beforeDetected === true`
  - `transitionResult.afterDetected === true`
  - `transitionResult.songWorldOverlayVisible === true`
  - `transitionResult.conflictIgnored === true`
  - `transitionResult.afterReturnDetected === true`
  - `result.ping.message === 'ack:electron-smoke'`
  - `preloadError === null`
  - `failedLoad === null`
  - `renderProcessGone === null`
  - `consoleMessages === []`
  - `reportErrorAcknowledged` returns `{ acknowledged: true }`.

- `2026-07-17 15:58 UTC` snapshot recorded in [`docs/goal-progress.md`](/d:/code/music-os/docs/goal-progress.md)
  - `npm run build:renderer` success.
  - `npm run build:electron` success (`tsc -p tsconfig.electron.json`).
  - `npm run smoke:electron` success with Stage 1/2 conditions.

- `2026-07-17 15:48 UTC` snapshot recorded in [`docs/goal-progress.md`](/d:/code/music-os/docs/goal-progress.md)
  - `npm run build:renderer` success.
  - `npm run build:electron` success (`tsc -p tsconfig.electron.json`).
  - `npm run smoke:electron` success with Stage 1/2 conditions.

- `2026-07-17 17:51 UTC` snapshot recorded in [`docs/goal-progress.md`](/d:/code/music-os/docs/goal-progress.md)
  - `npm run build:renderer` success.
  - `npm run build:electron` success (`tsc -p tsconfig.electron.json`).
  - `($env:ELECTRON_RUN_AS_NODE=$null; npm run smoke:electron)` success with Stage 1-7+ transition checks.
  - `result.apiType === 'object'`
  - `result.canvas === true`
  - `result.audioInput === true`
  - `result.trackListReadable === true`
  - `result.playbackStateReadable === true`
  - `result.playbackStateWritable === true`
  - `result.listeningHistoryApiAvailable === true`
  - `result.providerSearchContracts === true`
  - `result.shellVisible === true`
  - `result.homeState === true`
  - `transitionResult.beforeDetected === true`
  - `transitionResult.afterDetected === true`
  - `transitionResult.conflictIgnored === true`
  - `transitionResult.afterReturnDetected === true`
  - `transitionResult.songWorldOverlayVisible === true`
  - `transitionResult.repeatedTransitionHealthy === true`
  - `preloadError === null`
  - `failedLoad === null`
  - `renderProcessGone === null`
  - `consoleMessages === []`

## Reference Compliance

Stage 0 requires no work to proceed until these input files are acknowledged and aligned:

- `C:\Users\duainan\.codex\attachments\24b7fddc-fd62-4715-bcb1-bfeee2b9a6a0\pasted-text-1.txt`
- `C:\Users\duainan\.codex\attachments\5b494acb-a286-4e50-9267-26db26ad4cfd\pasted-text-1.txt`
- `C:\Users\duainan\.codex\attachments\67ea7f5d-7b63-4409-b8c0-32d2accfcc22\pasted-text.txt`
- `C:\Users\duainan\.codex\attachments\cb278536-ac97-411f-88b8-eb23ed075eee\pasted-text-1.txt`
- `C:\Users\duainan\.codex\attachments\943ce9cb-7dc4-4f07-8399-cf798852a396\pasted-text-1.txt`
- `C:\Users\duainan\.codex\attachments\822449ee-5f5b-433f-be06-c341b73f8005\pasted-text-1.txt`
- `C:\Users\duainan\.codex\attachments\beb857a0-692b-49e8-9dea-843d15121189\pasted-text-1.txt`

Operational interpretation:

- Do not add feature scope that contradicts those references before Stage 1.
- Keep architecture decisions and migration scope bounded to Electron + Vite + R3F + Zustand + Web Audio.
- Keep this file as the gatekeeper for any pre-implementation Stage 0 claims.

## Stage 0 Exit Checklist

Before moving to Stage 1 implementation:

- Confirm decision register in `docs/phase-0-plan.md` still states Electron + Vite + R3F as active runtime.
- Confirm `docs/goal-progress.md` exists and records current checkpoint + deferred items.
- Confirm `docs/architecture.md` documents:
  - main/preload/renderer boundary
  - single persistent canvas intent
  - data and provider boundaries
- Confirm `docs/implementation-roadmap.md` still maps Stage 1-7 with concrete milestone gates.
- Confirm `docs/phase-0-plan.md` lists explicit risk log and Stage 1-7 execution strategy.
- Confirm no code changes touched `src/app`/`src/components` as active runtime path (reference only).
- Confirm a current `docs/goal-progress.md` entry exists for the same repository snapshot.


