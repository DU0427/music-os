# Mineradio 视觉规格解析 + music-os 结合建议

> 来源：本地逆向解析 `D:\test\Mineradio\resources\app\public\index.html`（1.35MB 单文件应用，Three.js 前端）+ 你提供的两张截图。
> 目的：作为"参考 Mineradio 但**不做成一模一样**"的决策依据。每项标明【推荐结合 / 有条件结合 / 不结合】+ 技术路径 + 授权注意。
> 授权约束：Mineradio 为 GPL-3.0 且 README 声明界面视觉归作者所有 → **只参考理念/借鉴手法，不复制代码/素材/图片**。

---

## 0. 一句话定位差异

- **Mineradio**：功能完整的内容播放器 + 沉浸视觉。首页 = 六卡内容入口（我的歌单/每日推荐/继续听/听歌画像等）+ 推荐 rail；播放页 = 巨大封面粒子墙。
- **music-os（我们）**：空间化体验。首页 = 中央 Music Core + 轨道行星导航（object-first）；我们 spec 明确**禁止 dashboard/卡片网格/Spotify clone/密集 HUD**。
- **结论**：Mineradio 的"**材质感、动态色彩、封面粒子、玻璃控制条**"是它的神，值得借鉴；它的"**六卡网格、推荐 rail、歌词舞台**"必须丢弃（会违背我们 spec + 用户明确要"不一样"）。

---

## 1. 设计 Token 层（颜色 / 字体 / 材质）

### Mineradio tokens（`:root`）
```
--fc-bg:#08090B         近黑深底
--fc-ink:#E8ECEF        主文字（冷白）
--fc-muted:#8A9099      次要文字
--fc-hair:#1A1D22       细分割线
--fc-accent:#00F5D4     主强调色（青）★核心
--fc-accent-rgb:0,245,212
--fc-blue:#2442ff       辅强调（蓝）
--fc-warm:#f8f4ee       暖白
--champagne:#f4d28a     暖金（交互/更新用）
--home-accent:#00f5d4   首页动态强调色（会随曲目/状态变）★
--font-sans:"Noto Sans SC"...
--font-mono:"JetBrains Mono"...
```

### 我们现状（tokens.css）
```
--mo-bg:#050A14 / --mo-text-muted:#9AA7BF / --mo-accent:#8DBBFF(蓝) / --mo-accent-strong:#6EA8FF
--mo-portal:#E8C28A(金) / --mo-font-sans & --mo-font-mono
```

### 【推荐结合】1.1 单点动态强调色（最有价值）
- Mineradio 用 `var(--home-accent)` + `color-mix()` 让整个界面颜色随歌曲/状态流动。
- 我们已做（Wave 2 todo 6）：home 加 `--mo-home-accent` 随 `track.worldContext.energyTarget`（calm→#78AFFF / electric→#EA8E83 / 默认→#8DBBFF）。
- **建议强化**：把动态 accent 扩展到 AudioDock 播放键、进度条辉光、核心 pill hover——让"播放的歌曲"染色整个操作面。
- 技术路径：继续用局部 CSS 变量 `--mo-home-accent`，不覆盖全局。

### 【推荐结合】1.2 玻璃材质（backdrop+saturate+内高光）
- Mineradio 玻璃卡片：`backdrop-filter:blur(24px) saturate(1.12)` + 渐变背景 + 多层阴影 + `inset 0 1px 0 rgba(255,255,255,.06)` 内高光。
- 我们 Wave 2 已部分做到（AudioDock `blur(18px) saturate(1.6)`、行星玻璃标签）。
- **建议**：统一我们的玻璃配方为 `blur(xx) saturate(1.2-1.8) + inset 上内高光`，去重现有若干处 `blur(16px)` 无 saturate 的实现。

### 【不结合】1.3
- 不引入 Mineradio 的 `--fc-accent: #00F5D4` 青绿主色（会改变我们整体蓝色调性，且我们要"不一样"）。保留我们的蓝 + 金门户色。

---

## 2. 首页布局（`#empty-home`）

### Mineradio 首页
- `empty-home-shell` 两栏 grid：**左 Hero**（大标题 + 快速操作 chips + 旋转唱片/封面套视觉块）+ **右内容区**（六卡网格 + "为你准备"推荐 rail）。
- 卡片玻璃：`blur(24px) saturate(1.12)` + `::before` 斜向渐变光 + 1px 细网格线装饰 + `::after` 右下角唱片视觉块（`conic-gradient` 唱片兜底）。
- 文字层次：`home-card-label`(10px 强调色 uppercase) → `home-card-title`(19px/780) → `home-card-sub`(11.5px/55%)。
- 浮动：`home-card-float` 7.4s 无限上下浮动 2px。

### 【不结合】2.1 六卡网格 + 推荐 rail
- 直接违背我们 spec（object-first / no dashboard）+ 用户要"不一样"。**强烈建议不结合**。

### 【有条件结合】2.2 唱片艺术角（conic-gradient 唱片兜底）
- Mineradio 卡片右下角封面块，未加载时是 `conic-gradient` 唱片（旋转）。
- 我们 Wave 2 已在 AudioDock 加 44px 封面块 + conic-gradient 兜底。
- **建议**：保留在 AudioDock；**不扩展到行星**（行星已有各自视觉身份，加封面块会拥挤抢戏）。

### 【推荐借鉴】2.3 文字层次（label→title→sub）
- 我们行星 label 已做 title + hint（Wave 1）；可微调 hint 上标一个小型 `label`（如 `LIBRARY/DUST`），提升信息层级但不复杂化。

---

## 3. 背景动态粒子（`#canvas-container`，Three.js）★ 重点

### Mineradio 实现（4 层）
1. **封面粒子场**：`buildCoverParticleGeometry(grid)` 把专辑封面采样成 `grid×grid` 粒子（每粒子带 `aUv` 采样色 + `aRand` 相位），形成封面噪点化幕墙。
2. **自定义 shader**：顶点着色器用 `audioBoost = 1 + maxRippleAmp*0.7 + edgeBoost*0.55 + uBeat*0.3 + uBurstAmt*0.5` 驱动 `gl_PointSize`；片元着色器按亮度/像素发光/波纹混合，`keepBlack` 保留暗部。
3. **bloom 辉光**：双层 Points，第二层 `AdditiveBlending` + 自定义 bloom 片元 shader（亮部加法发光）。
4. **浮空星尘**：`FLOAT_COUNT=1300`，`sin/cos` 长周期漂移（代码注释明说"优雅而非乱飞"）+ "loading 雾"过渡。

### 音频驱动映射（顶点 shader 常量可借鉴）
```
bass → size/flow 驱动（uBass*0.07）
mid  → 光/雾（uMid）
treble → 粒子（uTreble）
beat → 短促脉动（uBeat）
```

### 【推荐结合】3.1 封面粒子幕（克制版）— 最贴合用户"背景动态效果"诉求
- **目标**：在 home 空间核心（CoreVisualDom）背后加一层柔和封面粒子幕——播放时把当前歌曲封面（`track.artworkUrl`）噪点化成星尘背景，随 bass/beat 微微脉动，**低透明度、不喧宾**。
- **技术路径**（R3F，我们已有 WorldManager + R3F Canvas）：
  - 新建 `src/renderer/worlds/CoverParticleField.tsx`：用 `react-three-fiber` 的 `<points>` + `BufferGeometry`，从 `track.artworkUrl` 用 `useLoader(THREE.TextureLoader)` 采样像素色 → 生成位置/颜色 buffer；`useFrame` 里按 `useAudioStore.metrics.bass/beat/energy` 更新 `pointsMaterial.size` + 整体 opacity；播放时淡入，未播放隐藏。
  - 挂载点：`WorldManager` 的 `<HomeSpace />` 内（home 空间）、渲染在核心背后（`renderOrder` 提前，`depthWrite:false`）。
  - 无封面时：兜底用 `energyTarget` 色 + 星尘（不依赖图片）。
  - 关键：`pointer-events-none`，不抢交互；target opacity 0.10-0.22（克制）。
- **为何克制**：Mineradio 是满屏粒子墙；我们 spec 要 calm/premium，做到"星尘在核心背后呼吸"即达意，不复制满屏效果。

### 【有条件结合】3.2 一个 shader 简化版（替代纯 Points）
- 若想要"波纹/发光"质感，可给 CoverParticleField 加一个极简 `ShaderMaterial`（只保留 `gl_PointSize = base * (1 + uBeat*0.3)` + 单层加法 blend），不复制 Mineradio 的双层 bloom 复杂度。
- 若时间有限，先用默认 `PointsMaterial` + `AdditiveBlending` + `sizeAttenuation` 即可，效果已足够"呼吸星尘"。

### 【不结合】3.3
- 不引入 Mineradio 的涟漪数据纹理（`rippleTex`）、双层 bloom、骷髅粒子层、歌词粒子层——过度复杂 + 超出我们空间定位。

---

## 4. 播放页布局（截图 2）

### Mineradio 播放页
- 中央：巨大封面粒子墙（歌曲封面噪点化）。
- 右下：封面缩略卡 + 曲名/歌手 + "正在播放" pill。
- 左上：曲名玻璃小签。底部：玻璃控制条。

### 【有条件结合】4.1 曲目信息卡（右下）
- 我们首页主要入口是行星；播放后的"曲目信息"现由 AudioDock 承载。
- **建议**：不在首页右下加独立信息卡（会与 AudioDock 重复 + 破坏空间感）。若加，仅在播放页/DetailOrbital 内。
- 技术路径：DetailOrbital 已含曲目信息栈，无需新增。

### 【推荐结合】4.2 玻璃控制条（已在 Wave 2 做了 3 点）
- 控制条玻璃拟态：`blur(12px) saturate(1.8)` + 内高光 + 发光进度条 thumb + 封面块。
- 我们 Wave 2 AudioDock 已做：saturate 玻璃、44px 封面块 + conic-gradient、进度 fill 辉光。
- **建议补**：进度条加"发光拖动 thumb"（Mineradio 的 `#progress-thumb` 有径向渐变 + 光晕 + 拖动粒子）。可用纯 CSS `::after` 在 fill 末端放一个 6-8px 发光圆点，hover/播放时显示。
- 技术路径：AudioDock 进度 fill 容器加绝对定位圆点 + `boxShadow: 0 0 12px accent`。

---

## 5. 动效体系

### Mineradio 关键帧
```
home-card-float:    translateY(-2px) 7.4s 无限     卡片轻浮
home-visual-drift:  translate3d + rotate(.6deg) 8.8s  封面块漂移
progress-particle-fade: 进度拖动粒子
splash-enter-pulse: 文字辉光呼吸
```

### 【推荐结合】5.1 电子微浮动
- 我们行星已有 `y:[0,-8,0]` 浮动。可给核心 pill / 行星玻璃标签加轻微 `hover scale` 更细腻；保留现有，不加过多新动画。
- **建议**：进度 thumb 加"拖动粒子"仅作为可选加分项（成本低、加分明显），但需测试不掉帧。

### 【不结合】5.2
- 不引入 splash 启动页粒子（我们已有启动逻辑）。

---

## 6. 结合建议矩阵（汇总）

| # | 元素 | 建议 | 文件 | 状态 |
|---|---|---|---|---|
| 1.1 | 动态强调色延伸到操作面 | ✅ 推荐 | AudioDock/HomeOrbital | Wave2 部分完成，可扩展 |
| 1.2 | 玻璃材质统一（saturate+内高光） | ✅ 推荐 | tokens/多个 UI | Wave2 部分完成 |
| 1.3 | Mineradio 青绿色调 | ❌ 不结合 | — | 保留我们蓝+金 |
| 2.1 | 六卡网格/推荐 rail | ❌ 不结合 | — | 违 spec |
| 2.2 | 唱片艺术角 | ⚠️ AudioDock 保留，不扩行星 | AudioDock | Wave2 完成 |
| 2.3 | 文字层次 label→title→sub | ⚠️ 可选微调 | HomeOrbital | Wave2 完成 |
| 3.1 | **封面粒子幕（克制版）** | ✅ **重点推荐** | 新建 CoverParticleField | **待做** |
| 3.2 | 简化 shader 粒子 | ⚠️ 可选 | CoverParticleField | 待做(可选) |
| 4.1 | 右下曲目信息卡 | ❌ 不结合 | — | AudioDock 已承载 |
| 4.2 | 玻璃控制条 + 发光 thumb | ✅ 推荐补 thumb | AudioDock | 待补 |
| 5.1 | 微浮动/拖动粒子 | ⚠️ 可选 | AudioDock | 待做(可选) |

---

## 7. 建议下一步（待你确认）

**优先做（高价值、贴你诉求）**：
1. **封面粒子幕（3.1）**——新建 `src/renderer/worlds/CoverParticleField.tsx`，R3F Points 采样 `track.artworkUrl`，播放时在核心背后柔和呼吸，低透明度不喧宾，无封面用 energyTarget 色兜底。这是最贴合"参考 Mineradio 背景动态效果"的点。
2. **AudioDock 发光进度 thumb（4.2）**——纯 CSS 补一个 6-8px 发光圆点。

**可选（按需）**：3.2 简化 shader、5.1 拖动粒子。

**不做**：1.3 改青绿色、2.1 六卡网格、4.1 右下信息卡、3.3 双层 bloom。
