"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNeteaseHomeContent = getNeteaseHomeContent;
const http_1 = require("./http");
/** 首页内容入口：推荐歌单 + 排行榜（均匿名可用）。 */
async function getNeteaseHomeContent() {
    const [playlists, toplists] = await Promise.all([
        fetchRecommendedPlaylists(),
        fetchToplists(),
    ]);
    return { playlists, toplists };
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
