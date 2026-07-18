# Music OS

Music OS 是一款面向桌面的空间化音乐体验应用。

它不是传统的音乐播放器，也不是音乐管理后台。项目希望将一首歌转换为一个可以进入、探索和感知的音乐世界：

```text
歌曲
  -> 情绪
  -> 环境
  -> 空间体验
```

当前项目处于 MVP 垂直切片阶段，已经具备 Electron 桌面运行时、React Three Fiber 空间场景、本地音频播放、Web Audio 音频分析和 SQLite 本地数据层。

## 当前状态

已完成：

- Electron + Vite + React 桌面应用运行时。
- Electron Main、Preload、Renderer 三层边界。
- 基于 typed IPC 的跨进程通信。
- 单一、持续存在的 React Three Fiber Canvas。
- Home Space 和 Midnight City World。
- Music Core、Spatial Portal 和 CameraRig。
- 本地音频文件选择、播放、暂停和进度控制。
- Web Audio API 音频分析。
- Bass、Mid、Treble、Energy、BeatPulse 音频指标。
- 音频驱动的 Music Core、灯光、城市和粒子效果。
- SQLite migration、repository 和本地数据 IPC。
- Track Identity、Track World Context 和播放状态恢复基础。
- Provider registry 和 metadata-only mock provider。
- Electron smoke contract。

当前未完成：

- 网易云音乐真实 API 接入。
- QQ 音乐真实 API 接入。
- 平台登录和授权。
- 云同步。
- 完整音乐库、歌单、歌词和推荐系统。
- 多个完整 Song World。
- 本地音频源的自动恢复。目前应用可以恢复歌曲元数据和播放位置，但用户需要重新选择本地文件才能继续播放。

## 运行项目

环境要求：

- Node.js 20+
- npm

安装依赖：

```bash
npm install
```

启动 Electron 开发运行时：

```bash
npm run dev:electron
```

构建 Renderer：

```bash
npm run build:renderer
```

构建 Electron Main 和 Preload：

```bash
npm run build:electron
```

构建完整应用：

```bash
npm run build
```

运行 Electron smoke contract：

PowerShell 环境下执行：

```powershell
$env:ELECTRON_RUN_AS_NODE=$null
npm run smoke:electron
```

运行代码检查：

```bash
npm run lint
```

## 项目结构

```text
music-os/
├── electron/
│   ├── main.ts                 Electron 主进程入口
│   ├── preload.ts              安全的 Renderer API 桥接
│   ├── windows/                Electron 窗口管理
│   ├── ipc/                    Main 进程 IPC handlers
│   ├── database/               SQLite 连接、迁移和 repository
│   └── providers/              音乐平台 Provider 和 mock adapter
├── src/
│   ├── renderer/
│   │   ├── App.tsx             Renderer 应用 Shell
│   │   ├── worlds/              Home、Midnight City 和空间运行时
│   │   ├── core/                Music Core 视觉组件
│   │   ├── camera/              摄像机和空间转场
│   │   ├── audio/               音频播放和 Web Audio 分析
│   │   ├── ui/                  空间 UI 和开发控制器
│   │   └── store/               Renderer Zustand 状态
│   ├── shared/
│   │   ├── ipc/                 Main、Preload、Renderer 共享契约
│   │   ├── music/               Provider 共享类型
│   │   └── types/               空间和领域类型
│   ├── app/                     旧版 Next.js 参考入口
│   ├── components/              旧版 DOM 原型组件
│   ├── hooks/                   旧版原型 hooks
│   ├── lib/                     旧版原型状态和 mock 数据
│   └── server/                  旧版 Next.js Provider 参考代码
├── docs/                        架构、产品规格和验证文档
├── scripts/                     Electron smoke 脚本
├── assets/                      预留的静态资源目录
├── out/                         Renderer 构建产物
└── dist/                        Electron 构建产物
```

`src/renderer` 是当前活动运行时。`src/app`、`src/components`、`src/hooks`、`src/lib` 和 `src/server` 中的旧代码只作为早期视觉原型和迁移参考，不参与当前 Electron 应用的主要渲染流程。

## 核心运行链路

```text
Electron Main
  ├── SQLite
  ├── Provider Registry
  └── Typed IPC
        ↓
Preload
        ↓
Renderer App
  ├── AudioEngine
  ├── Zustand Runtime Store
  ├── WorldManager
  │   ├── Home Space
  │   └── Midnight City World
  ├── Music Core
  ├── CameraRig
  └── Spatial UI
```

### 音频链路

```text
本地音频文件
  -> HTMLAudioElement
  -> AudioContext
  -> AnalyserNode
  -> 平滑音频指标
  -> Core、灯光、雾、城市和粒子
```

高频 FFT 数据只在 Renderer 内部使用，不通过 IPC 传输，也不直接写入 SQLite。

### 数据链路

```text
Renderer
  -> Preload API
  -> Electron IPC
  -> MusicRepository
  -> SQLite
```

Renderer 不直接访问 SQLite、Node.js API、音乐平台密钥或平台接口。

## 音乐 Provider 边界

音乐平台适配器位于 `electron/providers`，Renderer 不直接请求网易云音乐或 QQ 音乐接口。

Provider 需要将平台数据转换为统一的共享模型，包括：

- Provider track reference。
- 歌曲、艺术家和专辑信息。
- 搜索结果。
- 播放源能力。
- 授权状态。
- 限流、不可用和未实现错误。

当前只有 metadata-only mock provider。它可以用于验证 Provider contract，但不提供真实的可播放音频源。

真实平台接入需要同时确认：

- 官方授权方式。
- 桌面端使用限制。
- 播放地址和有效期。
- 版权和地区限制。
- 登录态和凭据存储方案。

## 当前开发重点

下一阶段优先修正播放会话和产品数据闭环：

1. 防止选择文件时错误创建播放历史。
2. 确保一次实际播放只创建一条 listening session。
3. 在暂停、切歌和播放结束时正确结束历史记录。
4. 在音频 metadata 加载后保存真实歌曲时长。
5. 统一 AudioEngine、Track Session、SQLite 和 Song World UI 使用的歌曲模型。
6. 将音频指标采样集中为每帧一次。
7. 继续打磨 Home Space 到 Midnight City World 的空间转场和视觉层次。
8. 在本地体验稳定后，再接入第一个音乐平台的搜索和歌曲详情。

暂时不扩展新的空间、歌词、推荐、云同步和完整音乐库功能。

## 文档

- [产品规格](docs/product-spec.md)
- [架构说明](docs/architecture.md)
- [实施路线](docs/implementation-roadmap.md)
- [阶段计划](docs/phase-0-plan.md)
- [产品切片进度](docs/product-slice-progress.md)
- [Electron Smoke Contract](docs/smoke-contract.md)
- [Goal 进度记录](docs/goal-progress.md)

## 设计方向

Music OS 的交互和视觉方向遵循以下原则：

- 空间优先，而不是页面优先。
- 音乐成为环境，而不是只显示播放状态。
- 使用物体、光线、粒子和摄像机进行交互。
- 保持平静、克制和高级的视觉语言。
- 避免赛博朋克、游戏 HUD 和密集 Dashboard。
- 技术应该隐藏在体验之后，让用户感到自己进入了一个音乐宇宙。
