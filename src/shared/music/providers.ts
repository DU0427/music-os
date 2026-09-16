export type MusicProviderId = 'mock' | 'netease' | 'qq';

export interface ProviderTrackReference {
  providerId: MusicProviderId;
  platformTrackId: string;
}

export interface ProviderArtist {
  id: string | null;
  name: string;
}

export interface ProviderAlbum {
  id: string | null;
  title: string;
  artworkUrl: string | null;
}

export interface PlayableSource {
  url: string;
  mimeType: string | null;
  expiresAt: string | null;
  requiresAuth: boolean;
  licenseStatus: 'unknown' | 'authorized';
}

export interface ProviderTrack {
  reference: ProviderTrackReference;
  title: string;
  artist: ProviderArtist;
  album: ProviderAlbum | null;
  durationSeconds: number;
  artworkUrl: string | null;
}

export interface ProviderTrackDetail extends ProviderTrack {
  playableSource: PlayableSource | null;
}

export interface ProviderTrackResult {
  providerId: MusicProviderId;
  reference: ProviderTrackReference;
  track: ProviderTrackDetail | null;
  error: ProviderErrorPayload | null;
}

export interface ProviderPlayableSourceResult {
  providerId: MusicProviderId;
  reference: ProviderTrackReference;
  playableSource: PlayableSource | null;
  error: ProviderErrorPayload | null;
}

export interface ProviderSearchQuery {
  providerId: MusicProviderId;
  text: string;
  limit: number;
  cursor: string | null;
}

export interface ProviderErrorPayload {
  providerId: MusicProviderId;
  code: 'AUTH_REQUIRED' | 'RATE_LIMITED' | 'NOT_IMPLEMENTED' | 'UNAVAILABLE' | 'INVALID_RESPONSE';
  message: string;
  retryable: boolean;
  retryAfterMs: number | null;
}

export interface ProviderSearchResult {
  providerId: MusicProviderId;
  query: string;
  tracks: ProviderTrack[];
  nextCursor: string | null;
  source: 'mock' | 'remote';
  error: ProviderErrorPayload | null;
}

export interface MusicProviderCapabilities {
  search: boolean;
  trackDetails: boolean;
  playableSource: boolean;
  requiresAuthentication: boolean;
}

export interface MusicProvider {
  readonly id: MusicProviderId;
  readonly source: 'mock' | 'remote';
  readonly capabilities: MusicProviderCapabilities;
  search(query: ProviderSearchQuery): Promise<ProviderSearchResult>;
  getTrack(reference: ProviderTrackReference): Promise<ProviderTrackDetail | null>;
  getPlayableSource(reference: ProviderTrackReference): Promise<PlayableSource | null>;
}

/* ——— 平台账号与内容入口（内容优先首页用） ——— */

export interface ProviderAccount {
  nickname: string;
  avatarUrl: string | null;
  userId: string | null;
}

export type ProviderQrStatus = 'waiting' | 'scanned' | 'confirmed' | 'expired' | 'error';

export interface ProviderQrLoginSession {
  key: string;
  qrDataUrl: string;
}

export interface ProviderQrPollResult {
  status: ProviderQrStatus;
  account: ProviderAccount | null;
}

export interface ProviderPlaylistSummary {
  id: string;
  title: string;
  coverUrl: string | null;
  trackCount: number | null;
  playCount: number | null;
  kind: 'playlist' | 'toplist';
}

export interface ProviderHomeContent {
  playlists: ProviderPlaylistSummary[];
  toplists: ProviderPlaylistSummary[];
}

/* ——— 地区（语种）内容密度：地球空间用 ——— */

export interface ProviderRegionDensity {
  id: string;
  label: string;
  lat: number;
  lng: number;
  playlistTotal: number;
}