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
- v2 三空间：Home 黑场舞台、曲库封面场、记忆轨迹。
- CameraRig 空间转场与单 Canvas 编排。
- 本地音频文件选择、播放、暂停和进度控制。
- 本地音频内嵌封面提取（music-metadata → `artworkUrl`）。
- Web Audio API 音频分析。
- Bass、Mid、Treble、Energy、BeatPulse 音频指标。
- 封面粒子场：有封面时为封面光点画，无封面时为散点星尘；由 beat/bass 驱动律动弹跳。
- 动态强调色：封面主色贯穿播放控制面；玻璃控制条含播放、进度与实时频谱。
- 本地音频源重启自动恢复：持久化文件路径，启动时回读并恢复到上次播放位置。
- SQLite migration、repository 和本地数据 IPC。
- Track Identity、Track World Context 和播放状态恢复基础。
- Provider registry 与可播放 mock provider（返回确定性 `data:audio/wav` 播放流，供 provider 合同与播放链路联调）。
- Electron smoke contract。

当前未完成：

- 网易云音乐真实 API 接入。
- QQ 音乐真实 API 接入。
- 平台登录和授权。
- 云同步。
- 完整音乐库、歌单、歌词和推荐系统。
- 多个完整 Song World。

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
  ├── WorldManager（单 Canvas）
  │   ├── SpaceBackdrop
  │   └── CoverParticleField（封面粒子场）
  ├── CameraRig（home / library / memory）
  └── DOM 空间：Home 舞台、封面场、记忆轨迹
```

### 音频链路

```text
本地音频文件
  -> HTMLAudioElement
  -> AudioContext
  -> AnalyserNode
  -> 平滑音频指标
  -> 封面粒子场、环境光与界面强调色
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

当前 mock provider 提供可播放的确定性 `data:audio/wav` 测试流，可用于验证 Provider 合同和可播放链路；真实平台（网易云/QQ）仍未接通授权。

真实平台接入需要同时确认：

- 官方授权方式。
- 桌面端使用限制。
- 播放地址和有效期。
- 版权和地区限制。
- 登录态和凭据存储方案。

## 当前开发重点

下一阶段优先级（按执行顺序，详见根目录 `AGENTS.md`）：

1. 人工回归：连续验证本地文件载入、播放、暂停、切换、返回、关闭、重启恢复，至少 30 分钟。
2. 本地封面兜底：无内嵌封面时按 `cover.*`、`folder.*`、同名图片优先级读取同目录图片。
3. 视觉调参：用真实节拍曲目调粒子弹跳幅度、密度、点径与透明度。
4. 性能验证：长时间播放下的 GPU/CPU、内存与帧稳定性。
5. 本地体验稳定后，再做合法的网易云/QQ 授权与 Provider 接入。

暂时不扩展新的空间、歌词、推荐、云同步和完整音乐库功能。

## 文档

- [设计语言 v2](docs/design-language-v2.md)
- [产品规格](docs/product-spec.md)
- [架构说明](docs/architecture.md)
- [实施路线](docs/implementation-roadmap.md)
- [阶段计划](docs/phase-0-plan.md)
- [产品切片进度](docs/product-slice-progress.md)
- [Electron Smoke Contract](docs/smoke-contract.md)
- [Goal 进度记录](docs/goal-progress.md)

## 设计方向

当前设计语言以 [docs/design-language-v2.md](docs/design-language-v2.md) 为唯一权威：

- 纯黑舞台，封面是唯一光源，内容自己发光。
- 排版建立层级：显示级 / 内容级 / 辅助级三档。
- 单一动态强调色随封面主色流动，克制使用。
- 两态接管：未播放安静黑场，播放时封面粒子场与环境随节拍律动。
- 空间是氛围与状态，不是需要反复进入的菜单；避免赛博朋克、游戏 HUD 和密集 Dashboard。
