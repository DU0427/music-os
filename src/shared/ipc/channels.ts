import type {
  ListeningHistoryRecord,
  ListeningMemoryRecord,
  PlaybackStateRecord,
  TrackRecord,
  UserWorldSettingRecord,
} from './music';
import type {
  MusicProviderId,
  ProviderAccount,
  ProviderHomeContent,
  ProviderPlayableSourceResult,
  ProviderQrLoginSession,
  ProviderQrPollResult,
  ProviderSearchResult,
  ProviderTrack,
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
  audioCover: 'audio:cover',
  audioFileData: 'audio:file-data',
  neteaseQrCreate: 'music:netease:qr-create',
  neteaseQrPoll: 'music:netease:qr-poll',
  neteaseAuthStatus: 'music:netease:auth-status',
  neteaseLogout: 'music:netease:logout',
  neteaseHome: 'music:netease:home',
  neteasePlaylistTracks: 'music:netease:playlist-tracks',
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
  /** 读取本地音频文件的封面图，返回 data URL（无封面返回 null）。 */
  getAudioCover(filePath: string): Promise<string | null>;
  /** 回读本地音频文件字节，用于重启后恢复本地播放源（失败返回 null）。 */
  getAudioFileData(filePath: string): Promise<Uint8Array | null>;
  /** 网易云：生成扫码登录二维码（data URL）。 */
  createNeteaseQrLogin(): Promise<ProviderQrLoginSession | null>;
  /** 网易云：轮询扫码状态。 */
  pollNeteaseQrLogin(key: string): Promise<ProviderQrPollResult>;
  /** 网易云：读取当前登录账号。 */
  getNeteaseAuthStatus(): Promise<{ loggedIn: boolean; account: ProviderAccount | null }>;
  /** 网易云：退出登录。 */
  logoutNetease(): Promise<boolean>;
  /** 网易云：内容入口（推荐歌单 + 排行榜）。 */
  getNeteaseHomeContent(): Promise<ProviderHomeContent>;
  /** 网易云：歌单/榜单曲目列表。 */
  getNeteasePlaylistTracks(playlistId: string): Promise<ProviderTrack[]>;
}

export interface SharedIpcWindow {
  musicOS: MusicOsApi;
}

declare global {
  interface Window {
    musicOS: MusicOsApi;
  }
}
