import { promises as fs } from 'node:fs';

/** 本地音频 IPC 回读上限：避免异常大文件一次性占满主进程与渲染进程内存。 */
const MAX_AUDIO_BYTES = 256 * 1024 * 1024;

/**
 * 回读本地音频文件字节，用于重启后自动恢复本地文件播放源。
 * 文件不存在、不是文件、为空或超过上限时返回 null。
 */
export async function readAudioFileData(filePath: string): Promise<Uint8Array | null> {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile() || stats.size <= 0 || stats.size > MAX_AUDIO_BYTES) {
      return null;
    }
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}
