import { contextBridge, ipcRenderer } from 'electron';
import type { AppReadyPayload, ErrorPayload, MusicOsApi, PingPayload } from '../src/shared/ipc/channels';
import type {
  ListeningHistoryRecord,
  ListeningMemoryRecord,
  PlaybackStateRecord,
  TrackRecord,
  UserWorldSettingRecord,
} from '../src/shared/ipc/music';
import type {
  MusicProviderId,
  ProviderTrackReference,
  ProviderTrackResult,
  ProviderPlayableSourceResult,
} from '../src/shared/music/providers';

const APP_IPC_CHANNELS = (() => {
  const sharedDefaults = {
    ready: 'app:ready',
    ping: 'app:ping',
    error: 'app:error',
    prepareToClose: 'app:prepare-close',
    prepareToCloseAck: 'app:prepare-close-ack',
    tracksList: 'music:tracks:list',
    tracksUpsert: 'music:tracks:upsert',
    historyList: 'music:history:list',
    historyAdd: 'music:history:add',
    historyUpdate: 'music:history:update',
    memoriesList: 'music:memories:list',
    memoriesAdd: 'music:memories:add',
    worldSettingsGet: 'music:world-settings:get',
    worldSettingsSet: 'music:world-settings:set',
    playbackGet: 'music:playback:get',
    playbackSave: 'music:playback:save',
    providerSearch: 'music:provider:search',
    providerTrack: 'music:provider:track',
    providerPlayable: 'music:provider:playable-source',
  } as const;

  try {
    const electronChannels = require('./ipc/channels');
    if (electronChannels?.APP_IPC_CHANNELS) {
      return electronChannels.APP_IPC_CHANNELS as typeof sharedDefaults;
    }
  } catch {
    // fallback to distributed runtime constants
  }

  try {
    const srcChannels = require('../src/shared/ipc/channels');
    if (srcChannels?.APP_IPC_CHANNELS) {
      return srcChannels.APP_IPC_CHANNELS as typeof sharedDefaults;
    }
  } catch {
    // fallback to literal defaults for environments without dist/src mapping
  }

  return sharedDefaults;
})();

const api: MusicOsApi = {
  ready: () => ipcRenderer.invoke(APP_IPC_CHANNELS.ready) as Promise<AppReadyPayload>,
  ping: (message: string) =>
    ipcRenderer.invoke(APP_IPC_CHANNELS.ping, {
      message,
      timestamp: new Date().toISOString(),
    }) as Promise<PingPayload>,
  reportError: (payload: ErrorPayload) => ipcRenderer.invoke(APP_IPC_CHANNELS.error, payload),
  onPrepareToClose: (handler) => {
    const listener = async () => {
      try {
        await handler();
      } finally {
        ipcRenderer.send(APP_IPC_CHANNELS.prepareToCloseAck);
      }
    };
    ipcRenderer.on(APP_IPC_CHANNELS.prepareToClose, listener);
    return () => ipcRenderer.removeListener(APP_IPC_CHANNELS.prepareToClose, listener);
  },
  listTracks: () => ipcRenderer.invoke(APP_IPC_CHANNELS.tracksList),
  upsertTrack: (track: TrackRecord) => ipcRenderer.invoke(APP_IPC_CHANNELS.tracksUpsert, track),
  listListeningHistory: () => ipcRenderer.invoke(APP_IPC_CHANNELS.historyList),
  addListeningHistory: (record: ListeningHistoryRecord) => ipcRenderer.invoke(APP_IPC_CHANNELS.historyAdd, record),
  updateListeningHistory: (record: ListeningHistoryRecord) => ipcRenderer.invoke(APP_IPC_CHANNELS.historyUpdate, record),
  listListeningMemories: () => ipcRenderer.invoke(APP_IPC_CHANNELS.memoriesList),
  addListeningMemory: (record: ListeningMemoryRecord) => ipcRenderer.invoke(APP_IPC_CHANNELS.memoriesAdd, record),
  getWorldSetting: (key: string) => ipcRenderer.invoke(APP_IPC_CHANNELS.worldSettingsGet, key),
  setWorldSetting: (record: UserWorldSettingRecord) => ipcRenderer.invoke(APP_IPC_CHANNELS.worldSettingsSet, record),
  getPlaybackState: () => ipcRenderer.invoke(APP_IPC_CHANNELS.playbackGet),
  savePlaybackState: (state: PlaybackStateRecord) => ipcRenderer.invoke(APP_IPC_CHANNELS.playbackSave, state),
  searchMusic: (query: string, providerId?: MusicProviderId) =>
    ipcRenderer.invoke(APP_IPC_CHANNELS.providerSearch, { query, providerId }),
  getProviderTrack: (reference: ProviderTrackReference) =>
    ipcRenderer.invoke(APP_IPC_CHANNELS.providerTrack, reference) as Promise<ProviderTrackResult>,
  getProviderPlayableSource: (reference: ProviderTrackReference) =>
    ipcRenderer.invoke(APP_IPC_CHANNELS.providerPlayable, reference) as Promise<ProviderPlayableSourceResult>,
};

contextBridge.exposeInMainWorld('musicOS', api);

export type {};
