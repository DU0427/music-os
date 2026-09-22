import { create } from 'zustand';
import type {
  AudioPlaybackState,
  ListeningHistoryRecord,
  PlaybackStateRecord,
  TrackRecord,
  TrackWorldContext,
} from '../../shared/ipc/music';
import type { ProviderTrack, ProviderTrackReference } from '../../shared/music/providers';
import { audioEngine } from './runtime';
import { ListeningSessionManager } from './listening-session';

interface AudioStore extends AudioPlaybackState {
  loadFile: (file: File) => Promise<void>;
  restoreTrack: (track: TrackRecord, positionSeconds: number) => void;
  restorePlaybackSession: () => Promise<void>;
  loadProviderTrack: (reference: ProviderTrackReference) => Promise<boolean>;
  /** 统一播放入口：本地文件（filePath 回读）或 provider 曲目，成功后自动播放。 */
  playTrack: (track: TrackRecord) => Promise<boolean>;
  /** Provider 曲目统一播放入口：解析详情与播放源后自动播放（点击即播）。 */
  playProviderTrack: (reference: ProviderTrackReference) => Promise<boolean>;
  /** 以队列语义播放：ended 自动连播（loopMode 控制），失败项自动跳过。 */
  playQueue: (items: TrackRecord[], index: number, kind: string, title: string) => Promise<boolean>;
  skipNext: () => void;
  skipPrev: () => void;
  setLoopMode: (mode: LoopMode) => void;
  loopMode: LoopMode;
  queueKind: string | null;
  queueTitle: string | null;
  queueIndex: number;
  queueLength: number;
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
  moodTags: ['夜晚', '梦境', '城市'],
  energyTarget: 'uplift',
  mapPreset: 'midnight-city',
  worldLabel: '午夜城市',
};

export type LoopMode = 'list' | 'single' | 'off';

const toIso = () => new Date().toISOString();
const buildProviderTrackId = (reference: ProviderTrackReference) =>
  `${reference.providerId}::${reference.platformTrackId}`;
const makeTrackId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const mapProviderTrackToRecord = (
  providerTrack: Pick<ProviderTrack, 'reference' | 'title' | 'artist' | 'album' | 'durationSeconds' | 'artworkUrl'>,
) => ({
  id: buildProviderTrackId(providerTrack.reference),
  title: providerTrack.title,
  artist: providerTrack.artist.name,
  album: providerTrack.album?.title ?? null,
  source: providerTrack.reference.providerId,
  durationSeconds: providerTrack.durationSeconds,
  artworkUrl: providerTrack.artworkUrl ?? null,
  providerId: providerTrack.reference.providerId,
  providerTrackId: providerTrack.reference.platformTrackId,
  worldContext: DEFAULT_WORLD_CONTEXT,
  createdAt: toIso(),
  filePath: null,
});

const setProviderPlaybackSource = async (reference: ProviderTrackReference): Promise<TrackRecord | null> => {
  if (
    typeof window.musicOS?.getProviderTrack !== 'function' ||
    typeof window.musicOS?.getProviderPlayableSource !== 'function'
  ) {
    return null;
  }

  try {
    const [trackResult, playableResult] = await Promise.all([
      window.musicOS.getProviderTrack(reference),
      window.musicOS.getProviderPlayableSource(reference),
    ]);

    if (trackResult.error || !trackResult.track) {
      return null;
    }

    const track = mapProviderTrackToRecord({
      id: buildProviderTrackId(trackResult.reference),
      reference: trackResult.reference,
      title: trackResult.track.title,
      artist: trackResult.track.artist,
      album: trackResult.track.album,
      durationSeconds: trackResult.track.durationSeconds,
      artworkUrl: trackResult.track.artworkUrl,
    });

    await upsertTrack(track);

    if (playableResult.error || !playableResult.playableSource?.url) {
      audioEngine.restoreTrack(track, 0);
      return track;
    }

    audioEngine.loadTrackFromUrl(playableResult.playableSource.url, track);
    return track;
  } catch {
    return null;
  }
};

const restoreProviderPlaybackTrack = async (track: TrackRecord, positionSeconds: number): Promise<boolean> => {
  if (
    track.providerId === 'local-file' ||
    !track.providerTrackId ||
    typeof window.musicOS?.getProviderPlayableSource !== 'function'
  ) {
    return false;
  }

  try {
    const playableResult = await window.musicOS.getProviderPlayableSource({
      providerId: track.providerId,
      platformTrackId: track.providerTrackId,
    });
    if (playableResult.error || !playableResult.playableSource?.url) {
      return false;
    }

    audioEngine.loadTrackFromUrl(playableResult.playableSource.url, track);
    if (Number.isFinite(positionSeconds) && positionSeconds > 0) {
      audioEngine.seek(positionSeconds);
    }
    return true;
  } catch {
    return false;
  }
};

/** 重启后恢复本地文件播放源：主进程回读文件字节 → 内存 File → 现有本地加载链路。 */
const restoreLocalPlaybackTrack = async (track: TrackRecord, positionSeconds: number): Promise<boolean> => {
  if (
    track.providerId !== 'local-file' ||
    !track.filePath ||
    typeof window.musicOS?.getAudioFileData !== 'function'
  ) {
    return false;
  }

  try {
    const data = await window.musicOS.getAudioFileData(track.filePath);
    if (!data || data.byteLength === 0) {
      return false;
    }
    const fileName = track.filePath.split(/[\\/]/).pop() || track.title;
    const file = new File([data], fileName);
    await audioEngine.loadTrackFromFile(file, track);
    if (Number.isFinite(positionSeconds) && positionSeconds > 0) {
      audioEngine.seek(positionSeconds);
    }
    return true;
  } catch {
    return false;
  }
};

const buildLocalTrack = (file: File, artworkUrl: string | null, filePath: string | null): TrackRecord => ({
  id: makeTrackId(),
  title: file.name.replace(/\.[^/.]+$/, ''),
  artist: '本地导入',
  album: null,
  source: 'local-file',
  durationSeconds: 0,
  artworkUrl,
  providerId: 'local-file',
  providerTrackId: null,
  worldContext: DEFAULT_WORLD_CONTEXT,
  createdAt: toIso(),
  filePath,
});

/** Electron 渲染进程的 File 额外带 .path（本地文件系统路径）。 */
interface ElectronFile extends File {
  path?: string;
}

const readElectronFilePath = (file: File): string | null => (file as ElectronFile).path ?? null;

/** 读取本地音频内嵌封面（主进程 music-metadata），返回 data URL 或 null。 */
const extractFileCover = async (file: File): Promise<string | null> => {
  const filePath = readElectronFilePath(file);
  if (!filePath || typeof window.musicOS?.getAudioCover !== 'function') {
    return null;
  }
  try {
    return (await window.musicOS.getAudioCover(filePath)) ?? null;
  } catch {
    return null;
  }
};

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
const syncTrackDurations = new Map<string, number>();

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

const updateListeningHistory = async (record: ListeningHistoryRecord) => {
  if (typeof window.musicOS?.updateListeningHistory === 'function') {
    try {
      await window.musicOS.updateListeningHistory(record);
    } catch {
      // keep audio flow decoupled from persistence errors
    }
  }
};

const sessionManager = new ListeningSessionManager({
  onAddHistory: (record) => addListeningHistory(record),
  onUpdateHistory: (record) => updateListeningHistory(record),
});

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

export const useAudioStore = create<AudioStore>()((set, get) => {
  let previousIsPlaying = false;
  let previousTrackId: string | null = null;
  let previousSyncTrackId: string | null = null;
  let closeInFlight: Promise<void> | null = null;

  /* ——— 播放队列（会话内状态，不持久化） ——— */
  type QueueState = { kind: string; title: string; items: TrackRecord[] };
  let queue: QueueState | null = null;
  let queueIndex = -1;
  let loopMode: LoopMode = 'list';
  const failedIds = new Set<string>();
  let advancing = false;

  const trace = (message: string) => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { __moEngineLog?: string[] };
    const log = w.__moEngineLog ?? [];
    log.push(`Q ${message}`);
    w.__moEngineLog = log.slice(-40);
  };

  const setQueueState = () => {
    trace(`setQueueState kind=${queue?.kind ?? 'null'} index=${queueIndex}`);
    set({
      queueKind: queue?.kind ?? null,
      queueTitle: queue?.title ?? null,
      queueIndex,
      queueLength: queue?.items.length ?? 0,
      loopMode,
    });
  };

  const clearQueueState = () => {
    const stack = new Error().stack?.split('\n').slice(2, 5).join(' <- ') ?? '';
    trace(`clearQueueState <- ${stack.slice(0, 220)}`);
    queue = null;
    queueIndex = -1;
    failedIds.clear();
    setQueueState();
  };

  const playTrackItem = async (item: TrackRecord): Promise<boolean> => {
    advancing = true;
    trace(`v enter id=${item?.id ?? 'undefined'}`);
    try {
      const result = await get().playTrack(item);
      trace(`v done ok=${result}`);
      return result;
    } catch (error) {
      trace(`v threw ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`);
      return false;
    } finally {
      advancing = false;
    }
  };

  const advance = async (direction: 1 | -1): Promise<void> => {
    const q = queue;
    if (!q || q.items.length === 0) {
      return;
    }
    const total = q.items.length;
    let candidate = queueIndex;
    for (let step = 0; step < total; step += 1) {
      candidate = (candidate + direction + total) % total;
      const item = q.items[candidate];
      if (failedIds.has(item.id)) {
        continue;
      }
      const ok = await playTrackItem(item);
      if (ok) {
        queueIndex = candidate;
        setQueueState();
        return;
      }
      failedIds.add(item.id);
      // 失败项之间的短间隔：避免连环请求触发平台限流（连播链最坏情况会连续打 N 次）
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    // 队列内全部不可播放：停止并清队列
    audioEngine.pause();
    clearQueueState();
  };

  audioEngine.onEnded = () => {
    if (!queue || loopMode === 'off') {
      return;
    }
    if (loopMode === 'single') {
      void playTrackItem(queue.items[queueIndex]);
      return;
    }
    void advance(1);
  };

  /* 测试缝隙（与 mo-force-playing 同模式）：驱动队列推进 / 模拟自然播完 */
  if (typeof window !== 'undefined') {
    window.addEventListener('mo-queue-advance', (event) => {
      const detail = (event as CustomEvent<string | undefined>).detail;
      void advance(detail === 'prev' ? -1 : 1);
    });
    window.addEventListener('mo-queue-seek-end', () => {
      const engine = audioEngine.getState();
      if (!engine.canPlay || engine.duration <= 0) {
        return;
      }
      audioEngine.seek(Math.max(0, engine.duration - 0.35));
      void audioEngine.play();
    });
    (window as unknown as { __moAudioDebug: () => unknown }).__moAudioDebug = () => audioEngine.debugSnapshot();
    (window as unknown as { __moMapProviderTrackToRecord: typeof mapProviderTrackToRecord }).__moMapProviderTrackToRecord = mapProviderTrackToRecord;
  }

  audioEngine.subscribe((state) => {
    const currentTrack = state.track;
    const currentTrackId = currentTrack?.id ?? null;

    if (currentTrack && currentTrack.durationSeconds !== syncTrackDurations.get(currentTrack.id)) {
      ensureTrackDurationPersisted(currentTrack);
    }

    if (currentTrackId && currentTrackId !== previousTrackId) {
      void sessionManager.switchTrack(state);
    }

    if (state.isPlaying && !previousIsPlaying && currentTrack) {
      sessionManager.start(currentTrack, state.currentTime);
    }

    if (!currentTrack) {
      void sessionManager.flushFinalized(state, toIso());
      previousIsPlaying = false;
      previousTrackId = null;
    } else {
      sessionManager.accumulate(state, previousIsPlaying);
      previousIsPlaying = state.isPlaying;
      previousTrackId = currentTrackId;
    }

    const sessionSnapshot = sessionManager.getSnapshot();
    set({
      ...state,
      activeHistoryId: sessionSnapshot.id,
      activeHistoryTrackId: sessionSnapshot.trackId,
      activeHistoryStartedAt: sessionSnapshot.startedAt,
      activeHistoryElapsedSeconds: sessionSnapshot.elapsedSeconds,
    });

    queuePlaybackPersist(state);
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
      // 主进程读取音频内嵌封面，填充 artworkUrl；持久化文件路径用于重启恢复
      clearQueueState();
      const cover = await extractFileCover(file);
      const track = buildLocalTrack(file, cover, readElectronFilePath(file));
      if (previousSyncTrackId) {
        syncTrackDurations.delete(previousSyncTrackId);
      }
      syncTrackDurations.delete(track.id);
      syncTrackDurations.set(track.id, 0);
      previousSyncTrackId = track.id;
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
      if (closeInFlight) {
        return closeInFlight;
      }

      closeInFlight = (async () => {
        const state = audioEngine.getState();
        if (!state.track) {
          queuedPlaybackPayload = null;
        }

        audioEngine.pause();
        await sessionManager.flushFinalized(state, toIso());
        await flushPlaybackPersist();
        audioEngine.dispose();
      })();

      try {
        await closeInFlight;
      } finally {
        closeInFlight = null;
      }
    },
    restorePlaybackSession: async () => {
      if (typeof window.musicOS?.getPlaybackState !== 'function' || typeof window.musicOS?.listTracks !== 'function') {
        return;
      }
      clearQueueState();

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

      const isProviderTrackRestored = await restoreProviderPlaybackTrack(track, playbackState.positionSeconds);
      if (!isProviderTrackRestored) {
        const isLocalTrackRestored = await restoreLocalPlaybackTrack(track, playbackState.positionSeconds);
        if (!isLocalTrackRestored) {
          audioEngine.restoreTrack(track, playbackState.positionSeconds);
        }
      }

      if (playbackState.isPlaying && lastPersistState?.trackId !== playbackState.trackId) {
        void savePlaybackState({
          trackId: playbackState.trackId,
          positionSeconds: playbackState.positionSeconds,
          isPlaying: false,
          updatedAt: toIso(),
        });
      }
    },
    loadProviderTrack: async (reference) => {
      const loadedTrack = await setProviderPlaybackSource(reference);
      return loadedTrack !== null;
    },
    playProviderTrack: async (reference) => {
      failedIds.clear();
      const loadedTrack = await setProviderPlaybackSource(reference);
      if (!loadedTrack || !audioEngine.getState().canPlay) {
        return false;
      }
      await audioEngine.play();
      return true;
    },
    playQueue: async (items, index, kind, title) => {
      try {
        trace(`playQueue enter n=${items.length} index=${index} kind=${kind}`);
        const list = items.filter((item) => item && item.id);
        if (list.length === 0) {
          return false;
        }
        queue = { kind, title, items: list };
        failedIds.clear();
        const target = Math.max(0, Math.min(index, list.length - 1));
        queueIndex = target;
        setQueueState();
        const ok = await playTrackItem(list[target]);
        trace(`playQueue first-play ok=${ok} id=${list[target].id}`);
        if (!ok) {
          failedIds.add(list[target].id);
          await advance(1);
          return true;
        }
        return true;
      } catch (error) {
        trace(`playQueue threw ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`);
        return false;
      }
    },
    skipNext: () => {
      void advance(1);
    },
    skipPrev: () => {
      if (audioEngine.getState().currentTime > 3) {
        audioEngine.seek(0);
        return;
      }
      void advance(-1);
    },
    setLoopMode: (mode) => {
      loopMode = mode;
      setQueueState();
    },
    loopMode: 'list',
    queueKind: null,
    queueTitle: null,
    queueIndex: -1,
    queueLength: 0,
    playTrack: async (track) => {
      trace(`playTrack enter id=${track.id} provider=${track.providerId} pTrackId=${track.providerTrackId} advancing=${advancing}`);
      if (!advancing) {
        clearQueueState();
      }
      const current = audioEngine.getState();

      // 已是当前曲目且可播放：直接播放/继续
      if (current.track?.id === track.id && current.canPlay) {
        await audioEngine.play();
        return true;
      }

      // provider 曲目：解析播放源后播放
      const providerRestored = await restoreProviderPlaybackTrack(track, 0);
      if (providerRestored) {
        await audioEngine.play();
        return true;
      }

      // 本地文件：按持久化路径回读后播放
      const localRestored = await restoreLocalPlaybackTrack(track, 0);
      if (localRestored) {
        await audioEngine.play();
        return true;
      }

      // 无法获取播放源：退化为元数据恢复（UI 会提示重新载入）
      audioEngine.restoreTrack(track, 0);
      return false;
    },
  };
});

/* 调试缝隙：store 引用需在 create 返回后再暴露（creator 体内引用会触发 TDZ） */
if (typeof window !== 'undefined') {
  (window as unknown as { __moStore: typeof useAudioStore }).__moStore = useAudioStore;
}

