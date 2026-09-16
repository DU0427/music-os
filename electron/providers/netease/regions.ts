import type { ProviderPlaylistSummary, ProviderRegionDensity } from '../../../src/shared/music/providers';
import { neteaseRequest } from './http';

/** 语种地区与代表坐标（网易云歌单分类的「语种」维度，真实数据）。 */
export const NETEASE_REGIONS: Array<{ id: string; label: string; cat: string; lat: number; lng: number }> = [
  { id: 'huayu', label: '华语', cat: '华语', lat: 31.23, lng: 121.47 },
  { id: 'oumei', label: '欧美', cat: '欧美', lat: 51.5, lng: -0.12 },
  { id: 'riyu', label: '日语', cat: '日语', lat: 35.68, lng: 139.69 },
  { id: 'hanyu', label: '韩语', cat: '韩语', lat: 37.57, lng: 126.98 },
  { id: 'yueyu', label: '粤语', cat: '粤语', lat: 22.32, lng: 114.17 },
  { id: 'xiaoyuzhong', label: '小语种', cat: '小语种', lat: 48.86, lng: 2.35 },
];

interface PlaylistListResponse {
  code: number;
  total?: number;
  playlists?: Array<{
    id: number;
    name: string;
    coverImgUrl?: string;
    picUrl?: string;
    trackCount?: number;
    playCount?: number;
  }>;
}

/** 各地区内容密度：读取每个语种分类的歌单总数（真实总量）。 */
export async function getNeteaseRegionDensity(): Promise<ProviderRegionDensity[]> {
  const results = await Promise.all(
    NETEASE_REGIONS.map(async (region) => {
      try {
        const data = await neteaseRequest<PlaylistListResponse>(
          `/api/playlist/list?cat=${encodeURIComponent(region.cat)}&limit=1&offset=0`,
        );
        const total = data.code === 200 && typeof data.total === 'number' ? data.total : 0;
        return { id: region.id, label: region.label, lat: region.lat, lng: region.lng, playlistTotal: total };
      } catch {
        return { id: region.id, label: region.label, lat: region.lat, lng: region.lng, playlistTotal: 0 };
      }
    }),
  );
  return results;
}

/** 某地区（语种）下的歌单列表。 */
export async function getNeteaseRegionPlaylists(regionId: string, limit = 18): Promise<ProviderPlaylistSummary[]> {
  const region = NETEASE_REGIONS.find((candidate) => candidate.id === regionId);
  if (!region) {
    return [];
  }
  try {
    const data = await neteaseRequest<PlaylistListResponse>(
      `/api/playlist/list?cat=${encodeURIComponent(region.cat)}&limit=${Math.min(Math.max(limit, 1), 30)}&offset=0`,
    );
    if (data.code !== 200) {
      return [];
    }
    return (data.playlists ?? []).map((item) => ({
      id: String(item.id),
      title: item.name,
      coverUrl: item.coverImgUrl ?? item.picUrl ?? null,
      trackCount: typeof item.trackCount === 'number' ? item.trackCount : null,
      playCount: typeof item.playCount === 'number' ? item.playCount : null,
      kind: 'playlist' as const,
    }));
  } catch {
    return [];
  }
}
