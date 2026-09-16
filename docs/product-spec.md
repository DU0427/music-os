# Music OS 产品规格

> 更新：2026-09-16。视觉细节以 `docs/design-language-v2.md` 为唯一权威；协作规则以根目录 `AGENTS.md` 为准。

## 定位

桌面空间化音乐体验：把一首歌转化为可以进入、探索和感知的体验。

```text
歌曲 → 情绪 → 环境 → 空间体验
```

不是传统播放器，也不是音乐管理后台；不做 dashboard、不做 Spotify 式后台布局。

## 平台策略

**平台流媒体优先**（当前先接网易云，后续可扩展其他平台）；本地音频文件仅作辅助能力（联调、自有用）。

- 适配器只存在于 `electron/providers`，Renderer 不直接访问平台 API、密钥或私有接口。
- 无能力必须显式返回 `AUTH_REQUIRED` / `UNAVAILABLE` / `NOT_IMPLEMENTED`，不得伪造播放能力。
- 接入现状与合规声明见 `docs/provider-netease.md`。

## 空间

`SpaceType = 'home' | 'library' | 'memory'`（`src/shared/types/world.ts`）。

- **home（黑场舞台）**：时间问候语 → NowPlayingCard（唱盘 + 封面）→ 推荐歌单内容卡（4）→ 排行榜榜单卡（12）→ 最近播放紧凑列表（6）。单屏纵向编排，不显示滚动条。
- **library（封面场）**：真实封面网格，点击滑出详情/曲目面板。
- **memory（轨迹）**：暖金细光时间线，节点为听歌记录。
- 三个空间共享一个常驻 R3F Canvas；情绪是全局滤镜，不占空间槽位。

## 核心链路

### 播放

```text
本地文件 / Provider 流 → HTMLAudioElement → AudioContext → AnalyserNode
  → 平滑指标（bass / mid / treble / energy / beatPulse）
  → 粒子弹跳、环境光、界面强调色、封面光晕与名次徽章呼吸
```

- 统一入口 `playTrack(track)`：已是当前曲目 → 直接播放；provider 曲目 → 解析播放源；本地曲目 → 回读持久化路径；都不行 → 退化为元数据恢复并提示重新载入。
- 高频 FFT / 指标只在 Renderer 内消费，不走 IPC、不写 SQLite。

### 数据

```text
Renderer → preload（window.musicOS）→ typed IPC → MusicRepository → SQLite
```

- 位置：`app.getPath('userData')/music-os.sqlite`（WAL + foreign_keys）。
- 表结构与预算见 `docs/data-model.md`；IPC 契约见 `docs/ipc-contracts.md`。

## 首页规格（当前形态）

| 区块 | 内容 | 交互 |
|---|---|---|
| 问候语 | 时间问候 + 「上次听到「X」」/「今天想听点什么？」 | — |
| NowPlayingCard | 唱盘 + 封面 + 曲名/歌手 + 状态 | 点击播放/暂停；空态选择本地文件 |
| 推荐歌单 | 4 张内容卡（眉标 / 标题 / N 首 · X 播放 / 右下封面） | 打开歌单曲目面板 |
| 排行榜 | 12 张等尺寸榜单卡（名次徽章 + 标题 + 曲目数） | 打开榜单曲目面板 |
| 最近播放 | 6 列紧凑列表（封面 + 曲名 + 艺术家） | 直接 `playTrack`；少于 3 首不显示 |

- 一屏纪律：`useStageScale` 按视口高度整体缩放（`s ∈ [0.55, 1]`），1320×900 无滚动条；矮窗口压缩并在滚到底时避开左下入口。
- 动效：入场分级编排；播放态 `--mo-beat` 驱动光晕与徽章；3D 只作用于封面层（文字保持 2D）。

## 边界与安全

- Renderer 不得访问 Node.js、SQLite、Provider API、密钥或平台私有接口；跨进程能力一律走 typed IPC + preload。
- 平台登录态只存在于 Electron 持久化分区（`persist:music-os-netease`），不进 Renderer、日志与仓库。

## 暂不做

云同步、歌词、社交、完整曲库管理、多平台同时接入、未获授权的私有平台接口。
