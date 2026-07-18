"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const APP_IPC_CHANNELS = (() => {
    const sharedDefaults = {
        ready: 'app:ready',
        ping: 'app:ping',
        error: 'app:error',
        prepareToClose: 'app:prepare-close',
        prepareToCloseAck: 'app:prepare-close-ack',
        tracksList: 'music:tracks:list',
        tracksUpsert: 'music:tracks:upsert',
        historyList: 'music:history:list',
        historyAdd: 'music:history:add',
        historyUpdate: 'music:history:update',
        memoriesList: 'music:memories:list',
        memoriesAdd: 'music:memories:add',
        worldSettingsGet: 'music:world-settings:get',
        worldSettingsSet: 'music:world-settings:set',
        playbackGet: 'music:playback:get',
        playbackSave: 'music:playback:save',
        providerSearch: 'music:provider:search',
        providerTrack: 'music:provider:track',
        providerPlayable: 'music:provider:playable-source',
    };
    try {
        const electronChannels = require('./ipc/channels');
        if (electronChannels?.APP_IPC_CHANNELS) {
            return electronChannels.APP_IPC_CHANNELS;
        }
    }
    catch {
        // fallback to distributed runtime constants
    }
    try {
        const srcChannels = require('../src/shared/ipc/channels');
        if (srcChannels?.APP_IPC_CHANNELS) {
            return srcChannels.APP_IPC_CHANNELS;
        }
    }
    catch {
        // fallback to literal defaults for environments without dist/src mapping
    }
    return sharedDefaults;
})();
const api = {
    ready: () => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.ready),
    ping: (message) => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.ping, {
        message,
        timestamp: new Date().toISOString(),
    }),
    reportError: (payload) => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.error, payload),
    onPrepareToClose: (handler) => {
        const listener = async () => {
            try {
                await handler();
            }
            finally {
                electron_1.ipcRenderer.send(APP_IPC_CHANNELS.prepareToCloseAck);
            }
        };
        electron_1.ipcRenderer.on(APP_IPC_CHANNELS.prepareToClose, listener);
        return () => electron_1.ipcRenderer.removeListener(APP_IPC_CHANNELS.prepareToClose, listener);
    },
    listTracks: () => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.tracksList),
    upsertTrack: (track) => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.tracksUpsert, track),
    listListeningHistory: () => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.historyList),
    addListeningHistory: (record) => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.historyAdd, record),
    updateListeningHistory: (record) => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.historyUpdate, record),
    listListeningMemories: () => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.memoriesList),
    addListeningMemory: (record) => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.memoriesAdd, record),
    getWorldSetting: (key) => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.worldSettingsGet, key),
    setWorldSetting: (record) => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.worldSettingsSet, record),
    getPlaybackState: () => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.playbackGet),
    savePlaybackState: (state) => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.playbackSave, state),
    searchMusic: (query, providerId) => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.providerSearch, { query, providerId }),
    getProviderTrack: (reference) => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.providerTrack, reference),
    getProviderPlayableSource: (reference) => electron_1.ipcRenderer.invoke(APP_IPC_CHANNELS.providerPlayable, reference),
};
electron_1.contextBridge.exposeInMainWorld('musicOS', api);
