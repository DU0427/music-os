import type { AudioPlaybackState, ListeningHistoryRecord, TrackRecord } from '../../shared/ipc/music';

interface ActiveHistoryState {
  id: string;
  trackId: string;
  startedAt: string;
  elapsedSeconds: number;
  lastCurrentTime: number;
  lastFrameMs: number;
}

interface ListeningSessionSnapshot {
  id: string | null;
  trackId: string | null;
  startedAt: string | null;
  elapsedSeconds: number;
}

type MakeId = () => string;

const defaultMakeId: MakeId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toIso = () => new Date().toISOString();
const toFiniteNumber = (value: unknown) => (Number.isFinite(value as number) ? Number(value) : null);
const isTrackFinished = (state: AudioPlaybackState) =>
  state.duration > 0 && state.currentTime >= state.duration * 0.98;

const buildListeningRecord = (activeHistory: ActiveHistoryState, endedAt: string | null): ListeningHistoryRecord => ({
  id: activeHistory.id,
  trackId: activeHistory.trackId,
  startedAt: activeHistory.startedAt,
  endedAt,
  durationSeconds: Math.max(0, Number(activeHistory.elapsedSeconds.toFixed(3))),
});

export class ListeningSessionManager {
  private activeHistory: ActiveHistoryState | null = null;
  private readonly makeId: MakeId;
  private onAddHistory?: (record: ListeningHistoryRecord) => void | Promise<void>;
  private onUpdateHistory?: (record: ListeningHistoryRecord) => void | Promise<void>;

  constructor(
    options?: {
      makeId?: MakeId;
      onAddHistory?: ListeningSessionManager['onAddHistory'];
      onUpdateHistory?: ListeningSessionManager['onUpdateHistory'];
    },
  ) {
    this.makeId = options?.makeId ?? defaultMakeId;
    this.onAddHistory = options?.onAddHistory;
    this.onUpdateHistory = options?.onUpdateHistory;
  }

  getSnapshot(): ListeningSessionSnapshot {
    return {
      id: this.activeHistory?.id ?? null,
      trackId: this.activeHistory?.trackId ?? null,
      startedAt: this.activeHistory?.startedAt ?? null,
      elapsedSeconds: this.activeHistory ? Number(this.activeHistory.elapsedSeconds.toFixed(3)) : 0,
    };
  }

  reset() {
    this.activeHistory = null;
  }

  start(track: TrackRecord, startTimeSeconds: number) {
    if (this.activeHistory && this.activeHistory.trackId === track.id) {
      return;
    }

    const startTime = toFiniteNumber(startTimeSeconds);
    this.activeHistory = {
      id: this.makeId(),
      trackId: track.id,
      startedAt: toIso(),
      elapsedSeconds: 0,
      lastCurrentTime: Number.isFinite(startTime) ? (startTime as number) : 0,
      lastFrameMs: Date.now(),
    };

    void this.onAddHistory?.({
      id: this.activeHistory.id,
      trackId: track.id,
      startedAt: this.activeHistory.startedAt,
      endedAt: null,
      durationSeconds: 0,
    });
  }

  switchTrack(state: AudioPlaybackState) {
    if (!this.activeHistory) {
      return;
    }
    if (state.track?.id === this.activeHistory.trackId) {
      return;
    }
    const record = this.finalize(state, toIso());
    void this.onUpdateHistory?.(record);
  }

  accumulate(state: AudioPlaybackState, previousPlaying: boolean) {
    if (!this.activeHistory) {
      return;
    }
    if (!Number.isFinite(state.currentTime)) {
      return;
    }

    if (!state.track || state.track.id !== this.activeHistory.trackId) {
      const record = this.finalize(state, toIso());
      void this.onUpdateHistory?.(record);
      return;
    }

    if (!state.isPlaying) {
      if (previousPlaying) {
        const record = this.finalize(state, toIso());
        void this.onUpdateHistory?.(record);
      }
      return;
    }

    const now = Date.now();
    const timeDelta = Math.max(0, (now - this.activeHistory.lastFrameMs) / 1000);
    const posDelta = state.currentTime - this.activeHistory.lastCurrentTime;
    const delta = Number.isFinite(posDelta) ? Math.max(0, Math.min(posDelta, timeDelta + 0.2)) : 0;

    if (delta > 0.015) {
      this.activeHistory.elapsedSeconds += delta;
    }
    this.activeHistory.lastCurrentTime = state.currentTime;
    this.activeHistory.lastFrameMs = now;
  }

  finalize(state: AudioPlaybackState, endedAt?: string | null) {
    if (!this.activeHistory) {
      return null;
    }

    const record: ListeningHistoryRecord = buildListeningRecord(
      this.activeHistory,
      endedAt === undefined ? (isTrackFinished(state) ? toIso() : null) : endedAt,
    );

    this.activeHistory = null;
    return record;
  }

  async flushFinalized(state: AudioPlaybackState, endedAt: string | null): Promise<void> {
    const record = this.finalize(state, endedAt);
    if (!record) {
      return;
    }
    await this.onUpdateHistory?.(record);
  }
}
