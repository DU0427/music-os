import { ipcMain } from 'electron';
import { APP_IPC_CHANNELS } from './channels';
import type { AppReadyPayload, ErrorPayload, PingPayload } from './channels';
import type {
  ListeningHistoryRecord,
  ListeningMemoryRecord,
  PlaybackStateRecord,
  TrackRecord,
  UserWorldSettingRecord,
} from '../../src/shared/ipc/music';
import { MusicRepository } from '../database/repositories/music-repository';
import { ProviderRegistry } from '../providers';
import type { MusicProviderId, ProviderTrackReference } from '../../src/shared/music/providers';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertTrack(value: unknown): asserts value is TrackRecord {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.title !== 'string' || typeof value.artist !== 'string') {
    throw new Error('Invalid track payload.');
  }
}

function assertHistory(value: unknown): asserts value is ListeningHistoryRecord {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.trackId !== 'string') {
    throw new Error('Invalid listening history payload.');
  }
}

function assertMemory(value: unknown): asserts value is ListeningMemoryRecord {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.trackId !== 'string' || typeof value.note !== 'string') {
    throw new Error('Invalid listening memory payload.');
  }
}

function assertListeningHistoryUpdate(value: unknown): asserts value is ListeningHistoryRecord {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.trackId !== 'string' ||
    typeof value.startedAt !== 'string' ||
    (value.endedAt !== null && typeof value.endedAt !== 'string') ||
    typeof value.durationSeconds !== 'number'
  ) {
    throw new Error('Invalid listening history update payload.');
  }
}

function assertWorldSetting(value: unknown): asserts value is UserWorldSettingRecord {
  if (!isRecord(value) || typeof value.key !== 'string' || typeof value.value !== 'string') {
    throw new Error('Invalid world setting payload.');
  }
}

function assertPlaybackState(value: unknown): asserts value is PlaybackStateRecord {
  if (!isRecord(value) || typeof value.positionSeconds !== 'number' || typeof value.isPlaying !== 'boolean') {
    throw new Error('Invalid playback state payload.');
  }
}

function assertProviderReference(value: unknown): asserts value is ProviderTrackReference {
  if (
    !isRecord(value) ||
    (value.providerId !== 'mock' && value.providerId !== 'netease' && value.providerId !== 'qq') ||
    typeof value.platformTrackId !== 'string'
  ) {
    throw new Error('Invalid provider reference payload.');
  }
}

export function registerAppHandlers(repository: MusicRepository, providers: ProviderRegistry) {
  ipcMain.handle(APP_IPC_CHANNELS.ready, async (): Promise<AppReadyPayload> => {
    return {
      appName: 'Music OS Desktop',
      startedAt: new Date().toISOString(),
    };
  });

  ipcMain.handle(APP_IPC_CHANNELS.ping, async (_event, payload: PingPayload): Promise<PingPayload> => {
    return {
      message: `ack:${payload.message}`,
      timestamp: new Date().toISOString(),
    };
  });

  ipcMain.handle(APP_IPC_CHANNELS.error, async (_event, payload: ErrorPayload): Promise<{ acknowledged: boolean }> => {
    const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : 'unknown_error';
    const detail = isRecord(payload) && typeof payload.detail === 'string' ? payload.detail : undefined;
    console.error(`Renderer error [${code}]`, detail ?? '');
    return { acknowledged: true };
  });

  ipcMain.handle(APP_IPC_CHANNELS.tracksList, () => repository.listTracks());
  ipcMain.handle(APP_IPC_CHANNELS.tracksUpsert, (_event, payload: unknown) => {
    assertTrack(payload);
    return repository.upsertTrack(payload);
  });
  ipcMain.handle(APP_IPC_CHANNELS.historyList, () => repository.listListeningHistory());
  ipcMain.handle(APP_IPC_CHANNELS.historyAdd, (_event, payload: unknown) => {
    assertHistory(payload);
    return repository.addListeningHistory(payload);
  });
  ipcMain.handle(APP_IPC_CHANNELS.historyUpdate, (_event, payload: unknown) => {
    assertListeningHistoryUpdate(payload);
    return repository.updateListeningHistory(payload);
  });
  ipcMain.handle(APP_IPC_CHANNELS.memoriesList, () => repository.listListeningMemories());
  ipcMain.handle(APP_IPC_CHANNELS.memoriesAdd, (_event, payload: unknown) => {
    assertMemory(payload);
    return repository.addListeningMemory(payload);
  });
  ipcMain.handle(APP_IPC_CHANNELS.worldSettingsGet, (_event, key: unknown) => {
    if (typeof key !== 'string') {
      throw new Error('Invalid world setting key.');
    }
    return repository.getWorldSetting(key);
  });
  ipcMain.handle(APP_IPC_CHANNELS.worldSettingsSet, (_event, payload: unknown) => {
    assertWorldSetting(payload);
    return repository.setWorldSetting(payload);
  });
  ipcMain.handle(APP_IPC_CHANNELS.playbackGet, () => repository.getPlaybackState());
  ipcMain.handle(APP_IPC_CHANNELS.playbackSave, (_event, payload: unknown) => {
    assertPlaybackState(payload);
    return repository.savePlaybackState(payload);
  });
  ipcMain.handle(APP_IPC_CHANNELS.providerSearch, (_event, payload: unknown) => {
    if (!isRecord(payload) || typeof payload.query !== 'string') {
      throw new Error('Invalid provider search payload.');
    }
    const providerId = readProviderId(payload.providerId) ?? 'mock';
    if (providerId !== 'mock' && providerId !== 'netease' && providerId !== 'qq') {
      throw new Error('Invalid music provider.');
    }
    return providers.search({
      providerId: providerId as MusicProviderId,
      text: payload.query,
      limit: 20,
      cursor: null,
    });
  });

  ipcMain.handle(APP_IPC_CHANNELS.providerTrack, (_event, payload: unknown) => {
    assertProviderReference(payload);
    return providers.getTrack(payload);
  });

  ipcMain.handle(APP_IPC_CHANNELS.providerPlayable, (_event, payload: unknown) => {
    assertProviderReference(payload);
    return providers.getPlayableSource(payload);
  });
}

function readProviderId(value: unknown): MusicProviderId | undefined {
  if (value === 'mock' || value === 'netease' || value === 'qq') {
    return value;
  }
  return undefined;
}
