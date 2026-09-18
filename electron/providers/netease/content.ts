import type {
  ProviderHomeContent,
  ProviderPlaylistSummary,
  ProviderTrack,
} from '../../../src/shared/music/providers';
import { neteaseRequest, neteaseWebApi } from './http';
import { mapSong, type NeteaseSongPayload } from './map';

interface PersonalizedPlaylistResponse {
  code: number;
  result?: Array<{
    id: number;
    name: string;
    picUrl?: string;
    trackCount?: number;
    playCount?: number;
  }>;
}

interface ToplistDetailResponse {
  code: number;
  list?: Array<{
    id: number;
    name: string;
    coverImgUrl?: string;
    trackCount?: number;
    playCount?: number;
  }>;
}

/** 首页内容入口：推荐歌单 + 排行榜（均匿名可用）。 */
export async function getNeteaseHomeContent(): Promise<ProviderHomeContent> {
  const [playlists, toplists] = await Promise.all([
    fetchRecommendedPlaylists(),
    fetchToplists(),
  ]);
  return { playlists, toplists };
}

interface PlaylistDetailResponse {
  code: number;
  result?: {
    tracks?: NeteaseSongPayload[];
  };
}

/** 歌单/榜单曲目：playlist/detail 对歌单与榜单通用。 */
export async function getNeteasePlaylistTracks(playlistId: string): Promise<ProviderTrack[]> {
  const data = await neteaseRequest<PlaylistDetailResponse>(
    `/api/playlist/detail?id=${encodeURIComponent(playlistId)}`,
  );
  const tracks = data.result?.tracks ?? [];
  return tracks.map(mapSong);
}

interface DailySongsResponse {
  code: number;
  data?: { dailySongs?: NeteaseSongPayload[] };
}

/**
 * 每日推荐：登录后按口味个性化，未登录也能拿到通用推荐。
 * 走 weapi（官方网页 surface），返回结构为 v3 的 ar/al/dt，mapSong 已兼容。
 */
export async function getNeteaseDailySongs(limit = 12): Promise<ProviderTrack[]> {
  try {
    const data = await neteaseWebApi<DailySongsResponse>('/weapi/v3/discovery/recommend/songs', {
      limit,
      offset: 0,
      total: true,
      n: 1000,
    });
    if (data.code !== 200) {
      return [];
    }
    return (data.data?.dailySongs ?? []).slice(0, limit).map(mapSong);
  } catch {
    return [];
  }
}

async function fetchRecommendedPlaylists(): Promise<ProviderPlaylistSummary[]> {
  try {
    const data = await neteaseRequest<PersonalizedPlaylistResponse>('/api/personalized/playlist?limit=12');
    if (data.code !== 200) {
      return [];
    }
    return (data.result ?? []).map((item) => ({
      id: String(item.id),
      title: item.name,
      coverUrl: item.picUrl ?? null,
      trackCount: typeof item.trackCount === 'number' ? item.trackCount : null,
      playCount: typeof item.playCount === 'number' ? item.playCount : null,
      kind: 'playlist' as const,
    }));
  } catch {
    return [];
  }
}

async function fetchToplists(): Promise<ProviderPlaylistSummary[]> {
  try {
    const data = await neteaseRequest<ToplistDetailResponse>('/api/toplist/detail');
    if (data.code !== 200) {
      return [];
    }
    return (data.list ?? []).map((item) => ({
      id: String(item.id),
      title: item.name,
      coverUrl: item.coverImgUrl ?? null,
      trackCount: typeof item.trackCount === 'number' ? item.trackCount : null,
      playCount: typeof item.playCount === 'number' ? item.playCount : null,
      kind: 'toplist' as const,
    }));
  } catch {
    return [];
  }
}
