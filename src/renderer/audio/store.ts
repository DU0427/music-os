import { create } from 'zustand';
import type {
  AudioPlaybackState,
  ListeningHistoryRecord,
  PlaybackStateRecord,
  TrackRecord,
  TrackWorldContext,
} from '../../shared/ipc/music';
import { audioEngine } from './runtime';

interface ActiveHistoryState {
  id: string;
  trackId: string;
  startedAt: string;
  elapsedSeconds: number;
  lastCurrentTime: number;
  lastFrameMs: number;
}

interface AudioStore extends AudioPlaybackState {
  loadFile: (file: File) => Promise<void>;
  restoreTrack: (track: TrackRecord, positionSeconds: number) => void;
  restorePlaybackSession: () => Promise<void>;
  prepareToClose: () => Promise<void>;
  sampleMetrics: (frameTime: number) => void;
  play: () => Promise<void>;
  pause: () => void;
  seek: (seconds: number) => void;
  activeHistoryId: string | null;
  activeHistoryTrackId: string | null;
  activeHistoryStartedAt: string | null;
  activeHistoryElapsedSeconds: number;
}

const DEFAULT_WORLD_CONTEXT: TrackWorldContext = {
  scene: 'midnight',
  moodTags: ['Night', 'Dream', 'City'],
  energyTarget: 'uplift',
  mapPreset: 'midnight-city',
  worldLabel: 'Midnight City',
};

const toIso = () => new Date().toISOString();
const makeTrackId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const buildLocalTrack = (file: File): TrackRecord => ({
  id: makeTrackId(),
  title: file.name.replace(/\.[^/.]+$/, ''),
  artist: 'Local Import',
  album: null,
  source: 'local-file',
  durationSeconds: 0,
  artworkUrl: null,
  providerId: 'local-file',
  providerTrackId: null,
  worldContext: DEFAULT_WORLD_CONTEXT,
  createdAt: toIso(),
});

const upsertTrack = async (track: TrackRecord) => {
  if (typeof window.musicOS?.upsertTrack !== 'function') {
    return;
  }
  try {
    await window.musicOS.upsertTrack(track);
  } catch {
    // non-blocking for audio UX
  }
};

let persistStateTimer: ReturnType<typeof setTimeout> | null = null;
let lastPersistState: PlaybackStateRecord | null = null;
let queuedPlaybackPayload: PlaybackStateRecord | null = null;
let activeHistory: ActiveHistoryState | null = null;
const syncTrackDurations = new Map<string, number>();
const toActiveHistoryElapsed = () => (activeHistory ? Number(activeHistory.elapsedSeconds.toFixed(3)) : 0);

const queuePlaybackPersist = (state: AudioPlaybackState) => {
  if (!window.musicOS?.savePlaybackState || !state.track) {
    queuedPlaybackPayload = null;
    return;
  }
  const payload: PlaybackStateRecord = {
    trackId: state.track.id,
    positionSeconds: Number.isFinite(state.currentTime) ? state.currentTime : 0,
    isPlaying: state.isPlaying,
    updatedAt: toIso(),
  };
  queuedPlaybackPayload = payload;
  if (persistStateTimer) {
    clearTimeout(persistStateTimer);
  }
  persistStateTimer = setTimeout(() => {
    void savePlaybackState(payload);
  }, 600);
};

const flushPlaybackPersist = async () => {
  if (persistStateTimer) {
    clearTimeout(persistStateTimer);
    persistStateTimer = null;
  }

  if (!queuedPlaybackPayload) {
    return;
  }

  const payload = queuedPlaybackPayload;
  queuedPlaybackPayload = null;
  await savePlaybackState(payload);
  return payload;
};

const savePlaybackState = async (payload: PlaybackStateRecord) => {
  if (typeof window.musicOS?.savePlaybackState !== 'function') {
    return;
  }
  try {
    await window.musicOS.savePlaybackState(payload);
    lastPersistState = payload;
  } catch {
    // keep playback continuity non-blocking for UI
  }
};

const addListeningHistory = async (record: ListeningHistoryRecord) => {
  if (typeof window.musicOS?.addListeningHistory !== 'function') {
    return;
  }
  try {
    await window.musicOS.addListeningHistory(record);
  } catch {
    // keep audio flow decoupled from persistence errors
  }
};

const isTrackFinished = (state: AudioPlaybackState) =>
  state.duration > 0 && state.currentTime >= state.duration * 0.98;

const updateListeningHistory = async (record: ListeningHistoryRecord) => {
  if (typeof window.musicOS?.updateListeningHistory !== 'function') {
    return;
  }
  try {
    await window.musicOS.updateListeningHistory(record);
  } catch {
    // keep audio flow decoupled from persistence errors
  }
};

const startListeningHistory = (track: TrackRecord, startTimeSeconds: number) => {
  if (activeHistory && activeHistory.trackId === track.id) {
    return;
  }

  const id = makeTrackId();
  activeHistory = {
    id,
    trackId: track.id,
    startedAt: toIso(),
    elapsedSeconds: 0,
    lastCurrentTime: Number.isFinite(startTimeSeconds) ? startTimeSeconds : 0,
    lastFrameMs: Date.now(),
  };
  void addListeningHistory({
    id,
    trackId: track.id,
    startedAt: activeHistory.startedAt,
    endedAt: null,
    durationSeconds: 0,
  });
};

const finalizeListeningHistory = async (state: AudioPlaybackState, endedAt?: string | null) => {
  if (!activeHistory) {
    return;
  }

  const record: ListeningHistoryRecord = {
    id: activeHistory.id,
    trackId: activeHistory.trackId,
    startedAt: activeHistory.startedAt,
    endedAt: endedAt === undefined ? (isTrackFinished(state) ? toIso() : null) : endedAt,
    durationSeconds: Math.max(0, toActiveHistoryElapsed()),
  };

  await updateListeningHistory(record);
  activeHistory = null;
};

const finishFrameHistory = (nextState: AudioPlaybackState, previousPlaying: boolean) => {
  if (!activeHistory) {
    return;
  }

  if (!Number.isFinite(nextState.currentTime)) {
    return;
  }

  if (!nextState.track || nextState.track.id !== activeHistory.trackId) {
    void finalizeListeningHistory(nextState, toIso());
    return;
  }

  if (!nextState.isPlaying) {
    if (previousPlaying) {
      void finalizeListeningHistory(nextState, toIso());
    }
    return;
  }

  const now = Date.now();
  const currentTime = nextState.currentTime;
  const posDelta = currentTime - activeHistory.lastCurrentTime;
  const timeDelta = Math.max(0, (now - activeHistory.lastFrameMs) / 1000);
  const delta = Number.isFinite(posDelta) ? Math.max(0, Math.min(posDelta, timeDelta + 0.2)) : 0;
  if (delta > 0.015) {
    activeHistory.elapsedSeconds += delta;
  }
  activeHistory.lastCurrentTime = currentTime;
  activeHistory.lastFrameMs = now;
};

const ensureTrackDurationPersisted = (track: TrackRecord) => {
  const latest = syncTrackDurations.get(track.id);
  if (track.durationSeconds <= 0) {
    if (latest === undefined) {
      syncTrackDurations.set(track.id, 0);
    }
    return;
  }
  if (latest === undefined || latest !== track.durationSeconds) {
    syncTrackDurations.set(track.id, track.durationSeconds);
    void upsertTrack(track);
  }
};

export const useAudioStore = create<AudioStore>()((set) => {
  let previousIsPlaying = false;
  let previousTrackId: string | null = null;
  let lastKnownTrackId: string | null = null;

  audioEngine.subscribe((state) => {
    set({
      ...state,
      activeHistoryId: activeHistory?.id ?? null,
      activeHistoryTrackId: activeHistory?.trackId ?? null,
      activeHistoryStartedAt: activeHistory?.startedAt ?? null,
      activeHistoryElapsedSeconds: toActiveHistoryElapsed(),
    });
    queuePlaybackPersist(state);

    const currentTrack = state.track;
    const currentTrackId = currentTrack?.id ?? null;
    if (currentTrack && currentTrack.durationSeconds !== syncTrackDurations.get(currentTrack.id)) {
      ensureTrackDurationPersisted(currentTrack);
    }

    if (currentTrackId && currentTrackId !== previousTrackId) {
      void finalizeListeningHistory(state, toIso());
    }
    if (!currentTrack) {
      void finalizeListeningHistory(state, toIso());
      previousIsPlaying = false;
      previousTrackId = null;
      return;
    }

    if (state.isPlaying && !previousIsPlaying) {
      if (activeHistory && activeHistory.trackId !== currentTrackId) {
        void finalizeListeningHistory(state, toIso());
      }
      startListeningHistory(currentTrack, state.currentTime);
    }

    if (currentTrackId === lastKnownTrackId && activeHistory) {
      finishFrameHistory(state, previousIsPlaying);
    }
    lastKnownTrackId = currentTrackId;

    previousIsPlaying = state.isPlaying;
    previousTrackId = currentTrackId;
  });

  return {
    ...audioEngine.getState(),
    activeHistoryId: null,
    activeHistoryTrackId: null,
    activeHistoryStartedAt: null,
    activeHistoryElapsedSeconds: 0,
    sampleMetrics: (frameTime: number) => set(() => ({ metrics: audioEngine.getMetrics(frameTime) })),
    play: async () => {
      await audioEngine.play();
    },
    pause: () => {
      audioEngine.pause();
    },
    seek: (seconds: number) => {
      audioEngine.seek(seconds);
    },
    loadFile: async (file) => {
      const track = buildLocalTrack(file);
      syncTrackDurations.delete(track.id);
      syncTrackDurations.set(track.id, 0);
      await upsertTrack(track);
      await audioEngine.loadTrackFromFile(file, track);
      void savePlaybackState({
        trackId: track.id,
        positionSeconds: 0,
        isPlaying: false,
        updatedAt: toIso(),
      });
    },
    restoreTrack: (track, positionSeconds) => {
      audioEngine.restoreTrack(track, positionSeconds);
    },
    prepareToClose: async () => {
      const state = audioEngine.getState();
      if (!state.track) {
        queuedPlaybackPayload = null;
      }

      audioEngine.pause();
      await finalizeListeningHistory(state, toIso());
      await flushPlaybackPersist();
      audioEngine.dispose();
    },
    restorePlaybackSession: async () => {
      if (typeof window.musicOS?.getPlaybackState !== 'function' || typeof window.musicOS?.listTracks !== 'function') {
        return;
      }

      const [playbackState, tracks] = await Promise.all([
        window.musicOS.getPlaybackState(),
        window.musicOS.listTracks(),
      ]);
      if (!playbackState?.trackId) {
        return;
      }

      const track = tracks.find((candidate: TrackRecord) => candidate.id === playbackState.trackId);
      if (!track) {
        return;
      }

      audioEngine.restoreTrack(track, playbackState.positionSeconds);
      if (playbackState.isPlaying && lastPersistState?.trackId !== playbackState.trackId) {
        void savePlaybackState({
          trackId: playbackState.trackId,
          positionSeconds: playbackState.positionSeconds,
          isPlaying: false,
          updatedAt: toIso(),
        });
      }
    },
  };
});
