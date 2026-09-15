"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readAudioCover = readAudioCover;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
/** 同目录封面候选扩展名（按优先级排列）。 */
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MIME_BY_EXTENSION = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
};
/** 目录封面大小上限，避免异常大图进入 SQLite 与长期内存。 */
const MAX_COVER_BYTES = 8 * 1024 * 1024;
// music-metadata 为 ESM-only，从 CJS 主进程需真实动态 import()。
// TS 会把 import() 降级为 require()，故用 new Function 保留原生 import()。
const dynamicImport = new Function('specifier', 'return import(specifier)');
const toDataUrl = (mime, data) => `data:${mime};base64,${Buffer.from(data).toString('base64')}`;
/** 读取音频文件内嵌封面（ID3/FLAC picture）。 */
async function readEmbeddedCover(filePath) {
    try {
        const { parseFile } = await dynamicImport('music-metadata');
        const metadata = await parseFile(filePath, { duration: false });
        const picture = metadata.common.picture?.[0];
        if (!picture?.data) {
            return null;
        }
        return toDataUrl(picture.format || 'image/jpeg', picture.data);
    }
    catch {
        return null;
    }
}
/** 读取同目录封面：cover.* → folder.* → 同名图片（文件名不区分大小写）。 */
async function readDirectoryCover(filePath) {
    const directory = node_path_1.default.dirname(filePath);
    const baseName = node_path_1.default.basename(filePath, node_path_1.default.extname(filePath)).toLowerCase();
    let entries;
    try {
        entries = await node_fs_1.promises.readdir(directory, { withFileTypes: true });
    }
    catch {
        return null;
    }
    const imagesByName = new Map();
    for (const entry of entries) {
        if (!entry.isFile()) {
            continue;
        }
        const extension = node_path_1.default.extname(entry.name).toLowerCase();
        if (!IMAGE_EXTENSIONS.includes(extension)) {
            continue;
        }
        imagesByName.set(entry.name.toLowerCase(), entry.name);
    }
    for (const stem of ['cover', 'folder', baseName]) {
        for (const extension of IMAGE_EXTENSIONS) {
            const actualName = imagesByName.get(`${stem}${extension}`);
            if (!actualName) {
                continue;
            }
            try {
                const coverPath = node_path_1.default.join(directory, actualName);
                const stats = await node_fs_1.promises.stat(coverPath);
                if (stats.size <= 0 || stats.size > MAX_COVER_BYTES) {
                    continue;
                }
                const data = await node_fs_1.promises.readFile(coverPath);
                return toDataUrl(MIME_BY_EXTENSION[extension] ?? 'image/jpeg', data);
            }
            catch {
                continue;
            }
        }
    }
    return null;
}
/** 封面优先级：内嵌封面 → 同目录 cover.* / folder.* / 同名图片。 */
async function readAudioCover(filePath) {
    const embedded = await readEmbeddedCover(filePath);
    if (embedded) {
        return embedded;
    }
    return readDirectoryCover(filePath);
}
