/** Normalized identity for a track returned by a music provider. */
export interface MusicTrack {
  id: string;
  provider: MusicProviderId;
  title: string;
  artists: string[];
  album?: string;
  durationMs?: number;
  coverUrl?: string;
  playable?: boolean;
}

export type MusicProviderId = 'netease' | 'qq';

export interface MusicSearchQuery {
  keyword: string;
  page?: number;
  pageSize?: number;
}

export interface MusicSearchResult {
  tracks: MusicTrack[];
  total: number;
  page: number;
  pageSize: number;
}

/** Provider adapters translate platform APIs into the normalized contract above. */
export interface MusicProvider {
  readonly id: MusicProviderId;
  search(query: MusicSearchQuery): Promise<MusicSearchResult>;
  getTrack(trackId: string): Promise<MusicTrack | null>;
}
