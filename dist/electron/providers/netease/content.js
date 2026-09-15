"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNeteaseHomeContent = getNeteaseHomeContent;
exports.getNeteasePlaylistTracks = getNeteasePlaylistTracks;
const http_1 = require("./http");
const map_1 = require("./map");
/** 首页内容入口：推荐歌单 + 排行榜（均匿名可用）。 */
async function getNeteaseHomeContent() {
    const [playlists, toplists] = await Promise.all([
        fetchRecommendedPlaylists(),
        fetchToplists(),
    ]);
    return { playlists, toplists };
}
/** 歌单/榜单曲目：playlist/detail 对歌单与榜单通用。 */
async function getNeteasePlaylistTracks(playlistId) {
    const data = await (0, http_1.neteaseRequest)(`/api/playlist/detail?id=${encodeURIComponent(playlistId)}`);
    const tracks = data.result?.tracks ?? [];
    return tracks.map(map_1.mapSong);
}
async function fetchRecommendedPlaylists() {
    try {
        const data = await (0, http_1.neteaseRequest)('/api/personalized/playlist?limit=12');
        if (data.code !== 200) {
            return [];
        }
        return (data.result ?? []).map((item) => ({
            id: String(item.id),
            title: item.name,
            coverUrl: item.picUrl ?? null,
            trackCount: typeof item.trackCount === 'number' ? item.trackCount : null,
            playCount: typeof item.playCount === 'number' ? item.playCount : null,
            kind: 'playlist',
        }));
    }
    catch {
        return [];
    }
}
async function fetchToplists() {
    try {
        const data = await (0, http_1.neteaseRequest)('/api/toplist/detail');
        if (data.code !== 200) {
            return [];
        }
        return (data.list ?? []).map((item) => ({
            id: String(item.id),
            title: item.name,
            coverUrl: item.coverImgUrl ?? null,
            trackCount: typeof item.trackCount === 'number' ? item.trackCount : null,
            playCount: typeof item.playCount === 'number' ? item.playCount : null,
            kind: 'toplist',
        }));
    }
    catch {
        return [];
    }
}
