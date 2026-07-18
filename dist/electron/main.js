"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const channels_1 = require("./ipc/channels");
const main_window_1 = require("./windows/main-window");
const handlers_1 = require("./ipc/handlers");
const connection_1 = require("./database/connection");
const music_repository_1 = require("./database/repositories/music-repository");
const providers_1 = require("./providers");
let mainWindow = null;
let handlersRegistered = false;
let musicRepository = null;
let providerRegistry = null;
let isAppClosing = false;
function requestRendererCloseFlush(windowRef) {
    return new Promise((resolve) => {
        if (windowRef.isDestroyed()) {
            resolve();
            return;
        }
        let settled = false;
        let timer;
        const acknowledge = () => {
            finalize();
        };
        const finalize = () => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            electron_1.ipcMain.removeListener(channels_1.APP_IPC_CHANNELS.prepareToCloseAck, acknowledge);
            resolve();
        };
        timer = setTimeout(() => {
            finalize();
        }, 700);
        electron_1.ipcMain.once(channels_1.APP_IPC_CHANNELS.prepareToCloseAck, acknowledge);
        try {
            windowRef.webContents.send(channels_1.APP_IPC_CHANNELS.prepareToClose);
        }
        catch {
            finalize();
        }
    });
}
function bootstrap() {
    try {
        const windowRef = (0, main_window_1.createMainWindow)();
        mainWindow = windowRef;
        if (!handlersRegistered) {
            const providerRegistryPath = node_path_1.default.join(electron_1.app.getPath('userData'), 'music-os.sqlite');
            try {
                musicRepository = new music_repository_1.MusicRepository((0, connection_1.openDatabase)(providerRegistryPath));
            }
            catch (error) {
                console.warn('Failed to initialize SQLite repository, using in-memory fallback:', error?.message ?? error);
                musicRepository = createFallbackMusicRepository();
            }
            providerRegistry = (0, providers_1.createProviderRegistry)();
            (0, handlers_1.registerAppHandlers)(musicRepository, providerRegistry);
            handlersRegistered = true;
        }
        windowRef.on('closed', () => {
            mainWindow = null;
        });
        if (!electron_1.app.isPackaged) {
            windowRef.webContents.openDevTools({ mode: 'detach' });
        }
        const csp = [
            "default-src 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
            "img-src 'self' data:",
            "media-src 'self' blob:",
            "style-src 'self' 'unsafe-inline'",
            "script-src 'self'",
            "connect-src 'self' http://127.0.0.1:5173 ws://127.0.0.1:5173",
            "font-src 'self' data:",
        ].join('; ');
        windowRef.webContents.session.webRequest.onHeadersReceived((details, callback) => {
            const responseHeaders = {
                ...details.responseHeaders,
            };
            responseHeaders['Content-Security-Policy'] = [csp];
            callback({ responseHeaders });
        });
    }
    catch (error) {
        console.error('Failed to create main window:', error);
        electron_1.app.quit();
    }
}
electron_1.app.on('ready', () => {
    electron_1.nativeTheme.themeSource = 'dark';
    bootstrap();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('before-quit', (event) => {
    if (isAppClosing || !mainWindow || mainWindow.isDestroyed()) {
        return;
    }
    event.preventDefault();
    isAppClosing = true;
    void (async () => {
        try {
            await requestRendererCloseFlush(mainWindow);
        }
        finally {
            electron_1.app.exit(0);
        }
    })();
});
electron_1.app.on('will-quit', () => {
    musicRepository?.close();
    musicRepository = null;
    providerRegistry = null;
});
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        bootstrap();
    }
});
function createFallbackMusicRepository() {
    const tracks = new Map();
    const listeningHistory = [];
    const listeningMemories = [];
    const worldSettings = new Map();
    let playbackState = null;
    return {
        listTracks() {
            return [...tracks.values()];
        },
        upsertTrack(track) {
            tracks.set(track.id, { ...track });
            return track;
        },
        listListeningHistory() {
            return listeningHistory;
        },
        addListeningHistory(record) {
            listeningHistory.unshift({ ...record });
            return record;
        },
        updateListeningHistory(record) {
            const index = listeningHistory.findIndex((item) => item.id === record.id);
            if (index >= 0) {
                listeningHistory[index] = { ...record };
            }
            else {
                listeningHistory.unshift({ ...record });
            }
            return record;
        },
        listListeningMemories() {
            return listeningMemories;
        },
        addListeningMemory(record) {
            listeningMemories.unshift({ ...record });
            return record;
        },
        getWorldSetting(key) {
            return worldSettings.get(key) ?? null;
        },
        setWorldSetting(record) {
            const value = { ...record };
            worldSettings.set(record.key, value);
            return value;
        },
        getPlaybackState() {
            return playbackState;
        },
        savePlaybackState(state) {
            playbackState = { ...state };
            return state;
        },
        close() {
            tracks.clear();
            listeningHistory.length = 0;
            listeningMemories.length = 0;
            worldSettings.clear();
            playbackState = null;
        },
    };
}
