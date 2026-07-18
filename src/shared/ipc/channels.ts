import type {
  ListeningHistoryRecord,
  ListeningMemoryRecord,
  PlaybackStateRecord,
  TrackRecord,
  UserWorldSettingRecord,
} from './music';
import type {
  MusicProviderId,
  ProviderPlayableSourceResult,
  ProviderSearchResult,
  ProviderTrackReference,
  ProviderTrackResult,
} from '../music/providers';

export const APP_IPC_CHANNELS = {
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

export type AppIpcChannel = (typeof APP_IPC_CHANNELS)[keyof typeof APP_IPC_CHANNELS];

export interface AppReadyPayload {
  appName: string;
  startedAt: string;
}

export interface PingPayload {
  message: string;
  timestamp: string;
}

export interface ErrorPayload {
  code: string;
  detail?: string;
}

export interface ErrorReportResult {
  acknowledged: boolean;
}

export interface MusicOsApi {
  ready(): Promise<{ appName: string; startedAt: string }>;
  ping(message: string): Promise<{ message: string; timestamp: string }>;
  reportError(payload: ErrorPayload): Promise<ErrorReportResult>;
  onPrepareToClose(handler: () => void | Promise<void>): () => void;
  listTracks(): Promise<TrackRecord[]>;
  upsertTrack(track: TrackRecord): Promise<TrackRecord>;
  listListeningHistory(): Promise<ListeningHistoryRecord[]>;
  addListeningHistory(record: ListeningHistoryRecord): Promise<ListeningHistoryRecord>;
  updateListeningHistory(record: ListeningHistoryRecord): Promise<ListeningHistoryRecord>;
  listListeningMemories(): Promise<ListeningMemoryRecord[]>;
  addListeningMemory(record: ListeningMemoryRecord): Promise<ListeningMemoryRecord>;
  getWorldSetting(key: string): Promise<UserWorldSettingRecord | null>;
  setWorldSetting(record: UserWorldSettingRecord): Promise<UserWorldSettingRecord>;
  getPlaybackState(): Promise<PlaybackStateRecord | null>;
  savePlaybackState(state: PlaybackStateRecord): Promise<PlaybackStateRecord>;
  searchMusic(query: string, providerId?: MusicProviderId): Promise<ProviderSearchResult>;
  getProviderTrack(reference: ProviderTrackReference): Promise<ProviderTrackResult>;
  getProviderPlayableSource(reference: ProviderTrackReference): Promise<ProviderPlayableSourceResult>;
}

export interface SharedIpcWindow {
  musicOS: MusicOsApi;
}

declare global {
  interface Window {
    musicOS: MusicOsApi;
  }
}
