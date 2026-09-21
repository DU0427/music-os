# Repository Guidelines

本文件是 `music-os` 的仓库级协作规则，适用于整个仓库。若将来新增更深层的 `AGENTS.md`，子目录规则可以补充本文件，但不能违背这里的边界与安全要求。开工前先读本文件、`README.md`、`docs/`、最近提交和当前 `git status`。

## Project Structure & Module Organization

- 活动运行时固定为 `Electron + Vite + React 19 + React Three Fiber + Zustand + Web Audio + better-sqlite3 (SQLite)`，TypeScript 全栈，`strict: true`。
- 三层边界固定：`electron/`（Main 主进程）→ `electron/preload.ts`（contextBridge，唯一跨进程 API 面）→ `src/renderer/`（DOM / 3D / 音频）；`src/shared/` 存放三层共享契约。
- `src/renderer` 是唯一活动前端（也是 Vite root）。`src/app`、`src/components`、`src/hooks`、`src/lib`、`src/server` 是旧版 Next.js / DOM 原型，仅作历史参考：不新增功能、不参与构建、不作为评审依据。

```text
music-os/
├── electron/                  主进程（Main）
│   ├── main.ts                入口：窗口生命周期，isPackaged 决定 loadURL / loadFile
│   ├── preload.ts             暴露 window.musicOS，Renderer 唯一可用 API 面
│   ├── windows/               窗口管理
│   ├── ipc/                   channels.ts / handlers.ts，typed IPC 处理器
│   ├── database/              connection.ts、migrations/、repositories/music-repository.ts
│   ├── providers/             registry.ts + index.ts；mock/ 与 netease/{http,auth,content,map,index}.ts
│   └── audio/                 cover.ts（封面提取）、file-data.ts（本地文件读取）
├── src/
│   ├── renderer/              活动前端
│   │   ├── App.tsx main.tsx   应用 Shell + 三空间 DOM 编排（home / library / memory）
│   │   ├── worlds/            WorldManager（单 Canvas 氛围）+ WaveHome / LibraryGalaxyWorld / MemoryFieldWorld / HomeSpace / SpaceBackdrop / CoverParticleField
│   │   ├── audio/             AudioEngine.ts、store.ts、runtime.ts、listening-session.ts
│   │   ├── store/             Zustand：runtime / library / mood
│   │   ├── ui/                AudioDock、TopBar、NowPlayingCard、PlaylistPanel、StageChips、SearchOrbital、DetailOrbital、BootSplash
│   │   ├── camera/            CameraRig 空间转场
│   │   ├── core/              MusicCore 等视觉组件
│   │   ├── hooks/             渲染层 hooks（useStageScale、useDominantColor 等）
│   │   └── styles/            globals.css 与 design tokens
│   ├── shared/                ipc/（channels、music）、music/providers.ts、types/world.ts
│   └── app|components|hooks|lib|server   旧版原型，仅参考
├── docs/                      架构、设计语言、Provider、验证与进度文档
├── scripts/electron-smoke.cjs Electron smoke contract 脚本
├── out/renderer/              Renderer 构建产物（已被 git 跟踪）
└── dist/                      Main / Preload 构建产物（已被 git 跟踪）
```

- Renderer 不得直接访问 Node.js、SQLite、Provider API、密钥或平台私有接口；跨进程能力一律走 typed IPC + preload（`src/shared/ipc` ↔ `electron/ipc` ↔ `window.musicOS`）。
- `better-sqlite3` 需要匹配 Electron ABI 的原生绑定；缺失时应用会静默回退内存模式（数据不落盘）。用 `npm run rebuild:sqlite` 修复，不要忽略主进程的 `Failed to initialize SQLite repository` 日志。
- 高频 FFT / 音频指标只在 Renderer 内部消费，不走 IPC、不写入 SQLite。

## Product Overview

- 定位：桌面空间化音乐体验——不是传统播放器，也不是管理后台。当前核心链路是「内容入口 → 一首歌（点击即播）→ 播放接管 → 氛围空间」；两态接管（未播放安静黑场 / 播放这首歌接管舞台），情绪是全局滤镜，不占空间槽位。
- 空间：`SpaceType = 'home' | 'library' | 'memory'`（`src/shared/types/world.ts`）。单 Canvas 常驻：`WorldManager` 提供背景、音频光照与封面粒子场氛围，`App.tsx` 负责三个空间的编排与切换。
- 音频链路：本地文件 / Provider 流 → `HTMLAudioElement` → `AudioContext` → `AnalyserNode` → 平滑指标（bass / mid / treble / energy / beatPulse）→ 粒子弹跳、环境光与界面强调色。
- 数据链路：Renderer → preload → IPC → `MusicRepository` → SQLite（`app.getPath('userData')/music-os.sqlite`，启用 WAL 与 foreign_keys）。
- Provider 边界：适配器只存在于 `electron/providers`。`mock` 提供确定性 `data:audio/wav` 链路用于联调；`netease` 已实现搜索 / 详情 / 播放地址、扫码登录与内容入口（推荐歌单、排行榜），请求走 Electron `net.request` + 持久化分区 Cookie（`persist:music-os-netease`），凭据不落明文、不经 Renderer。无能力必须显式返回 `AUTH_REQUIRED` / `UNAVAILABLE` / `NOT_IMPLEMENTED`，不得伪造播放能力。
- 视觉语言：纯黑舞台、封面作为唯一光源、单一动态 accent、克制玻璃材质、三档字阶、播放态跟随节拍接管。
- 不复制 Mineradio 的代码、素材、图片或独特视觉资产；只借鉴公开理念和交互手法。

## Design Constraints

- Home 是黑场舞台，不恢复旧的轨道环、抽象行星、蓝色 nebula 或密集 Dashboard。
- 关键入口必须承载真实内容；不重新引入六卡网格、推荐 rail、歌词舞台或 Spotify 式后台布局。
- 有封面时：粒子颜色来自封面；无封面时：使用干净散点星尘，不使用暗色密网格噪点。
- 粒子动效必须主要由 `beatPulse`、`bass`、`mid`、`treble` 等音频指标驱动；禁止用缓慢固定正弦动画冒充音乐律动。
- 情绪是全局滤镜，不重新恢复为独立空间；播放态视觉舞台不应依赖用户手动进入另一个世界。
- 动效应服务于节拍、方向感和状态变化；避免持续旋转、过度 bloom、抖屏和抢夺封面焦点。
- 视觉改动以 `docs/design-language-v2.md` 为唯一权威；扩展新空间、歌词、推荐、云同步等未列入当前重点的功能前，先确认再动手。

## Build, Test, and Development Commands

| 目标 | 命令 |
|---|---|
| 安装依赖 | `npm install` |
| 仅 Renderer 开发服务器 | `npm run dev`（vite，root `src/renderer`，127.0.0.1:5173） |
| 启动 Electron（先构建再运行） | `npm run dev:electron` / `npm run start` |
| 构建 Renderer | `npm run build:renderer` → `out/renderer` |
| 构建 Main / Preload | `npm run build:electron`（`tsc -p tsconfig.electron.json` → `dist`） |
| 构建全部 | `npm run build` |
| Electron smoke contract | PowerShell：`$env:ELECTRON_RUN_AS_NODE=$null; npm run smoke:electron` |
| 重建 SQLite 原生绑定 | `npm run rebuild:sqlite` |
| Lint | `npm run lint`（eslint 9 flat config） |

- 项目没有独立单测框架：运行时验证以 `scripts/electron-smoke.cjs` 的硬性契约（见 `docs/smoke-contract.md`）加人工回归为准。
- 构建产物已被 git 跟踪：源码改动后如产物需要入库，用独立的 `build:` 提交同步，不要混进源码提交。

## Coding Style & Naming Conventions

- 2 空格缩进、LF、UTF-8、单引号、语句末尾分号。
- 命名：组件文件 `PascalCase.tsx`；模块 / hook 用 `camelCase`；类型与接口 `PascalCase`；IPC channel 常量沿用 `src/shared/ipc/channels.ts`。
- 路径别名 `@/*` → `src/*`（`tsconfig.json`）；Renderer 由 Vite 打包，Main / Preload 由 `tsconfig.electron.json`（ES2022 + commonjs）编译，只纳入 `electron/**/*.ts` 与 `src/shared/ipc/**/*.ts`。
- 严格类型：项目开启 `strict`。禁止 `as any`、`@ts-ignore`、`@ts-expect-error`、空 catch 或无依据的 fallback。
- 边界输入（文件路径、IPC payload、Provider 返回值）必须在边界验证；内部已由类型保证的路径不要添加重复防御代码。
- 音频帧循环避免每帧创建数组、对象、纹理或正则；粒子位置和颜色 buffer 应复用。
- 封面 data URL 可能较大：新增存储或缓存策略时必须评估 SQLite 体积和长期播放内存占用。
- 不引入与当前需求无关的重构、功能或视觉装饰。

## Testing Guidelines

- 按影响范围执行验证门：前端改动至少 `npm run build:renderer`；Electron / preload / IPC 改动必须 `npm run build:electron`；播放、转场、IPC、数据持久化改动必须运行 `npm run smoke:electron`。
- Smoke 契约以 `docs/smoke-contract.md` 为权威：脚本打印 JSON，全部硬条件为 `true`（含 `transitionResult`、`playbackStressResult`）才算通过；修改契约必须同步文档。
- 可见 UI 改动需要实际启动 Electron，检查空态、播放态、窄窗口和错误态；不能只依赖编译通过。
- 播放 / 持久化改动需要人工回归：载入 → 播放 → 暂停 → 切换 → 返回 → 关闭 → 重启恢复。
- 报告失败时区分本次改动引入的问题和既有问题，不得删除或弱化 smoke / test 来让它通过。
- 依赖 LSP 时，如果项目没有配置对应服务器，使用项目实际 build / typecheck 验证，不得用类型忽略注释掩盖错误。
- `docs/goal-progress.md`、`docs/product-slice-progress.md`、`docs/smoke-contract.md` 中仍有 2026-07/08 的旧空间名（`midnight`）与旧阶段文案，属于历史记录；当前空间定义以 `src/shared/types/world.ts` 为准。

## Commit & Pull Request Guidelines

所有提交必须使用 Conventional Commits 风格，正文用要点说明改动与验证：

```text
<type>(<scope>): <中文简短描述>

- 具体改动 1
- 具体改动 2
- 验证：实际执行过的命令及结果
```

允许的 type：

- `feat`：新增用户可见能力。
- `fix`：修复错误或回归。
- `refactor`：不改变外部行为的结构调整。
- `perf`：性能优化。
- `docs`：文档或规则变更。
- `test`：测试或 smoke contract 变更。
- `build`：构建、依赖或打包变更。
- `chore`：不属于以上类别的维护。
- `style`：不改变逻辑的格式或视觉样式调整。

- 摘要使用动词并推荐带 scope，例如 `feat(audio): 提取本地音频内嵌封面`；禁止 `update`、`change`、`修改一下`、`WIP` 等模糊标题。
- 标题下面必须写具体改动，不能只写一句空泛总结；有验证就必须写明命令及结果（如 `build:renderer`、`build:electron`、`smoke:electron`）。
- 一个提交只表达一个可独立回滚的逻辑单元；跨目录且无强依赖的改动拆成多个提交。
- 完成一个可交付单元（源码提交 + 对应的 `build:` 产物提交）后**直接 `git push origin main`**，无需每次询问（用户 2026-09-17 授权）；推送前先 `git status` 确认工作区与本次改动范围。
- 仍然禁止：`amend`、`rebase`、`force-push`、推送到其它远端或分支（用户当时明确要求除外）。

### 脏工作区与构建产物

- 永远不要覆盖、还原或删除用户已有的未提交改动。
- `out/`、`dist/`、`*.tsbuildinfo` 已被 git 跟踪，变更后用独立 `build: 同步…产物` 提交同步；绝不与源码改动混在同一提交。
- `.omo/run-continuation/`、`.omo/boulder.json`、`.omo/drafts/` 与历史临时计划默认不提交，除非用户明确要求沉淀。
- `README.md` 的历史乱码或连续性附录改动必须单独审查，不要和功能提交混在一起。
- 提交前必须先看 `git status` 和 `git diff`，只暂存本次明确完成的文件。

### Pull Request

PR 应包含行为变更摘要、影响范围（frontend / electron / provider / docs）、执行过的验证命令与结果、关联 issue 或规格文档；涉及 UI 的变更附截图或录屏。

## Security & Agent-Specific Notes

- 不提交真实凭据、私有地址或本地生成产物；`.env*` 已被忽略（仅保留 `.env.example`）。网易云登录态只存在于 Electron 持久化分区，不得进入 Renderer、日志或仓库。
- **禁止长时间卡死**：命令、脚本、构建、子代理若长时间无响应，不要继续干等，也不要反复重试同一条命令。
  - 默认等待上限：单条命令 2 分钟、构建 / smoke 5 分钟、子代理 10 分钟。
  - 超时后立即取消，记录「卡在哪一步 + 已试过什么」，然后直接推进下一步可交付动作（换方案、降范围、或先提交已完成部分并说明）。
  - 一次任务里同类超时连续出现两次，就停止该路线，改为向用户报告现状并给替代方案。
- 合规红线：netease 适配器使用网易云 Web 接口（非官方开放 API），仅用于个人学习与本地客户端体验；不绕过付费、会员、音质限制，不重新分发音乐内容；发版或公开分发前必须重新评估平台协议（ToS）与版权风险（详见 `docs/provider-netease.md`）。
- 不得为了 smoke 或演示伪造真实平台播放能力。
- 会话连续性：需要回忆历史决策时优先查 OpenCode 会话与 `.omo/plans/`，不要凭记忆重造设计；计划文档和实现必须保持一致，方向改变先更新计划或记录决策再编码。
- 仓库存在 `.codegraph/` 时，理解或定位代码优先执行 `codegraph explore "<question>"`，再使用 rg / find / 直接读文件；`.codegraph/` 是索引产物，不提交。
- 文档地图：`docs/architecture.md`（边界与阶段）、`docs/design-language-v2.md`（视觉唯一权威）、`docs/product-spec.md`（产品规格）、`docs/implementation-roadmap.md`、`docs/phase-0-plan.md`、`docs/smoke-contract.md`（验证契约）、`docs/ipc-contracts.md`（IPC 契约与失败语义）、`docs/data-model.md`（SQLite 表结构与预算）、`docs/provider-contracts.md` 与 `docs/provider-netease.md`（Provider 边界与接入现状）、`docs/goal-progress.md` / `docs/product-slice-progress.md`（历史连续性日志，只读参考）。

## Current Focus & Next Steps

2026-09-16 当前状态：

- 空间固定为 `home / library / memory`；音乐地球实验已移除（`de39204`），相关 IPC 通道、provider 与依赖（three-globe 等）一并清理。
- 首页最终形态 = WaveHome：
  1. 时间问候语 + 副标题（有记录时显示「上次听到「X」」）；
  2. NowPlayingCard（唱盘 + 封面 + 播放键）；
  3. **推荐歌单**：4 张内容卡（眉标 / 两行标题 / 「N 首 · X 播放」+ 右下旋转封面）；
  4. **排行榜**：12 张等尺寸榜单卡（封面左上角名次徽章 + 标题 + 曲目数）；
  5. **最近播放**：单行 6 列紧凑列表（56px 封面 + 标题 + 艺术家）。
- 纵向节奏由 `useStageScale` 按视口高度整体缩放，1320×900 一屏放下无滚动条，矮窗口等比压缩并在滚到底时避开左下入口。
- 动效：入场分级编排（0/80/160/240/330ms + 按列 stagger）；播放态由 rAF 每帧写一次 `--mo-beat`，封面光晕与名次徽章呼吸；3D 只作用于封面层，文字层保持 2D（避免光栅化发虚）。
- netease 适配器、扫码登录、内容入口（推荐歌单 / 排行榜）已实现并实网验证；`playTrack` 统一播放入口。

1. **人工回归**：连续验证本地文件与 Provider 播放的载入、播放、暂停、切换、返回、关闭、重启恢复，至少 30 分钟。
2. **内容链路**：歌单详情 → 曲目列表 → 点击播放（复用 `playTrack` 的 provider 分支）；每日推荐与搜索 UI 切换到 netease。
3. **视觉调参**：使用真实有节拍的曲目，调粒子 / 封面弹跳幅度、密度、点径和透明度；目标是动感但不抖屏、不形成粗糙噪点。
4. **性能验证**：检查长时间播放下的 GPU/CPU、内存、帧稳定性；优先保持单 Canvas 和当前粒子数量预算。
