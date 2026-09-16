# Data Model —— SQLite 本地数据层

> 权威定义在代码：`electron/database/`（`connection.ts`、`migrations/index.ts`、`repositories/music-repository.ts`）与 `src/shared/ipc/music.ts`（记录类型）。
> 本文件说明表结构、迁移规则、Repository API 与体积/内存预算。**改 schema 或字段映射必须同步本文件**。

## 总览

- 数据库文件：`app.getPath('userData')/music-os.sqlite`（Windows 通常为 `%APPDATA%\music-os\music-os.sqlite`）。
- 打开即设置 `journal_mode = WAL` 与 `foreign_keys = ON`，随后按 `schema_migrations` 应用迁移（`openDatabase` → `runMigrations`）。
- 单连接 + 单 `MusicRepository` 实例，由 Main 进程持有；Renderer 只能经 IPC 访问（见 `docs/ipc-contracts.md`）。
- **内存回退**：初始化失败（典型为 `better-sqlite3` 原生绑定与 Electron ABI 不匹配）时，`main.ts` 打日志 `Failed to initialize SQLite repository, using in-memory fallback` 并使用内存实现，**数据不落盘**。修复方式：`npm run rebuild:sqlite`。

## 表结构（迁移 1–3，追加式）

### `tracks`

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | TEXT PK | Track Identity |
| `title` / `artist` | TEXT NOT NULL | |
| `album` / `source` | TEXT | `source` 为来源描述 |
| `duration_seconds` | REAL DEFAULT 0 | |
| `created_at` | TEXT NOT NULL | ISO 时间 |
| `artwork_url` | TEXT（迁移 2） | 封面 data URL（体积敏感，见下文预算） |
| `provider_id` | TEXT（迁移 2） | `'mock' / 'netease' / 'qq' / 'local-file'` |
| `provider_track_id` | TEXT（迁移 2） | 平台曲目 ID |
| `world_context` | TEXT（迁移 2） | `TrackWorldContext` 的 JSON 序列化 |
| `file_path` | TEXT（迁移 3） | 本地文件绝对路径，重启恢复用；provider 曲目为 `NULL` |

### `listening_history`

`id` TEXT PK、`track_id` → `tracks(id) ON DELETE CASCADE`、`started_at`、`ended_at`（可空）、`duration_seconds`。

### `listening_memories`

`id` TEXT PK、`track_id` → `tracks(id) ON DELETE CASCADE`、`note`、`created_at`。

### `user_world_settings`

`key` TEXT PK、`value` TEXT、`updated_at`。

### `playback_state`（单行表）

`id` INTEGER PK `CHECK (id = 1)`、`track_id` → `tracks(id) ON DELETE SET NULL`、`position_seconds`、`is_playing` INTEGER（0/1）、`updated_at`。

### `schema_migrations`（内部）

`id` INTEGER PK、`applied_at`；每个迁移在事务内执行并记录。

## 迁移规则

- 迁移定义在 `migrations/index.ts` 的 `migrations` 数组，**只追加、不修改历史项**。
- 新列用 `addOptionalColumn`（先查 `PRAGMA table_info` 再 `ALTER TABLE ADD COLUMN`），保持幂等。
- 新表直接写进新的 `id` 迁移块；破坏性变更需要新的迁移 id，不允许改写旧迁移。

## Repository API（`MusicRepository`）

| 方法 | 语义 |
|---|---|
| `listTracks()` | 全量，`created_at DESC` |
| `upsertTrack(track)` | `INSERT ... ON CONFLICT(id) DO UPDATE`（不含 `created_at` 的更新） |
| `listListeningHistory()` | `started_at DESC` |
| `addListeningHistory(record)` | 追加 |
| `updateListeningHistory(record)` | 按 `id` 更新，缺失行为由调用方保证 |
| `listListeningMemories()` | `created_at DESC` |
| `addListeningMemory(record)` | 追加 |
| `getWorldSetting(key)` | 单条或 `null` |
| `setWorldSetting(record)` | `ON CONFLICT(key) DO UPDATE` |
| `getPlaybackState()` | 单行或 `null` |
| `savePlaybackState(state)` | 固定写入 `id=1` 的 upsert |
| `close()` | `will-quit` 时调用 |

字段映射约定（`music-repository.ts`）：

- 列名 `snake_case` ↔ 记录字段 `camelCase`；`is_playing` 0/1 ↔ `boolean`。
- `world_context`：读写时 JSON 序列化/解析；**解析失败回退 `null`**。
- `provider_id`：不在白名单（`mock/netease/qq/local-file`）时归一化为 `'local-file'`。
- 所有操作经 `databaseOperation` 包装，失败抛 `DatabaseError('The local music database operation failed.')`（`code: 'DATABASE_ERROR'`），IPC 侧以 reject 形式到达 Renderer。

## 体积与内存预算

- `artwork_url` 存 base64 data URL，直写 SQLite：同目录封面候选限 ≤ 8MB（`electron/audio/cover.ts` 的 `MAX_COVER_BYTES`）；**内嵌封面未设上限**，新增大封面来源时必须评估库体积与长期播放内存。
- `getAudioFileData` 单次回读上限 256MB（`electron/audio/file-data.ts`），且字节数组经 IPC 结构化克隆整体传输；不要在帧循环或高频路径重复调用。
- 封面优先级：内嵌（ID3/FLAC）→ 同目录 `cover.*` → `folder.*` → 同名图片（大小写不敏感，仅 `.jpg/.jpeg/.png/.webp`）。

## 已知偏差

- `TrackWorldContext.scene` 仍固定为 `'midnight'`（`src/shared/ipc/music.ts`），是空间收敛（home/library/memory）之前的历史类型，待收敛。
- 外键列（`track_id`）没有显式索引；当前数据量下可接受，做历史聚合查询前先评估。
- `listening_memories` 相关 IPC 暂无 Renderer 调用方（预留）。

## 变更流程（改数据层时）

1. `electron/database/migrations/index.ts` 追加迁移（新 id）。
2. `music-repository.ts` 同步读写与字段映射；`src/shared/ipc/music.ts` 同步记录类型。
3. 本文件同步表结构/API；涉及新 IPC 的再同步 `docs/ipc-contracts.md`。
4. 验证：`npm run build:electron` + `npm run smoke:electron`；持久化改动需人工回归「载入 → 播放 → 暂停 → 关闭 → 重启恢复」。
