import type { TrackRecord, ListeningHistoryRecord } from '../../shared/ipc/music';

export type RegionId = 'huayu' | 'oumei' | 'riyu' | 'hanyu' | 'yueyu' | 'xiaoyuzhong';

export interface RegionPoint {
  id: RegionId;
  label: string;
  lat: number;
  lng: number;
  /** 地区语义色（数据编码，非装饰） */
  color: string;
}

/** 语种地区与代表坐标、语义色（与主进程 regions.ts 的坐标保持一致）。 */
export const REGION_POINTS: RegionPoint[] = [
  { id: 'huayu', label: '华语', lat: 31.23, lng: 121.47, color: '#e8c28a' },
  { id: 'oumei', label: '欧美', lat: 51.5, lng: -0.12, color: '#8dbbff' },
  { id: 'riyu', label: '日语', lat: 35.68, lng: 139.69, color: '#e8a0b4' },
  { id: 'hanyu', label: '韩语', lat: 37.57, lng: 126.98, color: '#b58cff' },
  { id: 'yueyu', label: '粤语', lat: 22.32, lng: 114.17, color: '#f0b56a' },
  { id: 'xiaoyuzhong', label: '小语种', lat: 48.86, lng: 2.35, color: '#a1d9b8' },
];

export function findRegion(id: string): RegionPoint | null {
  return REGION_POINTS.find((region) => region.id === id) ?? null;
}

/**
 * 按文字脚本近似歌手的语种地区（无法精确，故在 UI 中标注「按名称近似」）。
 * 假名 → 日语；谚文 → 韩语；CJK → 华语；拉丁 → 欧美。
 */
export function classifyTrackRegion(track: Pick<TrackRecord, 'artist' | 'title'>): RegionId | null {
  const text = `${track.artist} ${track.title}`;
  if (/[\u3040-\u30ff]/.test(text)) return 'riyu';
  if (/[\uac00-\ud7af]/.test(text)) return 'hanyu';
  if (/[\u4e00-\u9fff]/.test(text)) return 'huayu';
  if (/[a-z]/i.test(text)) return 'oumei';
  return null;
}

export interface Footprint {
  /** 每个地区听过多少首（用于环脉冲强度）。 */
  counts: Array<{ region: RegionPoint; count: number }>;
  /** 聆听旅程：按时间顺序相邻的不同地区之间连线。 */
  journeys: Array<{ from: RegionPoint; to: RegionPoint }>;
}

export function buildFootprint(tracks: TrackRecord[], history: ListeningHistoryRecord[]): Footprint {
  const trackMap = new Map(tracks.map((track) => [track.id, track]));
  const counts = new Map<RegionId, number>();
  const ordered: RegionId[] = [];

  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );
  for (const record of sortedHistory) {
    const track = trackMap.get(record.trackId);
    if (!track) continue;
    const regionId = classifyTrackRegion(track);
    if (!regionId) continue;
    counts.set(regionId, (counts.get(regionId) ?? 0) + 1);
    if (ordered[ordered.length - 1] !== regionId) {
      ordered.push(regionId);
    }
  }

  const journeys: Array<{ from: RegionPoint; to: RegionPoint }> = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const from = findRegion(ordered[index - 1]);
    const to = findRegion(ordered[index]);
    if (from && to && from.id !== to.id) {
      journeys.push({ from, to });
    }
  }

  return {
    counts: [...counts.entries()]
      .map(([id, count]) => ({ region: findRegion(id)!, count }))
      .filter((entry) => Boolean(entry.region))
      .sort((a, b) => b.count - a.count),
    journeys: journeys.slice(-8),
  };
}
