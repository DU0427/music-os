"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapSong = mapSong;
/** 平台是否标注为需付费/VIP（fee：1 VIP、4 购买专辑）。 */
function requiresVip(song) {
    const fee = song.fee ?? song.privilege?.fee ?? 0;
    return fee === 1 || fee === 4;
}
/** 把网易云歌曲载荷映射为统一的 ProviderTrack（兼容两种字段结构）。 */
function mapSong(song) {
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
