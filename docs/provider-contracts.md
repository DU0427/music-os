# Provider Contracts & Packaging — Phase 6

## 边界
- Renderer 不直连平台 API：`window.musicOS.searchMusic / getProviderTrack / getProviderPlayableSource` 仅调 Main 契约。
- Main 隔离：`electron/providers/registry.ts` 选型 + 错误映射，`mock` 返回确定性 `data:audio/wav`，其余返回 `NOT_IMPLEMENTED` 并落用户可见文案（非崩溃）。
- `src/shared/music/providers.ts` 定义 `ProviderTrackReference / SearchResult / PlayableSourceResult / Capability`。

## 当前能力
- `mock`：search/track/playable 全通，用于链路与可视化联调。
- `netease / qq`：占位，未授权前一律 `NOT_IMPLEMENTED`。

## 打包
- `better-sqlite3` 为 native，需 `npm rebuild --runtime=electron --target=<electron-version>`，路径 `app.getPath('userData')/music-os.sqlite`，已在 `electron/database` 启用 WAL/foreign_keys。
- `out/renderer` 与 `dist/electron` 分离，`electron/main.ts` 按 `isPackaged` 区分 `loadURL` / `loadFile`。

## 本地增强（已实现）
- 拖拽导入：`App` 全屏 `onDrop` 捕获首个 `audio/*`，直调 `loadFile`。
- 曲库/历史：`store/library` 拉取 `listTracks/listListeningHistory`，`LibraryGalaxy/MemoryField` 可见。
- 封面：`artworkUrl` 预留，后续可接 `jsmediatags` 读取本地内嵌封面。

## 下一步（需授权）
- 接入首个真实 Provider 需确认：官方授权方式、桌面端限流、播放 URL 时效、地域/版权、登录态存储。
- 认证后：`registry` 注册新 adapter，`AudioDock SearchOrbital` 已就绪，无需改 Renderer。
