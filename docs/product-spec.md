# Music OS Product Specification

## Vision

Music OS is a desktop spatial music experience. A song becomes an emotion, an environment,
and an explorable world. The product should feel immersive, calm, premium, personal, and alive;
it should not resemble a dashboard, a Spotify clone, a game menu, or a dense HUD.

## MVP

- Home Space as a living personal music universe.
- Music Core as the visual heartbeat of the application.
- One Song World: Midnight City World.
- Cinematic camera movement between spaces.
- Real local audio playback through Web Audio API.
- Audio-reactive light, particles, atmosphere, and core motion.

## Spatial Rules

- The primary interface is a persistent world, not a collection of pages.
- Prefer objects, labels, environments, and spatial affordances over menus and card grids.
- Space changes must preserve the R3F Canvas and use smooth camera movement.
- Visual effects must serve music, emotion, or spatial orientation.
- Renderer code must not access Node.js, SQLite, provider APIs, platform secrets, or private
  platform interfaces.

## Worlds

- Home Space: personal universe centered on Music Core, with paths toward collection, mood,
  memory, and visual experiences.
- Midnight City World: a floating dream city with deep blue atmosphere, soft fog, distant
  silhouettes, floating lights, memory particles, and a minimal song-world label.

## Audio Mapping

`AudioContext -> MediaElementAudioSourceNode -> AnalyserNode -> smoothed metrics`

- Bass controls Music Core scale and environmental breathing.
- Mid controls lighting and atmosphere.
- Treble controls particles.
- Energy controls overall intensity.
- BeatPulse controls short spatial responses.

FFT arrays stay inside the audio engine. Renderer state stores playback metadata and commands,
not raw per-frame frequency data.

## Process Boundaries

- Electron Main owns the application lifecycle, SQLite, provider adapters, and secrets.
- Preload exposes a narrow typed IPC API.
- Renderer owns React, R3F, Web Audio playback and analysis, and spatial interaction.

## Deferred Features

Social features, cloud synchronization, lyrics, recommendations, complex library management,
and unapproved private provider APIs are outside the MVP.
