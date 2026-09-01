# music-os 设计语言 v2 —— Design Language

> 版本：2026-09-01
> 状态：已获用户批准的设计方向，作为重设计的唯一权威规格。
> 参考来源：MineRadio（XxHuberrr/Mineradio, GPL-3.0，仅借鉴理念/手法，不复制代码素材）+ Apple HIG / apple.com 现代美学。

## 0. 设计哲学

**一句话定位：一首歌，在黑夜里亮起来。**（A song lights up the dark.）

music-os 不是"带 3D 背景的 2D 应用"，也不是"沉浸式播放器"的复刻。它是：

> **Apple 的克制与排版 × MineRadio 的黑暗沉浸与动态色彩**

- **黑暗舞台**：近纯黑底色，一切装饰退后，内容自己发光。
- **排版为骨架**：显示级字号 + 大量留白，一屏一个焦点。
- **动态色彩**：每首歌的封面主色流动为全局强调色，音乐真正"染上"界面。
- **两态接管**：未播放 = 安静黑场；播放 = 这首歌接管整个舞台。

## 1. 设计原则（6 条铁律）

1. **纯黑舞台**。底色近纯黑 `#050507`。移除所有蓝调雾气、轨道环、CSS 渐变球、装饰性 overlay。舞台越黑，内容越亮。
2. **封面是唯一的光源**。歌曲封面 = 产品大图，背后带柔光晕（封面色的 `blur` glow）。无封面时用唱片 conic-gradient 兜底。
3. **排版建立层级，不靠颜色**。三档字阶：显示级（28-36px 极细）→ 内容级（13-15px）→ 辅助级（10-11px）。层级来自字号与字重。
4. **单一动态强调色，随歌曲流动**。从封面提取主色 → `--mo-accent` 全局流动（播放键/进度/焦点态）。强调色只出现在操作点，克制使用。
5. **两态接管**。播放即进入，暂停即回暗。播放态环境被这首歌接管（封面粒子幕 + accent 染色），无需"进入世界"的操作。
6. **材质只为内容服务**。玻璃面板只出现在承载内容处（曲库、搜索、记忆）。舞台本身永远干净。

## 2. 视觉系统（Design Tokens）

### 2.1 色彩

| Token | 值 | 用途 |
|---|---|---|
| `--mo-bg` | `#050507` | 舞台底色（近纯黑，去蓝调） |
| `--mo-bg-soft` | `#0A0A0C` | 次级背景 |
| `--mo-bg-elevated` | `rgba(14,14,16,0.6)` | 玻璃面板底 |
| `--mo-ink` | `#F5F5F7` | 主文字（Apple 冷白） |
| `--mo-ink-soft` | `#A1A1A6` | 次级文字 |
| `--mo-ink-muted` | `#86868B` | 弱文字 |
| `--mo-ink-faint` | `#6E6E73` | 最弱文字/占位 |
| `--mo-line` | `rgba(255,255,255,0.08)` | 细分割线 |
| `--mo-line-strong` | `rgba(255,255,255,0.14)` | 强分割线 |
| `--mo-accent` | `dynamic`（封面主色） | 唯一动态强调色，全局流动 |
| `--mo-accent-strong` | `dynamic + 提亮` | 强调色高亮态 |
| `--mo-accent-ghost` | `accent @ 14%` | 强调色柔背景 |
| `--mo-warm` | `#E8C28A` | 唯一暖色，仅记忆/时间线符号 |
| `--mo-warm-soft` | `rgba(232,194,138,0.35)` | 暖色柔光 |

> 色彩纪律：界面主体 = 黑 + 三档灰白。强调色只有一枚（随歌曲流动）。暖色只有一处（记忆）。禁止多色装饰。

### 2.2 字体

| Token | 值 |
|---|---|
| `--mo-font-sans` | `"Inter","SF Pro Display","PingFang SC","Noto Sans SC",system-ui,sans-serif` |
| `--mo-font-mono` | `"JetBrains Mono",ui-monospace,monospace` |

### 2.3 字阶（三档）

| Token | 值 | 用途 |
|---|---|---|
| `--mo-type-display` | `30px / 300` | 显示级：正在播放曲名、大标题。**一屏最多一处** |
| `--mo-type-title` | `18px / 500` | 内容标题：封面卡曲名、空间标题 |
| `--mo-type-body` | `13px / 400` | 内容正文：列表、描述 |
| `--mo-type-caption` | `11px / 400` | 辅助：时间、状态、标签（非大写时） |
| `--mo-type-micro` | `10px / 500 + 0.14em tracking` | 微标签（仅允许此处用大写间距） |

> 排版纪律：全界面禁止"10-13px 全大写"铺满。uppercase+tracking 只保留 micro 档。

### 2.4 玻璃材质（统一配方）

```
background: var(--mo-bg-elevated);
backdrop-filter: blur(22px) saturate(1.15);
border: 1px solid var(--mo-line);
box-shadow:
  inset 0 1px 0 rgba(255,255,255,0.06),      /* 上内高光 */
  0 16px 48px rgba(0,0,0,0.5);               /* 悬浮投影 */
border-radius: 14px;                          /* 面板；控件用胶囊 */
```

> 圆角纪律：面板 10-14px，控件/胶囊 999px。全界面一致，不做 18-22px 大圆角面板。

### 2.5 动效

| 场景 | 参数 |
|---|---|
| 转场（空间切换） | 600ms，`cubic-bezier(0.22,1,0.36,1)`，opacity + scale(0.98→1) + blur 过渡 |
| 微交互（hover/点击） | 200ms，弹簧 `stiffness 260 / damping 24` |
| 播放态淡入 | 900ms，粒子幕 opacity 0→0.4 |
| 禁止 | 永转动画（轨道环/旋转渐变）、无意义的浮动 |

## 3. 布局与场景

### 3.1 Home ——「舞台」

- 纯黑舞台，无轨道环、无行星、无卡片墙。
- **中央偏左**：大封面发光物（280-340px，封面 + 身后 80px blur 光晕）。这是"正在播放/继续听"。
  - 有曲目：封面 + 显示级曲名（30px/300）+ 歌手（14px 灰）。点击 = 播放/暂停。
  - 无曲目：唱片渐变兜底 + "载入歌曲"提示，点击打开文件选择。
- **右下角**：安静的时钟（`--mo-font-mono` 数字，弱灰）。MineRadio Now 屏概念。
- **左下角**：2-3 枚发光小物体（半径 ~40px）：曲库 / 记忆 / 情绪滤镜。悬停浮现文字标签（micro 档）。点击进入对应屏/切换滤镜。
- 大面积留白。焦点只有一个：那颗发光的封面。

### 3.2 曲库 ——「封面场」

- 进入：全屏真实封面网格（规则排布，封面是主角，无边框无背景卡）。
- 间距统一（12px），封面 1:1。悬停：微亮 + 浮现曲名（body 档）。
- 点击封面 → 右侧滑出玻璃详情面板（专辑/歌手/时长/情绪标签/播放按钮）。
- 无封面曲目：唱片渐变兜底。
- 空态：纯黑 + 一行弱文字"载入歌曲以点亮封面场"。

### 3.3 记忆 ——「轨迹」

- 一条细光时间线横贯（暖金 `#E8C28A`，唯一暖色符号）。
- 节点 = 发光小点。悬停浮现日期/曲目（玻璃小签）。
- 最亮的一个点 = 最常听。点击节点可回放（provider 曲目可恢复）。
- 空态：弱文字"播放一首歌来点亮轨迹"。

### 3.4 播放态 ——「舞台接管」

- 封面粒子幕从黑色深处浮现（全屏，opacity 0.3-0.45，随 bass/beat 呼吸）。
- 封面缩小为中央偏上"身份物"，仍带光晕。
- 操作面（播放键/进度/焦点）被这首歌的 accent 染色。
- 播放即进入，暂停即回暗。无需"进入世界"操作。

### 3.5 控制条 —— 极简玻璃条

- 底部居中，玻璃配方统一。
- 结构：小封面(44px) + 播放/暂停(胶囊) + 曲名/歌手 + 进度 hairline（发光 thumb）+ 时间 + 频谱（实时走动）。
- 频谱：`<canvas>` 或 30 条 hairline，用 `AudioEngine` metrics 实时绘制，仅播放态可见。

## 4. 两态定义

| | 未播放态「黑场」 | 播放态「接管」 |
|---|---|---|
| 背景 | 纯黑 + 极淡星尘（opacity ≤0.08） | 封面粒子幕浮起（0.3-0.45） |
| 焦点 | 封面发光物（继续听） | 封面身份物 + 控制条频谱 |
| accent | 白（默认） | 封面主色流动 |
| 氛围 | 安静、克制 | 歌曲接管、环境呼吸 |

## 5. 明确不做（约束）

- 不引入卡片网格/推荐 rail/歌词舞台/3D 歌单架（dashboard 化）。
- 不做满屏封面粒子墙（MineRadio 式中央视觉）；我们的粒子幕是**背景层**，透明度克制。
- 不引入 MineRadio 的青绿主色；保留我们"黑 + 白 + 动态色 + 记忆暖金"体系。
- 不复制 Mineradio 的任何代码/素材/图片（GPL-3.0 + 视觉版权归作者）。
- 不新增空间目的地（mood/visualizer 不再占空间槽位）；`currentSpace` 收敛为 home / library / memory。
- 技术形态不改：单 Canvas、CameraRig、AudioEngine、Zustand、IPC/SQLite/Provider 边界、数据模型。

## 6. 组件级变更地图

| 文件 | 动作 |
|---|---|
| `styles/tokens.css` | 重写为 v2 视觉系统 |
| `styles/globals.css` | 去蓝调、焦点环、动效体系 |
| `ui/HomeOrbital.tsx` | 重写为「舞台」场景（删行星/轨道/核心球） |
| `ui/CoreVisualDom.tsx` | 退役（由封面发光物替代）；如保留仅作兜底 |
| `ui/AudioDock.tsx` | 升级为完整玻璃控制条（频谱 + accent 流动） |
| `ui/TopBar.tsx` | 精简：brand + 空间标题 + 搜索，删除密集弹层 |
| `ui/SearchOrbital.tsx` | 保留（视觉对齐新 token） |
| `ui/DetailOrbital.tsx` | 简化或并入封面详情面板 |
| `worlds/LibraryGalaxyWorld.tsx` | 重写为封面场 |
| `worlds/MemoryFieldWorld.tsx` | 暖金细光时间线 |
| `worlds/MoodSpaceWorld.tsx` | 删除（并入首页滤镜） |
| `worlds/VisualizerWorld.tsx` | 并入播放态（删除独立空间） |
| `worlds/CoverParticleField.tsx` | 提级为播放舞台主角（参数调整） |
| `worlds/HomeSpace.tsx` | 保持空壳（环境由 CoverParticleField + SpaceBackdrop 提供） |
| `App.tsx` | 空间收敛、移除 mood/visualizer 渲染分支 |
| `store/runtime.ts` | currentSpace 类型收敛 |

## 7. 验收总纲

1. 启动后首屏 = 纯黑 + 一颗发光封面 + 安静排版，无轨道环/行星/雾气。
2. 载入歌曲播放 → 封面粒子幕浮起 + 界面被该曲主色染色 + 控制条频谱走动。
3. 暂停 → 回暗场。曲库 = 真实封面网格。记忆 = 暖金时间线。
4. 全程 `npm run build:renderer` + `npm run build:electron` + `smoke:electron` 绿。
5. 无 dashboard/卡片网格/推荐流；无 Mineradio 素材复制。