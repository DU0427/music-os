Music OS Implementation Roadmap

This document translates the pasted specification into an implementation-first roadmap for
the current Electron + Vite + R3F migration.

## 1) Design Intent (Condensed)

Music OS is a spatial computing experience, not a music catalog app.

- Home is a living world, not a menu.
- Music is translated into environment, mood, and motion.
- Interaction is object-driven (hover/capture/move), not button-driven.
- The runtime should feel premium, calm, and future-facing.

## 2) Recommended Architecture

- Desktop shell: `electron/main.ts` controls windows and app lifecycle.
- Boundary: `electron/preload.ts` exposes a narrow, typed API set (`ready`, `ping`, music/data commands).
- Renderer: `src/renderer` owns all UI/3D/audio graph concerns.
- Rendering: single persistent React Three Fiber canvas via `src/renderer/worlds/WorldManager.tsx`.
- Shared contracts: `src/shared` for IPC payload types and provider/domain types.
- Data: SQLite in main process (`electron/database`) with typed repositories and migration layer.
- Integrations: provider adapters isolated in `electron/providers` and selected via registry.
- Audio: Web Audio API analysis in renderer and event-to-visual mapping in frame systems.

## 3) Project Structure (Current + Target)

Keep reference code untouched and route active experience through renderer modules.

- `electron/` — main, preload, windows, ipc, providers, database
- `src/shared/` — contract types used by both main and renderer
- `src/renderer/`
  - `app` (top shell)
  - `worlds` (Home, Midnight City, future worlds)
  - `core` (Music Core visuals)
  - `camera` (interpolation and cinematic rigs)
  - `audio` (Web Audio pipeline + metrics)
  - `ui` (minimal overlay UI)
  - `store` (runtime state)
- `docs/` — architecture, smoke, and milestone notes
- `out/` and `dist/` — build artifacts for renderer and Electron runtime

## 4) Milestones and Gates

### Milestone A: Shell + Contracts
- Goal: stable desktop bootstrap and typed IPC baseline.
- Completion criteria:
  - app launches via `npm run dev:electron`
  - `window.musicOS.ready()` and `window.musicOS.ping()` succeed in renderer
  - no preload-load startup failures in smoke log

### Milestone B: Spatial Base
- Goal: one persistent scene with smooth space switching and camera movement.
- Completion criteria:
  - no canvas teardown on space changes
  - home -> midnight transition is observable
  - no hard page navigation for space change

### Milestone C: Audio Reactive Experience
- Goal: playback + analysis flow drives visual state.
- Completion criteria:
  - local source playback path works from renderer
  - smoothed FFT-derived metrics are consumed by visual features
  - no unbounded per-frame allocations in hot loops

### Milestone D: Song World
- Goal: first complete world in production quality.
- Completion criteria:
  - Midnight City world enters when selected
- atmosphere, environment, energy, and spatial ui layers are present
  - return path back to home exists

### Milestone E: Persistence + Data Integrity
- Goal: main-process SQLite and safe data APIs.
- Completion criteria:
  - migration runs and tables are created
  - repositories expose typed read/write for core entities
  - renderer consumes serializable data through IPC only

### Milestone F: Provider Boundary
- Goal: provider contracts and adapters are explicit.
- Completion criteria:
  - normalized provider domain types in shared contracts
  - adapter registry maps source type + errors to renderer-facing contract
  - unsupported paths are explicitly represented and surfaced safely

### Milestone G: Stability and Quality
- Goal: baseline runtime reliability.
- Completion criteria:
  - no runtime crash in smoke gate
  - memory-safe cleanup for audio + scene resources
  - transition and audio remain responsive after repeated transitions

## 5) Technical Risks

- Visual migration drift: DOM prototype references can shape old patterns into new scene behavior.
- Space-to-space transition quality: instant teleporting breaks spatial premise.
- Over-allocating in frame loop can cause GPU jitter and jittery movement.
- Cross-process contracts can leak when not explicitly serializable.
- Provider credential gaps can block full-playback path until real adapters are available.

## 6) First Implementation Plan (Next 2 cycles)

1. Gate hardening
   - lock smoke contract checks and keep CI-friendly evidence for each milestone gate.
2. Spatial interaction pass
   - remove button-like interactions in core flow where possible.
   - add hover/cursor/object affordances for world entry points.
3. Audio mapping pass
   - improve mapping from bass/mid/high energy to atmosphere, particles, and core response.
4. World polish pass
   - elevate Midnight City visuals around mood layers while preserving performance budget.
5. Persistence/adapter pass
   - finalize repository contracts, seed mock dataset contracts, and tighten error mapping.
6. Review pass
   - produce completion evidence for each milestone with source references.

## 7) References

- `docs/architecture.md`
- `docs/phase-0-plan.md`
- `docs/smoke-contract.md`
- `docs/goal-progress.md`
- `README.md`

## 8) Stage 0 Continuity Inputs (Read-Continue Rule)

- Primary reference: `C:\Users\duainan\.codex\attachments\24b7fddc-fd62-4715-bcb1-bfeee2b9a6a0\pasted-text-1.txt`.
- Continuity reference: `C:\Users\duainan\.codex\attachments\5b494acb-a286-4e50-9267-26db26ad4cfd\pasted-text-1.txt`.
- Design/vision visual baseline: `C:\Users\duainan\.codex\attachments\67ea7f5d-7b63-4409-b8c0-32d2accfcc22\pasted-text.txt`.
- Product Slice continuity: `C:\Users\duainan\.codex\attachments\cb278536-ac97-411f-88b8-eb23ed075eee\pasted-text-1.txt`.
- Active Stage 3-7 contract continuation: `C:\Users\duainan\.codex\attachments\66c20d69-bb4b-47dc-bcc5-27bc2f6cf197\pasted-text-1.txt`.
- Active Playback/Session continuation: `C:\Users\duainan\.codex\attachments\943ce9cb-7dc4-4f07-8399-cf798852a396\pasted-text-1.txt`.
- Active Playback Data Hardening continuation: `C:\Users\duainan\.codex\attachments\822449ee-5f5b-433f-be06-c341b73f8005\pasted-text-1.txt`.
- Latest Stage 7 product-polish continuation: `C:\Users\duainan\.codex\attachments\beb857a0-692b-49e8-9dea-843d15121189\pasted-text-1.txt`.
