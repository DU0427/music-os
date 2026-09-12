# redesign-home-layout-2026-08-29 - Work Plan

## TL;DR (For humans)

**What you'll get**: Home Space（首页）从"纯氛围导航"升级为"活的私人音乐宇宙"——借鉴 Mineradio 首页的"内容感"与"未播放/播放两态切换"理念，翻译进我们 spec 允许的 object-first 语言：四颗行星下方显示真实数据（曲目数/聆听次数/当前情绪），核心下方 pill 升级为"继续听/当前曲目"入口（可播放、可暂停、可载入文件），播放时首页环境按歌曲世界色微染。

> ⚠️ **2026-08-31 方向调整（用户新需求）**：用户提供本地 Mineradio 项目（`D:\test\Mineradio\Mineradio.exe`，解包源码在 `D:\test\Mineradio\resources\app\public\index.html`），要求参考其 UI 设计但**不做成一模一样，要结合**。已完成对该项目首页/控制条设计语言的逆向分析（见 `## Mineradio 设计参考（2026-08-31 新增）`）。todos 1-5 已实现并提交（`43504f4`），F1/F3 已通过；F2 暂停，现按结合方案新增 Wave 2 实现。

## Mineradio 设计参考（2026-08-31 新增，来自本地源码逆向）

### 可借鉴的核心元素（翻译进我们的 object-first 语言）
1. **动态强调色**：Mineradio 用 `--home-accent` + `color-mix()` 让整个首页随曲目状态变化。→ 我们已有 `track.worldContext.energyTarget` 染色，可升级为全局 `--mo-accent` 动态值。
2. **玻璃质感**：`blur(xx) saturate(1.12)` + 渐变背景 + 多层内阴影 + `inset 0 1px 0 rgba(255,255,255,.06)` 内高光。→ 升级行星 label/pill/AudioDock 材质。
3. **唱片艺术角**：卡片右下角封面块，未加载时 `conic-gradient` 唱片视觉。→ 行星/AudioDock 加封面块 + 唱片兜底（数据源 `TrackRecord.artworkUrl`）。
4. **文字层次**：label(10px 强调色) → title(19px/780) → sub(11.5px)。→ 行星 label 采用层次化。
5. **进度条发光 thumb**：4px → hover 变粗 + 发光 thumb。→ 升级 AudioDock 进度条。

### 明确不采用（违反 spec / 用户明确要"不一样"）
- 六卡网格（`home-grid`）、推荐 rail（`home-rail`）、歌词舞台、3D 歌单架、双栏布局（会破坏 object-first + 变 dashboard）。

### 约束
- 保留现有中央核心 + 行星导航结构（object-first 根）。
- 只改视觉材质/色彩/层次，不改交互逻辑、不改数据结构。
- 不复制 Mineradio 的代码/素材/图片（GPL + 视觉版权）。

## Wave 2 — Mineradio 材质结合（2026-08-31 新增）

- [x] 6. `src/renderer/styles/tokens.css` + `src/renderer/ui/HomeOrbital.tsx`：动态强调色——home 空间随 `track.worldContext.energyTarget` 更新 `--mo-accent`（calm→#78AFFF/electric→#EA8E83/默认→#1A2980），行星 label + 核心 pill 强调色联动。
- [x] 7. `src/renderer/ui/HomeOrbital.tsx`：行星 label 材质升级——Mineradio 式玻璃（saturate + 内高光 + 细网格线装饰），text 层次 label→title→hint。
- [x] 8. `src/renderer/ui/AudioDock.tsx`：播放胶囊升级——玻璃质感（saturate(1.8) + 多层内阴影）、封面块（52px，无封面时 conic-gradient 唱片）、进度条发光 thumb（hover 变粗）。
- [x] 9. `src/renderer/ui/HomeOrbital.tsx`：核心 pill 视觉升级 + 全量复查 + 构建验证 + 提交。

## Final verification wave (Wave 2 追加)
- [x] F4. 构建合规审计（Wave 2 改动文件）+ 无 dashboard/推荐流 + 无 Mineradio 素材复制。
- [x] F5. 人工桌面验收（结合后视觉效果）— 自动化部分完成：应用正常启动（6 electron 进程，renderer 已加载）、无渲染错误、构建产物含全部新 UI 元素（conic-gradient/mo-home-accent/次聆听/首曲目/已恢复会话/载入歌曲以进入）。最终视觉美感待用户肉眼确认。

**Why this approach**: 我们的 design spec 明确定义 Home 是 "a living personal music universe centered on Music Core"，且禁止 dashboard/卡片网格/Spotify clone。Mineradio 首页最强的一点是"有内容感 + 两态切换"（未播放=干净银河，播放=视觉态）。直接照搬它的六张卡片入口会违反 spec；把它的"神"翻译成"行星数据呼吸 + 核心曲目入口 + 环境染色"则完全在 spec 之内。

**What it will NOT do**: 不引入推荐流、每日推荐、歌词舞台、3D 歌单架、卡片网格；不复制 Mineradio 的任何代码/素材/图片（GPL-3.0 + 视觉版权归作者）；不改动 Home 轨道结构（中央核心 + 行星导航保留）；不改 TopBar/AudioDock/DetailOrbital/SearchOrbital；不新增 IPC 或数据库字段。

**Effort**: 约 1 个源文件主要改动（`src/renderer/ui/HomeOrbital.tsx`）+ 构建验证。1 波实现 + 1 波验证。

**Risk**: 低。数据全部来自已存在的 store（`useLibraryStore.tracks/history`、`useMoodStore.activeMood`、`useAudioStore.track/canPlay/isPlaying`），无新契约。主要风险是 planet label 区域拥挤与 pill 交互回归——已设 QA 覆盖。

**Decisions**: 见 `## Execution strategy`。

---

## Scope

### In scope
- `src/renderer/ui/HomeOrbital.tsx`：
  1. `Planet` 组件新增可选 `hint` 属性，在行星 label 下方渲染一行真实数据子标签。
  2. 四行星 hint 内容：library→`{tracks.length} 首曲目`；memory→`{history.length} 次聆听`；mood→`当前 · {MOOD_LABEL[activeMood]}`（无情绪不显示）；visualizer→`进入`。
  3. 核心下方 pill 升级为"当前曲目/继续听"：
     - 有 track 且可播放：`▶ {track.title} — {track.artist}`，点击播放/暂停；播放中显示 `‖ {track.title}`。
     - 有 track 不可播放（已恢复会话）：`已恢复会话 · 请重新载入`，点击打开文件选择器。
     - 无 track：`载入歌曲以进入`，点击打开文件选择器（复用 AudioDock 的 `<input type="file" accept="audio/*">` 模式）。
  4. 播放时环境染色：HomeOrbital 根容器内加 `radial-gradient` 氛围层（`mix-blend-screen`），颜色按 `track.worldContext.energyTarget`（calm→`#78AFFF`/electric→`#EA8E83`/默认→`#1A2980`），`opacity 0.10-0.16`，仅在 `track && canPlay` 时显示。
- 构建验证：`npm run build:renderer` 通过。

### Out of scope / Must NOT-Have
- 不引入卡片网格、推荐流、歌词舞台、3D 歌单架（spec 禁止 dashboard）。
- 不复制 Mineradio 代码/素材/图片（GPL-3.0）。
- 不动 `TopBar.tsx`、`AudioDock.tsx`、`DetailOrbital.tsx`、`SearchOrbital.tsx`、`worlds/*`、`electron/*`、`src/shared/*`。
- 不新增/修改 IPC 通道、SQLite 表、store 文件。
- 不处理脏工作区遗留：`README.md`、`scripts/electron-smoke.cjs`、`dist/`、`tsconfig.tsbuildinfo`、`.omo/run-continuation/`（保持未提交状态，不得纳入本计划提交）。
- MOOD_LABEL 映射在 HomeOrbital 内本地定义（与 TopBar/MoodSpaceWorld 现有的本地副本惯例一致），不提取共享模块。

---

## Verification strategy

- 每 todo 的 Acceptance + QA 见各 todo。
- 最终波：`npm run build:renderer`（约 5s）+ 人工桌面验收（`npm run dev:electron`）。
- 无测试文件（项目当前无 renderer 单测设施；QA 以构建 + 人工交互为准）。

---

## Execution strategy

1 波实现（5 todos）+ 1 波最终验证（F1-F3）。

**决策记录**：
- hint 放在 `Planet` 的 label 容器内（`absolute top-[122%]`），在现有 title/subtitle 之下追加一行 `text-[10px] text-white/40 tracking-wide`，避免与 hover subtitle 冲突；hover 时 hint 保持可见。
- pill 升级复用现有 pill 的视觉（`bg-white/[0.06] border-white/10 backdrop-blur-md`），仅改文案与 onClick 逻辑；隐藏 `<input type="file">` 用 `useRef` 持有，点击 pill 触发 `inputRef.current?.click()`。
- 环境染色层放在 HomeOrbital 根 div 的 `inset-0` 层（`pointer-events-none`），渲染在行星之下、避免遮挡交互；颜色映射与 `VisualizerWorld.tsx` 的 `c1` 逻辑一致。
- `useLibraryStore.refresh()` 已由 TopBar 调用，HomeOrbital 只订阅 `tracks/history` 状态，不重复触发 refresh。

---

## Todos

### Wave 1 — 实现

- [x] 1. `src/renderer/ui/HomeOrbital.tsx`：Planet 组件新增可选 `hint` 属性并在 label 下方渲染。
  - References: `src/renderer/ui/HomeOrbital.tsx`（Planet 函数签名 + label 容器 `absolute top-[122%]` 块，当前 138-149 行）
  - Acceptance: Planet props 增加 `hint?: string`；label 容器内 title/subtitle 之后追加一行 hint（`text-[10px] text-white/40 tracking-wide`，无 hint 时不渲染）；现有 four planet 调用（225-228 行）不传 hint 也能编译（可选属性）。
  - QA happy: 传入 `hint="3 首曲目"` 时 label 下方出现该行，`hover` 时 hint 不消失。
  - QA failure: 不传 hint 时无多余 DOM 节点、无报错。
  - Commit: 不单独提交（与 todo 5 合并为一个 commit）。

- [x] 2. `src/renderer/ui/HomeOrbital.tsx`：订阅 `useLibraryStore`/`useMoodStore`/`useAudioStore` 数据并在四行星上组装 hint。
  - References: `src/renderer/store/library.ts`（`tracks`/`history`）、`src/renderer/store/mood.ts`（`activeMood`）、`src/renderer/ui/TopBar.tsx`（`MOOD_LABEL` 本地副本模式）、`src/renderer/ui/HomeOrbital.tsx` 顶部 `useAudioStore` 现有订阅
  - Acceptance: 组件内新增 `const tracks = useLibraryStore(s => s.tracks)`、`const history = useLibraryStore(s => s.history)`、`const activeMood = useMoodStore(s => s.activeMood)`、`const track = useAudioStore(s => s.track)`、`const canPlay = useAudioStore(s => s.canPlay)`；四行星调用改为：library→`hint={tracks.length ? `${tracks.length} 首曲目` : '暂无曲目'}`、memory→`hint={history.length ? `${history.length} 次聆听` : '暂无记录'}`、mood→`hint={activeMood ? `当前 · ${MOOD_LABEL[activeMood] ?? activeMood}` : undefined}`、visualizer→`hint="进入"`。
  - QA happy: 载入 ≥1 曲目后 library 行星显示 `N 首曲目`；有 history 后 memory 显示 `N 次聆听`；选择 mood 后 mood 行星显示 `当前 · 夜晚`（activeMood='Night'）。
  - QA failure: 空库时显示 `暂无曲目`/`暂无记录`；activeMood 为 null 时 mood 行星无 hint 行；未知 mood id 时回退显示原始 id。
  - Commit: 与 todo 5 合并。

- [x] 3. `src/renderer/ui/HomeOrbital.tsx`：核心下方 pill 升级为"当前曲目/继续听"，含隐藏 file input 与点击逻辑。
  - References: `src/renderer/ui/HomeOrbital.tsx`（`handleEnter`/`handleCoreClick`，179-186 行；pill JSX 200-210 行）、`src/renderer/ui/AudioDock.tsx`（file input + `loadFile` 调用模式，`<input ref={inputRef} type="file" accept="audio/*" hidden ...>`）、`src/renderer/audio/store.ts`（`loadFile`/`play`/`pause`）
  - Acceptance: pill 文案三态：`track && canPlay` →（isPlaying ? `‖ {track.title}` : `▶ {track.title} — {track.artist}`）；`track && !canPlay` → `已恢复会话 · 请重新载入`；无 track → `载入歌曲以进入`。onClick：`track && canPlay` 时 `isPlaying ? pause() : void play()`；否则 `inputRef.current?.click()`。隐藏 `<input type="file" accept="audio/*" hidden onChange=...>`，onChange 调 `useAudioStore.getState().loadFile(file)`（file 空则忽略并重置 `e.target.value=''`）。
  - QA happy: 载入本地曲目且可播放 → pill 显示 `▶ 曲名 — 歌手`，点击后变 `‖ 曲名` 并开始播放；再点暂停。
  - QA failure: 无 track 时点击 pill 弹出文件选择器；选文件后曲目加载成功、pill 变 `▶ 曲名`；`track && !canPlay`（如仅元数据）时点击打开文件选择器，标题为 `已恢复会话 · 请重新载入`；文件选择取消（files 为空）不报错。
  - Commit: 与 todo 5 合并。

- [x] 4. `src/renderer/ui/HomeOrbital.tsx`：播放时首页环境染色。
  - References: `src/renderer/ui/HomeOrbital.tsx`（根容器 `absolute inset-0 ... overflow-hidden z-10`，196 行）、`src/renderer/worlds/VisualizerWorld.tsx`（`c1` 映射：calm→`#78AFFF`/electric→`#EA8E83`/默认→`#1A2980`，41 行）、`src/renderer/worlds/MoodSpaceWorld.tsx`（radial-gradient + mix-blend-screen 染法，41-55 行）
  - Acceptance: 根容器内、行星层之下新增 `<div aria-hidden className="absolute inset-0 pointer-events-none mix-blend-screen" style={{ background: 'radial-gradient(...)', opacity }} />`；仅 `track && canPlay` 时渲染（用 `{track && canPlay && (...)}` 条件）；颜色按 `track.worldContext?.energyTarget` 映射，`opacity 0.10`（未播放）`0.16`（isPlaying）——用内联 style 而非动画库。
  - QA happy: 载入可播放曲目后首页出现淡色氛围；播放中更深；切不同 energyTarget 曲目颜色变化。
  - QA failure: 无 track 或无 canPlay 时无染色层；染色层 `pointer-events-none` 不阻挡行星点击。
  - Commit: 与 todo 5 合并。

- [x] 5. `src/renderer/ui/HomeOrbital.tsx`：全文件复查 + 构建验证 + 提交。
  - References: 以上 todos 1-4 的改动文件
  - Acceptance: `npm run build:renderer` 通过（约 5s）；`git diff src/renderer/ui/HomeOrbital.tsx` 仅含 hint/pill/染色改动；无未使用 import（如 `useAudioStore` 现有导入全部仍被使用；新导入 `useLibraryStore`/`useMoodStore` 均被使用）。
  - QA happy: 构建无 error；HomeOrbital 三态功能按 todos 1-4 验收。
  - QA failure: 构建报错则修复至通过。
  - Commit: `feat: 首页行星内容化与继续听入口`（仅 `src/renderer/ui/HomeOrbital.tsx` 一个文件；不包含 README/smoke/dist 等脏工作区文件）。

---

## Final verification wave

- [x] F1. 构建合规审计：`npm run build:renderer` 与 `npm run build:electron` 均通过；`git status` 确认提交仅含 `src/renderer/ui/HomeOrbital.tsx`；README/smoke/dist/tsbuildinfo/.omo 保持未提交。
  - QA: 运行两命令无 error；`git show --stat HEAD` 单文件。
- [ ] F2. 人工桌面验收：`npm run dev:electron` 启动，逐项核对——(a) 空态：无 track，四行星 hint（暂无曲目/暂无记录/无 mood/进入），pill `载入歌曲以进入`；(b) 点击 pill 打开文件选择器载入 mp3；(c) pill 变 `▶ 曲名 — 歌手`，点击播放变 `‖ 曲名`，背景染色出现；(d) 播放中切到 library/memory/mood 空间再返回，hint 数据正确；(e) 320px 窄窗无溢出。
  - QA: 每项打勾并截图留存（worker 验收记录）。
- [x] F3. 范围保真审计：确认无 dashboard/卡片网格/推荐流出现；无 Mineradio 素材；未触碰 out-of-scope 文件。

---

## Commit strategy

- 单个 commit：`feat: 首页行星内容化与继续听入口`
- 仅包含 `src/renderer/ui/HomeOrbital.tsx`。
- 严禁纳入：`README.md`、`scripts/electron-smoke.cjs`、`dist/**`、`out/**`、`tsconfig*.tsbuildinfo`、`.omo/run-continuation/**`（脏工作区遗留，保持未提交）。
- 提交后 `git push origin main`（用户惯例：功能完成后推送）。

---

## Success criteria

1. Home Space 保留中央核心 + 四行星导航（object-first 结构不变）。
2. 行星显示真实数据 hint（曲目数/聆听次数/当前情绪），首页有"内容感"。
3. 核心下方 pill 成为"继续听/当前曲目"三态入口，可播放/暂停/载入文件。
4. 播放时首页环境染色，形成"未播放宇宙 / 播放中世界"两态感。
5. `npm run build:renderer` + `npm run build:electron` 通过；仅一个文件提交并推送。
6. 无 dashboard/卡片网格/推荐流；无 Mineradio 复制素材；无越界文件改动。