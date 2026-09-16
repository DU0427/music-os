# IPC Contracts —— Renderer ↔ Main 边界契约

> 权威定义在代码：`src/shared/ipc/channels.ts`（channel 常量 + `MusicOsApi`）与 `src/shared/ipc/music.ts`（数据记录类型）。
> 本文件是语义索引：每个 channel 的入参、返回、失败行为与当前调用方。**改 channel 必须同步本文件**；涉及 smoke 硬条件的还要同步 `docs/smoke-contract.md`。

## 边界结构

```text
src/renderer（无 Node 权限）
   ↓ window.musicOS（唯一 API 面）
electron/preload.ts（contextBridge.exposeInMainWorld）
   ↓ ipcRenderer.invoke / on
electron/ipc/handlers.ts（ipcMain.handle，参数在边界断言）
   ↓
MusicRepository（SQLite） / ProviderRegistry / netease 模块 / audio 读取
```

- Renderer 只能通过 `window.musicOS` 调用；类型来自 `MusicOsApi`（全局 `Window` 已声明）。
- 所有调用为 Promise（`ipcRenderer.invoke`）；唯一事件订阅是 `onPrepareToClose`（Main → Renderer）。
- 高频音频指标（FFT 等）不走 IPC，见 `README.md` 音频链路。

## Channel 总表

### App 生命周期

| Channel | 方法 | 入参 | 返回 | 失败语义 |
|---|---|---|---|---|
| `app:ready` | `ready()` | — | `{ appName: 'Music OS Desktop', startedAt }` | — |
| `app:ping` | `ping(message)` | string（preload 注入 `timestamp`） | `{ message: 'ack:' + message, timestamp }` | — |
| `app:error` | `reportError({ code, detail? })` | `ErrorPayload` | `{ acknowledged: true }` | 永不 reject；缺字段回退 `unknown_error`，仅 console.error |
| `app:prepare-close` | `onPrepareToClose(handler)` | handler 为渲染层回调 | 返回取消订阅函数 | Main 在 `before-quit` 发送事件，等待 `app:prepare-close-ack`，**700ms 超时兜底**；ack 由 preload 在 handler 完成后自动发送 |

### 本地持久化（经 `MusicRepository`）

| Channel | 方法 | 入参 | 返回 | 失败语义 |
|---|---|---|---|---|
| `music:tracks:list` | `listTracks()` | — | `TrackRecord[]`（`created_at DESC`） | reject：`DatabaseError` |
| `music:tracks:upsert` | `upsertTrack(track)` | `TrackRecord` | 入参原样 | reject：`'Invalid track payload.'` / `DatabaseError` |
| `music:history:list` | `listListeningHistory()` | — | `ListeningHistoryRecord[]`（`started_at DESC`） | reject：`DatabaseError` |
| `music:history:add` | `addListeningHistory(record)` | `ListeningHistoryRecord` | 入参原样 | reject：`'Invalid listening history payload.'` / `DatabaseError` |
| `music:history:update` | `updateListeningHistory(record)` | 同上（完整校验含 `startedAt`/`durationSeconds`） | 入参原样 | reject：`'Invalid listening history update payload.'` |
| `music:memories:list` | `listListeningMemories()` | — | `ListeningMemoryRecord[]` | reject：`DatabaseError`。**当前 Renderer 无调用方** |
| `music:memories:add` | `addListeningMemory(record)` | `ListeningMemoryRecord` | 入参原样 | reject：`'Invalid listening memory payload.'`。**无调用方** |
| `music:world-settings:get` | `getWorldSetting(key)` | string | `UserWorldSettingRecord \| null` | reject：`'Invalid world setting key.'` |
| `music:world-settings:set` | `setWorldSetting(record)` | `UserWorldSettingRecord`（upsert） | 入参原样 | reject：`'Invalid world setting payload.'` |
| `music:playback:get` | `getPlaybackState()` | — | `PlaybackStateRecord \| null`（单行 `id=1`） | reject：`DatabaseError` |
| `music:playback:save` | `savePlaybackState(state)` | `PlaybackStateRecord` | 入参原样 | reject：`'Invalid playback state payload.'` |

### Provider（mock / netease / qq）

| Channel | 方法 | 入参 | 返回 | 失败语义 |
|---|---|---|---|---|
| `music:provider:search` | `searchMusic(query, providerId?)` | `{ query, providerId? }`；**缺省或非法 providerId → 回退 `'mock'`**；`limit` 固定 20、`cursor: null` | `ProviderSearchResult` | 参数错误 reject；Provider 错误走 `result.error`（`ProviderErrorPayload`），**不 reject** |
| `music:provider:track` | `getProviderTrack(reference)` | `ProviderTrackReference` | `ProviderTrackResult` | 同上（非法引用 reject：`'Invalid provider reference payload.'`） |
| `music:provider:playable-source` | `getProviderPlayableSource(reference)` | `ProviderTrackReference` | `ProviderPlayableSourceResult` | 同上 |

- Registry 对未注册 provider（如 `qq`）与不支持的能力返回 `NOT_IMPLEMENTED` payload；网络失败返回 `UNAVAILABLE` + `retryable: true`。错误码集合：`AUTH_REQUIRED / RATE_LIMITED / NOT_IMPLEMENTED / UNAVAILABLE / INVALID_RESPONSE`。
- 播放地址语义以 `docs/provider-netease.md` 为准：未登录无地址 → `AUTH_REQUIRED`；已登录无地址 → `UNAVAILABLE`。

### 本地音频读取

| Channel | 方法 | 入参 | 返回 | 失败语义 |
|---|---|---|---|---|
| `audio:cover` | `getAudioCover(filePath)` | string | 封面 `data URL` 或 `null` | 无效路径 → `null`；实现内部全 catch，**实际不 reject** |
| `audio:file-data` | `getAudioFileData(filePath)` | string | `Uint8Array`（≤ 256MB）或 `null` | 文件不存在/非文件/超限 → `null`，不 reject |

### 网易云（登录 + 内容入口）

| Channel | 方法 | 入参 | 返回 | 失败语义 |
|---|---|---|---|---|
| `music:netease:qr-create` | `createNeteaseQrLogin()` | — | `{ key, qrDataUrl } \| null` | 失败 → `null`，不 reject |
| `music:netease:qr-poll` | `pollNeteaseQrLogin(key)` | string | `{ status: 'waiting' \| 'scanned' \| 'confirmed' \| 'expired' \| 'error', account }` | 无效 key / 异常 → `{ status: 'error', account: null }` |
| `music:netease:auth-status` | `getNeteaseAuthStatus()` | — | `{ loggedIn, account }` | ⚠ **无 catch**：`fetchAccount` 网络异常会 reject，调用方需 try/catch |
| `music:netease:logout` | `logoutNetease()` | — | `true` | ⚠ 无 catch：可能 reject |
| `music:netease:home` | `getNeteaseHomeContent()` | — | `ProviderHomeContent`（推荐歌单 + 排行榜） | ⚠ 无 catch：可能 reject |
| `music:netease:playlist-tracks` | `getNeteasePlaylistTracks(playlistId)` | string | `ProviderTrack[]` | 无效 / 异常 → `[]`，不 reject |

## 当前调用方地图（Renderer）

| 方法 | 调用位置 |
|---|---|
| `ready` / `reportError` / `onPrepareToClose` | `src/renderer/App.tsx` |
| `listTracks` / `getPlaybackState` / `upsertTrack` / `savePlaybackState` / `addListeningHistory` / `updateListeningHistory` / `getAudioCover` / `getAudioFileData` / `getProviderTrack` / `getProviderPlayableSource` | `src/renderer/audio/store.ts` |
| `listTracks` / `listListeningHistory` | `src/renderer/store/library.ts` |
| `getWorldSetting` / `setWorldSetting` | `src/renderer/store/mood.ts` |
| `searchMusic` | `src/renderer/ui/AudioDock.tsx`（显式 `'mock'`）、`src/renderer/ui/SearchOrbital.tsx`（`'mock' as any`） |
| `getNeteaseHomeContent` | `src/renderer/worlds/WaveHome.tsx` |
| `getNeteasePlaylistTracks` | `src/renderer/ui/PlaylistPanel.tsx`（含 `typeof` 保护） |
| `listListeningMemories` / `addListeningMemory` / 网易云登录四件套（`createNeteaseQrLogin` / `pollNeteaseQrLogin` / `getNeteaseAuthStatus` / `logoutNetease`） | **暂无调用方**（契约已就绪，UI 未接入） |

## 已知偏差（新增改动时不要复制这些模式）

- `electron/preload.ts` 内联了一份 channel 字面量 fallback（当 `dist`/`src` 的 channels 模块 require 失败时使用）。**新增或改名 channel 时必须同时更新 `channels.ts` 与 preload 的 fallback 字面量**。
- `src/renderer/ui/SearchOrbital.tsx` 使用 `'mock' as any`，违反 `strict` 与仓库类型规则，应改为显式 `MusicProviderId`。
- `netease` 查询类通道大多把异常吞成 `null`/`[]`/`status:'error'`，而 `auth-status` / `home` / `logout` 不吞异常——行为不一致，接入 UI 时按上表逐条处理。
- `searchMusic` 对未知 providerId 静默回退 `'mock'`，接入真实搜索 UI 时必须显式传 `'netease'`。

## 变更流程（改契约时）

1. `src/shared/ipc/channels.ts`：改 channel 常量 / `MusicOsApi` / payload 类型。
2. `electron/preload.ts`：同步 fallback 字面量与方法实现。
3. `electron/ipc/handlers.ts`：同步 handler 与边界断言。
4. 本文件：同步总表与调用方地图。
5. 若属于 smoke 硬条件（见 `docs/smoke-contract.md`），同步 smoke 契约文档与 `scripts/electron-smoke.cjs` 的预期字段。
6. 验证：`npm run build:electron` + `npm run smoke:electron`。
