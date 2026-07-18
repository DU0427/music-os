"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_IPC_CHANNELS = void 0;
exports.APP_IPC_CHANNELS = {
    ready: 'app:ready',
    ping: 'app:ping',
    error: 'app:error',
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
