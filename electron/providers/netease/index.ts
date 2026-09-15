import type {
  MusicProvider,
  PlayableSource,
  ProviderSearchQuery,
  ProviderSearchResult,
  ProviderTrack,
  ProviderTrackDetail,
  ProviderTrackReference,
} from '../../../src/shared/music/providers';
import { ProviderError } from '../errors';
import { fetchAccount } from './auth';
import { neteaseRequest } from './http';

/** 网易云歌曲载荷：搜索接口（cloudsearch）用 al/ar/dt，详情接口（song/detail）用 album/artists/duration。 */
interface NeteaseSongPayload {
  id: number;
  name: string;
  al?: { id: number; name: string; picUrl?: string } | null;
  ar?: Array<{ id: number; name: string }>;
  dt?: number;
  album?: { id: number; name: string; picUrl?: string } | null;
  artists?: Array<{ id: number; name: string }>;
  duration?: number;
}

interface SearchResponse {
  code: number;
  result?: {
    songs?: NeteaseSongPayload[];
    songCount?: number;
  };
}

interface DetailResponse {
  code: number;
  songs?: NeteaseSongPayload[];
}

interface PlayerUrlEntry {
  id: number;
  url: string | null;
  br: number;
  size: number;
  code: number;
  fee: number;
  level?: string | null;
  encodeType?: string | null;
  type?: string | null;
  expi?: number;
  freeTrialInfo?: { start: number; end: number } | null;
}

interface PlayerUrlResponse {
  code: number;
  data?: PlayerUrlEntry[];
}

function mapSong(song: NeteaseSongPayload): ProviderTrack {
  const artist = song.ar?.[0] ?? song.artists?.[0] ?? null;
  const album = song.al ?? song.album ?? null;
  const durationMs = song.dt ?? song.duration ?? 0;
  return {
    reference: { providerId: 'netease', platformTrackId: String(song.id) },
    title: song.name,
    artist: { id: artist ? String(artist.id) : null, name: artist?.name ?? '未知歌手' },
    album: album
      ? { id: String(album.id), title: album.name, artworkUrl: album.picUrl ?? null }
      : null,
    durationSeconds: durationMs > 0 ? durationMs / 1000 : 0,
    artworkUrl: album?.picUrl ?? null,
  };
}

export class NeteaseMusicProvider implements MusicProvider {
  readonly id = 'netease' as const;
  readonly source = 'remote' as const;
  readonly capabilities = {
    search: true,
    trackDetails: true,
    playableSource: true,
    requiresAuthentication: true,
  };

  async search(query: ProviderSearchQuery): Promise<ProviderSearchResult> {
    const limit = Math.min(Math.max(query.limit || 20, 1), 30);
    const offset = query.cursor ? Number.parseInt(query.cursor, 10) || 0 : 0;

    const data = await neteaseRequest<SearchResponse>('/api/cloudsearch/pc', {
      method: 'POST',
      form: {
        s: query.text,
        type: '1',
        limit: String(limit),
        offset: String(offset),
      },
    });
    if (data.code !== 200) {
      throw new ProviderError('netease', 'INVALID_RESPONSE', '网易云搜索返回异常，请稍后重试。', true, 3_000);
    }
    const songs = data.result?.songs ?? [];
    const total = data.result?.songCount ?? songs.length;
    const nextOffset = offset + songs.length;
    return {
      providerId: 'netease',
      query: query.text,
      tracks: songs.map(mapSong),
      nextCursor: nextOffset < total ? String(nextOffset) : null,
      source: 'remote',
      error: null,
    };
  }

  async getTrack(reference: ProviderTrackReference): Promise<ProviderTrackDetail | null> {
    const ids = encodeURIComponent(`[${reference.platformTrackId}]`);
    const data = await neteaseRequest<DetailResponse>(`/api/song/detail?ids=${ids}`);
    const song = data.songs?.[0];
    if (data.code !== 200 || !song) {
      return null;
    }
    return { ...mapSong(song), playableSource: null };
  }

  async getPlayableSource(reference: ProviderTrackReference): Promise<PlayableSource | null> {
    const ids = encodeURIComponent(`[${reference.platformTrackId}]`);
    const data = await neteaseRequest<PlayerUrlResponse>(
      `/api/song/enhance/player/url/v1?ids=${ids}&level=standard&encodeType=aac`,
    );
    const entry = data.data?.[0];

    if (entry?.url) {
      return {
        url: entry.url,
        mimeType: entry.type ? `audio/${entry.type}` : entry.encodeType === 'aac' ? 'audio/aac' : null,
        expiresAt: entry.expi ? new Date(Date.now() + entry.expi * 1000).toISOString() : null,
        requiresAuth: false,
        licenseStatus: 'unknown',
      };
    }

    // 无播放地址：区分「需要登录」与「版权/付费受限」，不伪造可播放能力
    const account = await fetchAccount();
    if (!account) {
      throw new ProviderError(
        'netease',
        'AUTH_REQUIRED',
        '该曲目需要登录网易云账号后播放。',
        false,
        null,
      );
    }
    const isTrial = Boolean(entry?.freeTrialInfo);
    throw new ProviderError(
      'netease',
      'UNAVAILABLE',
      isTrial ? '该曲目仅支持试听，完整播放需要会员或购买。' : '该曲目当前不可播放（版权或付费限制）。',
      false,
      null,
    );
  }
}
