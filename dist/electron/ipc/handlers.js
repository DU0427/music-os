"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAppHandlers = registerAppHandlers;
const electron_1 = require("electron");
const channels_1 = require("./channels");
const cover_1 = require("../audio/cover");
const file_data_1 = require("../audio/file-data");
const auth_1 = require("../providers/netease/auth");
const login_window_1 = require("../providers/netease/login-window");
const content_1 = require("../providers/netease/content");
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function assertTrack(value) {
    if (!isRecord(value) || typeof value.id !== 'string' || typeof value.title !== 'string' || typeof value.artist !== 'string') {
        throw new Error('Invalid track payload.');
    }
}
function assertHistory(value) {
    if (!isRecord(value) || typeof value.id !== 'string' || typeof value.trackId !== 'string') {
        throw new Error('Invalid listening history payload.');
    }
}
function assertMemory(value) {
    if (!isRecord(value) || typeof value.id !== 'string' || typeof value.trackId !== 'string' || typeof value.note !== 'string') {
        throw new Error('Invalid listening memory payload.');
    }
}
function assertListeningHistoryUpdate(value) {
    if (!isRecord(value) ||
        typeof value.id !== 'string' ||
        typeof value.trackId !== 'string' ||
        typeof value.startedAt !== 'string' ||
        (value.endedAt !== null && typeof value.endedAt !== 'string') ||
        typeof value.durationSeconds !== 'number') {
        throw new Error('Invalid listening history update payload.');
    }
}
function assertWorldSetting(value) {
    if (!isRecord(value) || typeof value.key !== 'string' || typeof value.value !== 'string') {
        throw new Error('Invalid world setting payload.');
    }
}
function assertPlaybackState(value) {
    if (!isRecord(value) || typeof value.positionSeconds !== 'number' || typeof value.isPlaying !== 'boolean') {
        throw new Error('Invalid playback state payload.');
    }
}
function assertProviderReference(value) {
    if (!isRecord(value) ||
        (value.providerId !== 'mock' && value.providerId !== 'netease' && value.providerId !== 'qq') ||
        typeof value.platformTrackId !== 'string') {
        throw new Error('Invalid provider reference payload.');
    }
}
function registerAppHandlers(repository, providers) {
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.ready, async () => {
        return {
            appName: 'Music OS Desktop',
            startedAt: new Date().toISOString(),
        };
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.ping, async (_event, payload) => {
        return {
            message: `ack:${payload.message}`,
            timestamp: new Date().toISOString(),
        };
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.error, async (_event, payload) => {
        const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : 'unknown_error';
        const detail = isRecord(payload) && typeof payload.detail === 'string' ? payload.detail : undefined;
        console.error(`Renderer error [${code}]`, detail ?? '');
        return { acknowledged: true };
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.tracksList, () => repository.listTracks());
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.tracksUpsert, (_event, payload) => {
        assertTrack(payload);
        return repository.upsertTrack(payload);
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.historyList, () => repository.listListeningHistory());
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.historyAdd, (_event, payload) => {
        assertHistory(payload);
        return repository.addListeningHistory(payload);
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.historyUpdate, (_event, payload) => {
        assertListeningHistoryUpdate(payload);
        return repository.updateListeningHistory(payload);
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.memoriesList, () => repository.listListeningMemories());
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.memoriesAdd, (_event, payload) => {
        assertMemory(payload);
        return repository.addListeningMemory(payload);
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.worldSettingsGet, (_event, key) => {
        if (typeof key !== 'string') {
            throw new Error('Invalid world setting key.');
        }
        return repository.getWorldSetting(key);
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.worldSettingsSet, (_event, payload) => {
        assertWorldSetting(payload);
        return repository.setWorldSetting(payload);
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.playbackGet, () => repository.getPlaybackState());
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.playbackSave, (_event, payload) => {
        assertPlaybackState(payload);
        return repository.savePlaybackState(payload);
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.providerSearch, (_event, payload) => {
        if (!isRecord(payload) || typeof payload.query !== 'string') {
            throw new Error('Invalid provider search payload.');
        }
        const providerId = readProviderId(payload.providerId) ?? 'mock';
        if (providerId !== 'mock' && providerId !== 'netease' && providerId !== 'qq') {
            throw new Error('Invalid music provider.');
        }
        return providers.search({
            providerId: providerId,
            text: payload.query,
            limit: 20,
            cursor: null,
        });
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.providerTrack, (_event, payload) => {
        assertProviderReference(payload);
        return providers.getTrack(payload);
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.providerPlayable, (_event, payload) => {
        assertProviderReference(payload);
        return providers.getPlayableSource(payload);
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.audioCover, async (_event, filePath) => {
        if (typeof filePath !== 'string' || filePath.trim() === '') {
            return null;
        }
        return (0, cover_1.readAudioCover)(filePath);
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.audioFileData, async (_event, filePath) => {
        if (typeof filePath !== 'string' || filePath.trim() === '') {
            return null;
        }
        return (0, file_data_1.readAudioFileData)(filePath);
    });
    /* ——— 网易云：扫码登录与内容入口 ——— */
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.neteaseLoginWindow, async (event) => {
        const parent = electron_1.BrowserWindow.fromWebContents(event.sender);
        try {
            return await (0, login_window_1.openNeteaseLoginWindow)(parent);
        }
        catch (error) {
            console.warn('[netease-login] window failed:', error instanceof Error ? error.message : String(error));
            return null;
        }
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.neteaseQrCreate, async () => {
        try {
            return await (0, auth_1.createQrLogin)();
        }
        catch {
            return null;
        }
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.neteaseQrPoll, async (_event, key) => {
        if (typeof key !== 'string' || key.trim() === '') {
            return { status: 'error', account: null };
        }
        try {
            return await (0, auth_1.pollQrLogin)(key);
        }
        catch (error) {
            // 记录失败原因（网络 / 非 JSON / 超时），不含任何凭据
            console.warn('[netease-qr] poll failed:', error instanceof Error ? error.message : String(error));
            return { status: 'error', account: null };
        }
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.neteaseAuthStatus, async () => {
        const account = await (0, auth_1.fetchAccount)();
        return { loggedIn: account !== null, account };
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.neteaseLogout, async () => {
        await (0, auth_1.logoutNetease)();
        return true;
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.neteaseHome, async () => (0, content_1.getNeteaseHomeContent)());
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.neteaseDaily, async (_event, limit) => {
        const requested = typeof limit === 'number' && limit > 0 && limit <= 50 ? Math.floor(limit) : 12;
        return (0, content_1.getNeteaseDailySongs)(requested);
    });
    electron_1.ipcMain.handle(channels_1.APP_IPC_CHANNELS.neteasePlaylistTracks, async (_event, playlistId) => {
        if (typeof playlistId !== 'string' || playlistId.trim() === '') {
            return [];
        }
        try {
            return await (0, content_1.getNeteasePlaylistTracks)(playlistId);
        }
        catch {
            return [];
        }
    });
}
function readProviderId(value) {
    if (value === 'mock' || value === 'netease' || value === 'qq') {
        return value;
    }
    return undefined;
}
