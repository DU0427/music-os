import type { ProviderTrack } from '../../../src/shared/music/providers';

/** 网易云歌曲载荷：搜索接口（cloudsearch）用 al/ar/dt，详情与歌单接口（song/detail、playlist/detail）用 album/artists/duration。 */
export interface NeteaseSongPayload {
  id: number;
  name: string;
  al?: { id: number; name: string; picUrl?: string } | null;
  ar?: Array<{ id: number; name: string }>;
  dt?: number;
  album?: { id: number; name: string; picUrl?: string } | null;
  artists?: Array<{ id: number; name: string }>;
  duration?: number;
  /** 0 免费 / 1 VIP / 4 购买专辑 / 8 低音质免费 */
  fee?: number;
  privilege?: { fee?: number } | null;
}

/** 平台是否标注为需付费/VIP（fee：1 VIP、4 购买专辑）。 */
function requiresVip(song: NeteaseSongPayload): boolean {
  const fee = song.fee ?? song.privilege?.fee ?? 0;
  return fee === 1 || fee === 4;
}

/** 把网易云歌曲载荷映射为统一的 ProviderTrack（兼容两种字段结构）。 */
export function mapSong(song: NeteaseSongPayload): ProviderTrack {
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
    requiresVip: requiresVip(song),
  };
}
