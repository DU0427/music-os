"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readAudioFileData = readAudioFileData;
const node_fs_1 = require("node:fs");
/** 本地音频 IPC 回读上限：避免异常大文件一次性占满主进程与渲染进程内存。 */
const MAX_AUDIO_BYTES = 256 * 1024 * 1024;
/**
 * 回读本地音频文件字节，用于重启后自动恢复本地文件播放源。
 * 文件不存在、不是文件、为空或超过上限时返回 null。
 */
async function readAudioFileData(filePath) {
    try {
        const stats = await node_fs_1.promises.stat(filePath);
        if (!stats.isFile() || stats.size <= 0 || stats.size > MAX_AUDIO_BYTES) {
            return null;
        }
        return await node_fs_1.promises.readFile(filePath);
    }
    catch {
        return null;
    }
}
