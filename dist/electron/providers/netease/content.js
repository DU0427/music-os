"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNeteaseHomeContent = getNeteaseHomeContent;
exports.getNeteasePlaylistTracks = getNeteasePlaylistTracks;
exports.getNeteaseDailySongs = getNeteaseDailySongs;
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
/**
 * 每日推荐：登录后按口味个性化，未登录也能拿到通用推荐。
 * 走 weapi（官方网页 surface），返回结构为 v3 的 ar/al/dt，mapSong 已兼容。
 */
async function getNeteaseDailySongs(limit = 12) {
    try {
        const data = await (0, http_1.neteaseWebApi)('/weapi/v3/discovery/recommend/songs', {
            limit,
            offset: 0,
            total: true,
            n: 1000,
        });
        if (data.code !== 200) {
            return [];
        }
        return (data.data?.dailySongs ?? []).slice(0, limit).map(map_1.mapSong);
    }
    catch {
        return [];
    }
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
