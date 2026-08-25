# Music OS 视觉重塑计划 — 2026-08-22

> 目标：从“丑而乱的 Dashboard/HUD”回归产品规格要求的 **沉浸、平静、克制、高级、鲜活**。不是换主题色，是重建视觉秩序。

## 0. 诊断结论（已完成审计）

### 项目在做什么
- **定位**：不是播放器/后台，是“歌曲 → 情绪 → 环境 → 空间体验”的桌面空间化音乐应用。
- **运行时**：Electron(M/S) + Vite + React19 + R3F + Zustand + Web Audio + SQLite + ProviderRegistry。
- **当前可用**：单 Canvas 持久化 WorldManager、HomeSpace/MidnightCity、MusicCore、CameraRig、本地文件播放/分析驱动的视觉、SQLite 持久化。
- **核心链路**：`HTMLAudioElement → AudioContext → AnalyserNode → bass/mid/treble/energy/beatPulse → Core/灯光/雾/粒子`，FFT 不过 IPC。

### 视觉“丑”的根因（非审美分歧，是系统缺失）
1. **无 Design Tokens**：全是 inline style 硬编码，颜色 20+ 种蓝/橙/白乱窜，间距/圆角/字号无刻度，无法一致。
2. **未用 Tailwind**：`tailwindcss 4.1 + @tailwindcss/postcss` 已装但 0 实用类，所有样式手写内联。
3. **AppShell 顶栏**：`music-shell-top` 1.2 套卡片网格（3 列 grid），边框发亮、背景线性渐变厚重、信息密度像后台，不符合“物体优先”。
4. **AudioDock 体验态**：本应“迷你且隐形”的播放器做成了 `1040px` 宽的玻璃卡片 + 大圆角 + 强渐变 + 全宽 range，喧宾夺主。
5. **标签冗余**：`WorldLabel` (CanvasTexture sprite) + App.tsx 内 3 个 HTML 绝对定位 pill 重复标注同一物体，HUD 感极重。
6. **全局背景**：`App.tsx` 内 4 个绝对 div + 径向渐变 + blur 硬堆，与 `WorldManager` 的 `#050A14` + fog 双重背景打架，毛玻璃也未统一 `backdrop-filter`。
7. **排版与动效**：字重/字距随意（`letterSpacing: 0.16em` 滥用），仅一个 `softPulse`，无进入/退出/缓动体系。
8. **响应式塑性差**：仅 `@media 760px` 一处 hack，`AudioDock` 与顶栏在小窗会挤压。

> 约束：保持现有行为与 IPC 契约不变；只改视觉呈现；不新增空间/功能；不动 `electron/*`。

---

## 1. 设计原则（对齐 product-spec.md）

- **空间优先，不是页面优先**：UI 应“退后”，让 3D 世界成为主角。所有 2D UI 降低对比度、缩小体积、增加留白。
- **克制的高级感**：少即是多。统一为“深空蓝黑 + 冷白 + 极淡蓝光”，橙色仅作“门户”点缀且降饱和。
- **物体即交互**：用物体的光/尺度/材质表达可交互性，不用大按钮/大边框/大阴影招手。
- **隐形技术**：毛玻璃统一为 `12-16px blur + 1px hairline + 0.04-0.06 白色内阴影`，不再出现 `24px + 60px阴影 + 渐变`。

## 2. 执行计划（4 阶段，依赖有序，可并行度已标注）

### Phase A — 地基：Design Tokens + 全局样式（前置，无它不可并行）
- **文件**：
  - 新建 `src/renderer/styles/tokens.css`：CSS 变量定义（色彩、间距、圆角、字阶、阴影、毛玻璃、动效）。
  - 新建 `src/renderer/styles/globals.css`：`@import "tailwindcss";` + `@import "./tokens.css";` + 基础重置、字体、滚动条、selection、focus-ring。
  - 修改 `src/renderer/index.html` / `main.tsx`：引入 `globals.css`，移除 `body` 内联 style。
- **Tokens 预览**：
  ```css
  --mo-bg: #050A14; --mo-bg-soft: #0A1220;
  --mo-text: #EDF2FF; --mo-text-muted: #9AA7BF; --mo-text-faint: #6B7A94;
  --mo-line: rgba(164,190,231,0.10); --mo-line-strong: rgba(164,190,231,0.16);
  --mo-accent: #8DBBFF; --mo-accent-strong: #6EA8FF; --mo-portal: #E8C28A;
  --mo-radius-sm: 12px; --mo-radius-md: 16px; --mo-radius-lg: 20px; --mo-radius-pill: 999px;
  --mo-blur: 16px; --mo-shadow-soft: 0 8px 32px rgba(0,0,0,0.32);
  --mo-ease: cubic-bezier(0.22,1,0.36,1); --mo-duration: 420ms;
  ```
- **验证**：`npm run build:renderer` 通过；页面无视觉回归（仅 Tokens 生效）。

### Phase B — Shell 重构：顶栏 + 全局背景（依赖 A）
- **顶栏 `AppShell` (`src/renderer/App.tsx`)**：
  - 去掉 `<style>` 标签内联大块 CSS，改为 Tokens + Tailwind 类。
  - 重设计为“**极简状态条**”而非卡片：`top:16 / left:50% translateX / width max 640 / height 44 / pill + hairline + 14px blur`，左侧 Music/OS 字标 + 中间门户状态点 + 右侧 Now Playing 单行（超出省略）。
  - 移除 `music-shell-track` 三列网格，信息降维：标题 `13-14px/600`、副标题 `11px/ muted`。
  - 移动端：顶栏自动隐藏副标题，仅保留状态点 + 标题，避免 `@media` 破版。
- **全局背景**：
  - 移除 App.tsx 内 4 个绝对装饰 div，背景统一由 `WorldManager` 的 Canvas + 一个极淡的 CSS 径向光晕（`opacity 0.12`）构成，不再双重叠加。
  - `fontFamily` 统一为 `Inter / SF Pro / Noto Sans SC`，`letterSpacing` 仅在 eyebrow 处 `0.14em`，其余不加。
- **验证**：窗口缩放流畅；顶栏不遮挡 3D；`showDiagnostics` 分支不受影响。

### Phase C — AudioDock 体验态重塑（依赖 A，可与 B 并行）▲ 重点
- **文件**：`src/renderer/ui/AudioDock.tsx` 大改（行为不变，仅视觉）
- **体验态新形态**（`mode=experience`）：
  - **尺寸**：`bottom 20 / left 50% / translateX / width min(420px, calc(100vw - 32px)) / padding 10 12`，从 1040px 巨卡缩为 420px 迷你条。
  - **材质**：`background: rgba(10,18,32,0.58) / border: 1px solid var(--mo-line) / backdrop-blur 16 / shadow-soft`，去掉蓝紫渐变。
  - **布局**：`[播放键 36px] + [标题/艺术家 两行] + [时间 11px tabular-nums] / 下行 progress 2px`，按钮改为 `32-36px` 纯白/淡蓝实心，不再 `44px 渐变`。
  - **进度条**：`height 2px / track rgba(255,255,255,0.08) / thumb 8px`，隐藏原生粗条；`accentColor` 移除。
  - **次要操作**：“加载本地歌曲”改为 `ghost pill 11px`，置于进度条下右对齐，不再与播放键并列争视觉。
  - **状态文案**：`● 音频就绪` 改为 `10px uppercase / 0.08em / muted`，不占主视觉。
  - **剔除冗余**：`localLoadMessage` 用 `toast 淡入` 替代常驻色块；`error` 用细线提示条。
- **开发者态保留**：`mode=developer` 仍为 780px 面板，但同步 Tokens 化，去掉硬编码色。
- **验证**：拖动文件、播放/暂停、seek、provider 搜索均可用；体验态在 320px 宽度不溢出。

### Phase D — 空间标签去 HUD 化 + SongWorldOverlay 收敛（依赖 A，可与 B/C 并行）
- **HTML 覆盖标签**（App.tsx 底部 3 个 `position:absolute` pill）：
  - 全部移除。空间指引仅由 3D 内 `WorldLabel` sprite 承载，HTML 不再重复标注，避免“标签贴在屏幕上”的游戏 HUD 感。
- **`WorldLabel` (`src/renderer/worlds/WorldLabel.tsx`)**：
  - Canvas 尺寸 `640x160 → 512x128`（更精致），字体 `400 24px`，背景 `rgba(10,18,32,0.56)` + `1px hairline`，阴影降至 `0 4px 16px rgba(0,0,0,0.28)`，`pulse` 幅度 `0.024 → 0.012` 更克制。
- **`SongWorldOverlay` (`src/renderer/ui/SongWorldOverlay.tsx`)**：
  - 从 `top 28 right 28` 大标题改为 `top 76 right 20` 极简两行：`worldLabel 14px/500` + `artist — mood 11px/muted`，移除 `24px` 大字与多行时间，时间并入 AudioDock，不再重复。
  - 整体 `opacity 0.88 / blur 0`，不加卡片背景，保持“浮在空间中”而非“贴在 UI 上”。
- **验证**：Home/Midnight 切换时标签不闪烁；相机移动时 sprite 朝向正确。

### Phase E — 收尾：3D 氛围微调 + 构建/冒烟验证
- **3D 微调**（`WorldManager.tsx` / `HomeSpace.tsx` / `MidnightCityWorld.tsx`）：
  - `fog near/far` 基值 `8/20 → 9/22` 更通透；`ambient intensity` 基值 `0.24 → 0.20` 降低发灰。
  - `MusicCore` 材质 `metalness 0.7 → 0.42 / roughness 0.2 → 0.34` 去除塑料感。
- **工程验证**：
  - `npm run build:renderer && npm run build:electron` 0 报错
  - `npm run lint` 无新增 warning
  - `npm run smoke:electron` 关键契约：`musicOS.ready / app:ping / world switch / overlay visibility`
  - 手动：窗口 1280/960/640 三档截图对比

---

## 3. 文件清单（精准到行）

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/renderer/styles/tokens.css` | 新建 | 全部变量 |
| `src/renderer/styles/globals.css` | 新建 | tailwind + 基础 |
| `src/renderer/main.tsx` | 修改 2 行 | 引入 globals |
| `src/renderer/index.html` | 修改 1 行 | 去 body inline bg |
| `src/renderer/App.tsx` | 重构 ~180 行 | 删 `<style>` 大块 + 4 装饰 div + 3 HTML pill，顶栏重写 |
| `src/renderer/ui/AudioDock.tsx` | 重构 ~200 行 | 体验态迷你化 + Tokens |
| `src/renderer/ui/SongWorldOverlay.tsx` | 重构 ~30 行 | 收敛为两行浮字 |
| `src/renderer/worlds/WorldLabel.tsx` | 微调 ~20 行 | Canvas 与动效克制化 |
| `src/renderer/worlds/WorldManager.tsx` | 微调 4 行 | fog/light 基值 |
| `src/renderer/core/MusicCore.tsx` | 微调 2 行 | 材质 |

**不碰**：`electron/*`, `src/renderer/audio/*`, `src/renderer/store/*`, `scripts/*`

---

## 4. 风险与回滚

- 风险：R3F Canvas 与 CSS 背景叠加导致色偏 → 通过移除 App.tsx 装饰层规避，单一真相源为 `WorldManager` 的 `#050A14`。
- 风险：AudioDock 缩小后可点区过小 → 保持 36px 触靶 + 8px 热区。
- 回滚：每 Phase 独立 commit，任一 Phase 可单独 revert 不影响其他。

## 5. 验收标准（全部满足才算完成）

- [ ] 无 Dashboard 感：无大卡片、无三列网格、无强渐变；UI 退后，3D 为主角。
- [ ] 视觉一致：所有 2D UI 共享同一套 hairline/blur/shadow/radius/字阶。
- [ ] 信息降噪：同一信息不重复出现两次（标题/时间/状态仅一处）。
- [ ] 构建 0 错：`build:renderer` + `build:electron` + `lint` 通过。
- [ ] 交互无损：本地文件加载、播放/暂停/seek、空间切换、从核心进入、Esc 返回均可用。

## 6. 执行顺序（给执行器）

1. Phase A Tokens 地基（串行前置）
2. 并行 Phase B + C + D（B/C/D 互不依赖文件）
3. Phase E 氛围微调 + 全量验证

— Sisyphus, 2026-08-22
