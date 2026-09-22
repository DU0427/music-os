import { promises as fs } from 'node:fs';
import path from 'node:path';

/** 同目录封面候选扩展名（按优先级排列）。 */
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/** 目录封面大小上限，避免异常大图进入 SQLite 与长期内存。 */
const MAX_COVER_BYTES = 8 * 1024 * 1024;

interface CoverPicture {
  data: Uint8Array;
  format?: string;
}

interface ParsedMetadata {
  common: { picture?: CoverPicture[] };
}

type ParseFile = (filePath: string, options: { duration: boolean }) => Promise<ParsedMetadata>;

// music-metadata 为 ESM-only，从 CJS 主进程需真实动态 import()。
// TS 会把 import() 降级为 require()，故用 new Function 保留原生 import()。
const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<{ parseFile: ParseFile }>;

const toDataUrl = (mime: string, data: Uint8Array): string =>
  `data:${mime};base64,${Buffer.from(data).toString('base64')}`;

/** 读取音频文件内嵌封面（ID3/FLAC picture）。 */
async function readEmbeddedCover(filePath: string): Promise<string | null> {
  try {
    const { parseFile } = await dynamicImport('music-metadata');
    const metadata = await parseFile(filePath, { duration: false });
    const picture = metadata.common.picture?.[0];
    if (!picture?.data) {
      return null;
    }
    // 与目录封面同一 8MB 上限：异常大的内嵌图不进 SQLite data URL
    if (picture.data.byteLength > MAX_COVER_BYTES) {
      return null;
    }
    return toDataUrl(picture.format || 'image/jpeg', picture.data);
  } catch {
    return null;
  }
}

/** 读取同目录封面：cover.* → folder.* → 同名图片（文件名不区分大小写）。 */
async function readDirectoryCover(filePath: string): Promise<string | null> {
  const directory = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath)).toLowerCase();

  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return null;
  }

  const imagesByName = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const extension = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(extension as (typeof IMAGE_EXTENSIONS)[number])) {
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
        const coverPath = path.join(directory, actualName);
        const stats = await fs.stat(coverPath);
        if (stats.size <= 0 || stats.size > MAX_COVER_BYTES) {
          continue;
        }
        const data = await fs.readFile(coverPath);
        return toDataUrl(MIME_BY_EXTENSION[extension] ?? 'image/jpeg', data);
      } catch {
        continue;
      }
    }
  }
  return null;
}

/** 封面优先级：内嵌封面 → 同目录 cover.* / folder.* / 同名图片。 */
export async function readAudioCover(filePath: string): Promise<string | null> {
  const embedded = await readEmbeddedCover(filePath);
  if (embedded) {
    return embedded;
  }
  return readDirectoryCover(filePath);
}
