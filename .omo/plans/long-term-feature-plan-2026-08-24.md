# music os 长线功能计划 — 基于设计文档的全量实现路径

**版本**: 2026-08-24  
**基准文档**: `docs/product-spec.md` / `docs/architecture.md` / `docs/implementation-roadmap.md` / `docs/phase-0-plan.md` / `docs/product-slice-progress.md` / `docs/goal-progress.md` / `docs/smoke-contract.md`  
**现状**: MVP 垂直切片已跑通 `Electron + Vite + R3F + Zustand + Web Audio + SQLite + mock provider`，`Home → MusicCore → Midnight City → Home` 闭环 + 持久化 + smoke 全绿，但**空有骨架**。用户体感「功能少」是准确的——原型里的 5 个空间、全局搜索、详情沉浸、真实曲库浏览，在 Renderer 均未落地。

> 本计划不推翻已有的视觉重塑（`music os` / `HomeOrbital` / `CoreVisualDom`），而是在其之上**长线补齐功能**，始终遵守产品规格的铁律：**空间优先、物体即交互、克制高级、非 Dashboard**。

---

## 1. 缺口审计（Docs vs Code vs Prototype）

| 能力 | 设计文档要求 | 原型实现 (`src/components/*`) | 当前 Renderer 现状 | 缺口评级 |
|---|---|---|---|---|
| **Home 空间** | 活的个人宇宙，通向 collection/mood/memory/visual | `HomeSpace` 四星+三环+核心悬浮控制 | `HomeOrbital` 四星（仅 2 可用）+ `HomeSpace R3F` 已置空 | 🟡 中 — 视觉有了，2 星空转 |
| **Music Core 心跳** | 随 `bass/mid/treble/energy/beat` 呼吸 | `CoreVisual` 流体锥形+逆旋+星芒 | `CoreVisualDom` 已复刻，但未接真实 `metrics` 细粒度 | 🟢 低 |
| **Midnight City** | 五层结构：Atmosphere/Environment/EnergyField/SongCore/SpatialUI | `CitySilhouette+MemoryField+返回门户` | 已实现，`WorldManager` 氛围/雾光/城市剪影齐全 | 🟢 低 |
| **Library Galaxy 图书馆** | 按风格浏览收藏与音景 | 五类星球 `电子/氛围/怀旧/爵士/电影` | **未实现** — 点击无响应 | 🔴 高 |
| **Mood Space 情绪空间** | 选择情绪让世界变色 | 四情绪 `Night/Energy/Calm/Nostalgia` + 选中态全景染 | **未实现** — 无情绪态持久化与世界联动 | 🔴 高 |
| **Memory Field 记忆场** | 时间轴上的收听记忆 | `2019.06.13 / 2021夏 / Now` 曲线+卡片 | **未实现** — `listening_history` 已入库但无 UI | 🔴 高 |
| **Visualizer World 可视化** | 声音→天体景观 | 渐变穹顶+地平网格 | **未实现** — 已有 `Midnight` 占用唯一 Song World 槽位 | 🟡 中 |
| **全局搜索** | 空间化搜索，非列表 | `SearchOverlay` 毛玻璃+标签 | 仅在 `AudioDock developer` 内搜 mock | 🔴 高 |
| **歌曲详情沉浸** | 放大球体+竖向信息栈+主/副操作 | `DetailOverlay` 布局 | **未实现** — 点击核心仅进城，无详情 | 🟡 中 |
| **真实曲库** | `local-file-first` 持久化浏览 | `MOCK_SONGS` 假数据 | `SQLite tracks` 已持久化但无浏览面 | 🔴 高 |
| **Provider 接入** | 隔离在 `electron/providers`，Renderer 只调契约 | 仅 `server/music` 占位 | `mock` 可播，其余 `NOT_IMPLEMENTED` | 🟡 中（需授权） |
| **持久化与恢复** | `track/history/playbackState` + `prepareToClose` | 无 | 已实现且 smoke 覆盖 | 🟢 低 |
| **相机与转场** | GSAP 封口+帧插值，单 Canvas 不拆 | 有，但偏生硬 | 已有 `CameraRig`，需润色 | 🟢 低 |

**结论**：视觉层已从「丑」变「美」，但功能层停在「单路径可用」——用户看到 4 颗星只有 2 颗亮、搜歌藏在开发者面板、听过多少遍看不见，自然觉得「少了很多」。

---

## 2. 总体原则

1. **空间隐喻不变**：不做传统列表/表格/分页，用星球、轨道、时间曲线、氛围染来承载功能。
2. **单 Canvas 持久**：所有新世界复用 `WorldManager` 的单一 R3F Canvas，`currentSpace` 驱动 `CameraRig` 与 `group key` 切换，严禁新路由或多 Canvas。
3. **数据边界不变**：新增 UI 只读 `window.musicOS` 契约，不直连 SQLite / Node / Provider 密钥。
4. **可验证**：每阶段扩展 `scripts/electron-smoke.cjs` 与 `#audio-session-debug` 哨兵，保证 `homeState / transition / audioInput / providerContracts` 不回归。
5. **渐进可回滚**：每阶段独立 commit，失败可单独 revert。

---

## 3. 长线分期（6 期，约 12–16 周）

### Phase 0 — 视觉基座（已完成 ✅）
> 目标：让「丑」先消失，建立代币与空间秩序。
- `tokens.css / globals.css / TopBar / HomeOrbital / CoreVisualDom / HomeSpace 置空`
- 验收：`build:renderer + build:electron` 绿，顶栏/核心/轨道符合 `calm/premium/object-first`

---

### Phase 1 — 曲库与记忆的「可见化」（1.5 周）`最高优`
**解决「我听了什么、收藏了什么看不见」**
- **任务**
  - `electron/database` 已有 `tracks / listening_history`，在 Renderer 新增 `store/library.ts`（Zustand 只存 `TrackRecord[]` 与 `ListeningHistoryRecord[]`，通过 `listTracks/listListeningHistory` 拉取）。
  - 新建 `src/renderer/worlds/LibraryGalaxyWorld.tsx`（R3F + DOM 混合）：复刻原型 `LibraryGalaxy` 五类星球，但点击后在轨道中心以 **玻璃卡片流** 展示该类下的真实曲目（按 `worldContext.moodTags` 或本地文件名分组），而非假数据。
  - 新建 `src/renderer/worlds/MemoryFieldWorld.tsx`：复刻原型 `MemoryField` 的曲线时间轴，数据来自 `listening_history`，三点变为 N 点（首听→常听→此刻），点击可 `restoreTrack`。
  - `HomeOrbital` 四星点击：`visualizer/mood → midnight`，`library → LibraryGalaxy`，`memory → MemoryField`（打通闭环，不再「coming soon」）。
  - `TopBar` 右侧 `AudioLines` 点击展开 mini 历史浮层（3 条最近）。
- **契约**
  - 新增 `store/library` 不直接连 DB，仅调 `window.musicOS.listTracks`。
  - 保持 `HomeSpace R3F` 空壳，避免 DOM/R3F 核心重叠。
- **验收**
  - `smoke` 新增 `libraryState === true / memoryState === true` 哨兵。
  - 手动：导入 3 首本地曲 → 在 Library 至少 1 类可见 → 在 Memory 时间轴至少 1 点可回放。

### Phase 2 — 情绪空间 Mood Space（1.5 周）
**解决「世界不会随心情变」**
- **任务**
  - 新建 `src/renderer/worlds/MoodSpaceWorld.tsx`：四情绪星球 `Night/Energy/Calm/Nostalgia`（与原型一致），选中态写入 `activeMood` 到 `store/runtime` + `worldSettings` 持久化（`getWorldSetting/setWorldSetting`）。
  - `MoodSpace` 选中后：全景 `radial-gradient` 染（复刻原型 4 色）、`WorldManager AudioAtmosphere` 的 `bassInfluence` 系数偏移、`SpaceBackdrop` 粒子速度联动。
  - `HomeOrbital` 的 `mood` 星不再直跳 `midnight`，而是先进 `MoodSpace` 选情绪。
  - `TopBar` 中心副标题显示 `activeMood`（如 `home · calm`）。
- **验收**
  - 选中 `Calm` 后重进 `Midnight`，雾色与粒子速度可感知不同；`Mood` 持久化重启后仍在。

### Phase 3 — 搜索与详情的空间化（2 周）
**解决「搜歌藏太深、点核心无详情」**
- **任务**
  - 新建 `src/renderer/ui/SearchOrbital.tsx`：复刻 `SearchOverlay` 的毛玻璃全屏 + 居中输入 + 标签云，但数据源为 `window.musicOS.searchMusic`（mock）+ 本地 `tracks` 模糊搜索；结果以 **轨道星粒** 悬浮呈现，点击即 `loadProviderTrack` 或 `restoreTrack`。
  - 新建 `src/renderer/ui/DetailOrbital.tsx`：复刻 `DetailOverlay` 的放大球体（`CoreVisualDom layoutId`）+ 竖向信息栈（专辑/首播/能量BPM/氛围/常听段/播放次数），主按钮「播放/暂停」、副按钮「进入可视化」。
  - 触发：单击核心 → `DetailOrbital`（如原型），双击/「进入」→ `midnight`；`TopBar Search` 图标全局可唤起搜索。
  - 保持 `AudioDock experience` 极简，搜索不再藏于 `developer`。
- **验收**
  - `smoke` 覆盖 `searchOrbitalVisible` 与 `detailOrbitalVisible`。
  - 手动：从 Home 搜 `midnight` → 轨道结果出现 → 点击可播 → 详情可见。

### Phase 4 — 可视化世界 Visualizer（2 周）
**解决「声音没有可探索的天体」**
- **任务**
  - 新建 `src/renderer/worlds/VisualizerWorld.tsx`：基于原型 `VisualizerWorld` 的穹顶渐变+地平线+透视网格，但叠加 **实时音频驱动**：`bass` 缩放穹顶、`treble` 闪烁网格、`beatPulse` 脉冲地平线。
  - 复用 `CoreVisualDom` 的 `track.coverGradient`（或 `worldContext.energyTarget` 映射）作为穹顶配色。
  - 入口：从 `DetailOrbital`「打开可视化世界」或 `HomeOrbital visualizer` 直达；返回 `Home` 保持相机平滑。
- **验收**
  - 播放时穹顶与网格随音乐呼吸，`Visualizer` 仅在 `currentSpace==='visualizer'` 渲染，`midnight` 不受影响。

### Phase 5 — 音频与桌面体验收敛（1.5 周）
**解决「播放体验毛刺」**
- **任务**
  - `AudioDock` 空态与错误态细化：`local-file` 恢复失败提示「请重新选择本地文件」已做，需补充 `provider` 恢复失败的自动重试轻提示。
  - 补齐 `TopBar` 的 `User` 与 `AudioLines` 占位：前者展示 `listening_history` 统计浮层（总时长/常听段），后者做设备/输出占位而非死链。
  - 转场润色：`CameraRig` 增加 `isTransitioning` 期间的轻微 `dolly` 与 `fog` 过渡，已有的 `AudioLighting/AudioAtmosphere` 阻尼系数微调至更柔。
  - **长时稳定性**：在 CI 侧增加 30s 轻量 `playbackStress` 的阈值收紧（`heap +64MB` 内、帧稳定性）。
- **验收**
  - 手动：`startup → 选文件 → 播 → 进城 → 回城 → 切歌 → 关 → 重开 → 恢复` 全链无状态残留；重复 6 次转场 `smoke` 仍绿。

### Phase 6 — 曲库深度与 Provider 预备（2 周，可并行）
**为真实接入铺路，不阻塞视觉**
- **任务**
  - `electron/providers` 保持隔离，完成 `netease/qq` 的契约占位与错误映射文档化（`NOT_IMPLEMENTED` → 用户可见文案）。
  - 若暂无授权：增强本地能力——文件拖拽导入、批量导入、封面读取（`artworkUrl`）、按 `moodTags` 自动分类。
  - 打包与安装：验证 `better-sqlite3` 在 Electron ABI 下的重建、资源路径与纯净 `out/` 构建。
- **验收**
  - `providerSearchContracts` 在 mock 下为 `true`，真实源下返回可解释的受限文案而非崩溃。

---

## 4. 交付物与文件清单

| 阶段 | 新文件 | 修改文件 |
|---|---|---|
| P1 | `store/library.ts`, `worlds/LibraryGalaxyWorld.tsx`, `worlds/MemoryFieldWorld.tsx` | `HomeOrbital.tsx`, `TopBar.tsx`, `WorldManager.tsx` |
| P2 | `worlds/MoodSpaceWorld.tsx` | `store/runtime.ts`, `WorldManager.tsx`, `SpaceBackdrop.tsx` |
| P3 | `ui/SearchOrbital.tsx`, `ui/DetailOrbital.tsx` | `App.tsx`, `AudioDock.tsx` |
| P4 | `worlds/VisualizerWorld.tsx` | `CameraRig.tsx`, `WorldManager.tsx` |
| P5 | — | `AudioDock.tsx`, `CameraRig.tsx`, `App.tsx`, `scripts/electron-smoke.cjs` |
| P6 | `docs/provider-contracts.md` | `electron/providers/*`, `vite.*` |

---

## 5. 风险与对策

- **空间膨胀 → 迷路**：每新增世界必加「空间面包屑」—— `TopBar` 中心标题 + 左上 `← 返回`（如原型），转场期间锁 `isTransitioning`。
- **DOM 与 R3F 抢焦点**：新世界统一为「DOM 轨道+ R3F 环境」混合，核心球体仅在 DOM 侧用 `CoreVisualDom`，R3F 侧仅环境，避免双核重影。
- **数据泄露**：新 `store/library` 严禁直引 `electron/database`，仅 `window.musicOS`；增加 `grep` 门禁。
- **性能**：每世界 `100` 粒子以内、`CanvasTexture` 复用、`AudioMetricsSampler` 单点采样不增实体。
- **Provider 授权**：真实 API 未通前，宁可展示「受限」也不伪造播放链。

---

## 6. 时间线（建议）

```
W1-1.5  P1 曲库与记忆可见
W2-3    P2 情绪空间
W4-5    P3 搜索与详情
W6-7    P4 可视化世界
W8-9    P5 音频与稳定性收敛 + 30min 人工验收
W10-11  P6 深度与打包预备
```

每阶段结束打 tag 并追加 `docs/goal-progress.md` 时间戳验收（按 `product-slice-progress.md` 模板）。

---

## 7. 验收总闸

全部阶段完成后，需一次 **单会话手工全链验收** 替代零散 smoke：
- `启动 → 选 3 首本地 → Library 可见 → Mood 选 Calm → 搜 1 首 mock → 点核心进详情 → 进 Visualizer → 进 Midnight → Memory 回看 → 关 → 重开 → 恢复 → 重复 3 次转场`
- 指标：`build:renderer + build:electron + smoke:electron` 绿，`TopBar/HomeOrbital/Search/Detail/Library/Memory/Visualizer` 均可达，`heap +64MB` 内，产品态仍 `calm/premium/object-first`。

---

> 下一步：按此计划顺序执行，先 P1。如需 Momus 评审，请以本文件路径为 prompt 调用。
