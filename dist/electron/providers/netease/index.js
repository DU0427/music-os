"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeteaseMusicProvider = void 0;
const errors_1 = require("../errors");
const auth_1 = require("./auth");
const http_1 = require("./http");
const map_1 = require("./map");
class NeteaseMusicProvider {
    id = 'netease';
    source = 'remote';
    capabilities = {
        search: true,
        trackDetails: true,
        playableSource: true,
        requiresAuthentication: true,
    };
    async search(query) {
        const limit = Math.min(Math.max(query.limit || 20, 1), 30);
        const offset = query.cursor ? Number.parseInt(query.cursor, 10) || 0 : 0;
        const data = await (0, http_1.neteaseRequest)('/api/cloudsearch/pc', {
            method: 'POST',
            form: {
                s: query.text,
                type: '1',
                limit: String(limit),
                offset: String(offset),
            },
        });
        if (data.code !== 200) {
            throw new errors_1.ProviderError('netease', 'INVALID_RESPONSE', '网易云搜索返回异常，请稍后重试。', true, 3_000);
        }
        const songs = data.result?.songs ?? [];
        const total = data.result?.songCount ?? songs.length;
        const nextOffset = offset + songs.length;
        return {
            providerId: 'netease',
            query: query.text,
            tracks: songs.map(map_1.mapSong),
            nextCursor: nextOffset < total ? String(nextOffset) : null,
            source: 'remote',
            error: null,
        };
    }
    async getTrack(reference) {
        const ids = encodeURIComponent(`[${reference.platformTrackId}]`);
        const data = await (0, http_1.neteaseRequest)(`/api/song/detail?ids=${ids}`);
        const song = data.songs?.[0];
        if (data.code !== 200 || !song) {
            return null;
        }
        return { ...(0, map_1.mapSong)(song), playableSource: null };
    }
    async getPlayableSource(reference) {
        const ids = encodeURIComponent(`[${reference.platformTrackId}]`);
        const data = await (0, http_1.neteaseRequest)(`/api/song/enhance/player/url/v1?ids=${ids}&level=standard&encodeType=aac`);
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
        const account = await (0, auth_1.fetchAccount)();
        if (!account) {
            throw new errors_1.ProviderError('netease', 'AUTH_REQUIRED', '该曲目需要登录网易云账号后播放。', false, null);
        }
        const isTrial = Boolean(entry?.freeTrialInfo);
        throw new errors_1.ProviderError('netease', 'UNAVAILABLE', isTrial ? '该曲目仅支持试听，完整播放需要会员或购买。' : '该曲目当前不可播放（版权或付费限制）。', false, null);
    }
}
exports.NeteaseMusicProvider = NeteaseMusicProvider;
