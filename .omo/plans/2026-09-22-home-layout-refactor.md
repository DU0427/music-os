# 首页布局优化（Phase A 重排 + Phase B 一屏编排）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> 执行方式：Native（本会话内逐任务实现，用户已指定「开干」）。

**Goal:** 首页视觉重排（hero 重心矫正、SectionHead 去噪、卡片层级拉开、节奏收紧），随后回归「1320×900 一屏无滚动」的舞台海报形态。

**Architecture:** 全部改动落在 `src/renderer/worlds/WaveHome.tsx`、`src/renderer/ui/NowPlayingCard.tsx`、`src/renderer/hooks/useStageScale.ts` 的视觉层；不触碰音频链路、IPC、Provider、状态结构。Phase A 交付即时观感改善；Phase B 在 A 之上做高度压缩与一屏标定，以 CDP 实测驱动收敛。

**Tech Stack:** React 19 + inline styles（现有模式）、Vite 构建、Electron + CDP（Emulation.setDeviceMetricsOverride / Page.captureScreenshot）做布局实测与视觉回归。

**Spec:** `docs/design-language-v2.md`（v2.2 权威）+ 本会话已批准的方向（先 A 后 B）。

## Global Constraints

- 缩进 2 空格、单引号、语句末尾分号；strict TS，禁 `as any` / `@ts-ignore` / 无依据空 catch。
- 3D 变换只允许作用在封面层，文字层保持 2D（v2.1 文字清晰度纪律）。
- 光晕只属于内容（封面光晕、名次徽章、accent 操作点）；chrome 悬停亮度阶梯不发光（v2.2 铁律 #7）。
- 顶栏常驻不随滚动退场（v2.2 铁律 #8 修订版）。
- 动效由音频指标驱动；禁止与需求无关的装饰。
- 源码提交与 `build:` 产物提交分离；Conventional Commits 中文摘要；完成后直接 push origin main。
- 既有 lint 基线：`SearchOrbital.tsx` / `WaveHome.tsx` 现存 4 个 `react-hooks/set-state-in-effect` error 与 TopBar `<img>` warning 为既有问题，不在本计划范围，不新增即可。

## Review Focus（自动检查覆盖不到、最可能咬人的输入）

1. **矮窗口（1100×700）**：内容必须等比压缩不裁切（scale 下限 0.55）；用 Task 5 脚本在 700 高度实测 `scrollHeight ≤ clientHeight`。
2. **内容数量波动**：网易云歌单/榜单/每日推荐数量不足时的 slice 与空态分支不得破版；每处 slice 改动需检查空数组分支。
3. **文字清晰度**：入场后 reveal 的 filter/transform 必须移除；新增缩放不得把文字放进 3D 层（截图放大检查）。
4. **沉浸态接管**：布局改动后 `collapseWhenImmersive` 的 maxHeight 6000 仍需完整收起内容（截图验证）。
5. **无内容首屏**：netease 内容加载失败时骨架与错误态在一屏预算下不溢出（人工目检分支）。

---

### Task 1: SectionHead 去噪（去 count 徽章）

**Files:**
- Modify: `src/renderer/worlds/WaveHome.tsx`（`SectionHead` 组件 + 4 处调用点）

**Interfaces:**
- Produces: `SectionHead({ title, hint }: { title: string; hint?: string })`（移除 `count` prop）

- [ ] **Step 1: 修改 SectionHead 签名与渲染**

```tsx
/** 区块标题：左侧标题，右侧说明右对齐（去 count，信息由 hint 承载）。 */
function SectionHead({ title, hint }: { title: string; hint?: string }) {
  const s = useStageScale();
  return (
    <div style={{ padding: '0 40px', marginBottom: Math.round(14 * s) }}>
      <div className="flex items-baseline" style={{ justifyContent: 'space-between', gap: Math.round(12 * s) }}>
        <h2 style={{ fontSize: Math.max(12.5, Math.round(14.5 * s)), fontWeight: 500, color: 'var(--mo-ink)', letterSpacing: '0.02em' }}>{title}</h2>
        {hint ? (
          <span
            className="shrink-0"
            style={{
              fontSize: Math.max(10.5, Math.round(11.5 * s)),
              color: 'var(--mo-ink-faint)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {hint}
          </span>
        ) : null}
      </div>
      <div
        aria-hidden
        style={{
          marginTop: Math.round(9 * s),
          height: 1,
          background: 'linear-gradient(90deg, var(--mo-line-strong), transparent 72%)',
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: 更新 4 处调用点（删除 count 属性）**

编辑精选：`<SectionHead title="编辑精选" hint="网易云编辑精选" />`；排行榜：`<SectionHead title="排行榜" hint="此刻最热" />`；每日推荐：`<SectionHead title="每日推荐" hint={accountLoggedIn ? '根据你的口味' : '登录后更懂你'} />`；最近播放两处（有内容/空态）：删除 `count={recentTracks.length}` / `count={0}`。

- [ ] **Step 3: 构建验证**

Run: `npm run build:renderer`
Expected: 编译通过（严格类型下删除 prop 后若有遗漏调用点会报错，正好兜底）。

- [ ] **Step 4: 提交**

```bash
git add src/renderer/worlds/WaveHome.tsx
git commit -m "style(home): SectionHead 去除 count 徽章（标题+说明双栏收敛）"
```

---

### Task 2: Hero 重心矫正（左卡成为第一焦点）

**Files:**
- Modify: `src/renderer/worlds/WaveHome.tsx`（hero grid 列比例）
- Modify: `src/renderer/ui/NowPlayingCard.tsx`（封面/唱盘尺寸、光晕强度）

**Interfaces:**
- Consumes: Task 1 后的 WaveHome。
- Produces: hero 比例 45/55；NowPlayingCard `discSize=138、coverSize=124`（随 stageScale 缩放）。

- [ ] **Step 1: WaveHome hero 比例 40/60 → 45/55**

`gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.6fr)'` → `'minmax(0, 1.12fr) minmax(0, 1.5fr)'`

- [ ] **Step 2: NowPlayingCard 光源强化（内容光源，符合铁律 #7 的例外侧）**

```tsx
const discSize = Math.round(138 * stageScale);
const coverSize = Math.round(124 * stageScale);
// 光晕（封面光晕属于内容光源，允许）
background: `radial-gradient(circle, ${withAlpha(accent, isPlaying ? 0.46 : 0.26)}, transparent 66%)`,
filter: 'blur(52px)',
```

- [ ] **Step 3: 构建 + 截图对比**

Run: `npm run build:renderer`；启动 Electron 后用 CDP 截图 home，确认左卡视觉权重 ≥ 右卡、标题无发虚。

- [ ] **Step 4: 提交**

```bash
git add src/renderer/worlds/WaveHome.tsx src/renderer/ui/NowPlayingCard.tsx
git commit -m "style(home): hero 重心矫正——左卡放大提亮为第一视觉锚点"
```

---

### Task 3: 卡片层级拉开 + 区块节奏收紧（Phase A 收尾）

**Files:**
- Modify: `src/renderer/worlds/WaveHome.tsx`（DailyCard 尺寸、区块 marginBottom）

- [ ] **Step 1: DailyCard 96 → 108 基准（与最近播放紧凑行卡拉开层级）**

`const size = Math.round(108 * s);`

- [ ] **Step 2: 三个内容区块 marginBottom 20 → 16（编辑精选/排行榜/每日推荐外层 div）**

- [ ] **Step 3: 构建 + CDP 截图（首页整页）确认节奏**

Run: `npm run build:renderer`

- [ ] **Step 4: 提交**

```bash
git add src/renderer/worlds/WaveHome.tsx
git commit -m "style(home): 每日推荐卡放大一档，区块间距 8px 网格收紧"
```

---

### Task 4: Phase A 视觉回归（截图四态 + lint）

- [ ] **Step 1: 启动 Electron（CDP 端口），截图 home / 播放态 / library / memory 四态**
- [ ] **Step 2: 检查文字清晰度（入场结束后无发虚）与沉浸态收起**
- [ ] **Step 3: `npx eslint src/renderer/worlds/WaveHome.tsx src/renderer/ui/NowPlayingCard.tsx`——不新增 error（基线 4 error 除外）**
- [ ] **Step 4: 若有视觉问题当场修正后重新截图；无问题则进入 Phase B**

---

### Task 5: 一屏实测脚本 `scripts/measure-home.cjs`

**Files:**
- Create: `scripts/measure-home.cjs`

**Interfaces:**
- Produces: `node scripts/measure-home.cjs --port 9223` → JSON `{ sizes: [{ label, width, height, scrollHeight, clientHeight, fits }], hero: {...} }`；`fits = scrollHeight <= clientHeight`。

- [ ] **Step 1: 写脚本（Node 22 内建 WebSocket + CDP）**

```js
// 用法：先启动 Electron（--remote-debugging-port=9223），再 node scripts/measure-home.cjs --port 9223
const http = require('node:http');

function getPageTarget(port) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const targets = JSON.parse(data).filter((t) => t.url.endsWith('out/renderer/index.html'));
        targets.length ? resolve(targets[0]) : reject(new Error('renderer target not found'));
      });
    }).on('error', reject);
  });
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  });
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve({
      send: (method, params = {}) => new Promise((res, rej) => {
        const mid = ++id;
        pending.set(mid, { resolve: res, reject: rej });
        ws.send(JSON.stringify({ id: mid, method, params }));
      }),
      close: () => ws.close(),
    }));
    ws.addEventListener('error', reject);
  });
}

async function main() {
  const port = Number(process.argv[process.argv.indexOf('--port') + 1] ?? 9223);
  const target = await getPageTarget(port);
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  const sizes = [
    { label: '1320x900', width: 1320, height: 900 },
    { label: '1100x700', width: 1100, height: 700 },
  ];
  const results = [];
  for (const size of sizes) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: 1, mobile: false });
    await new Promise((r) => setTimeout(r, 400));
    const r = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const sc = document.querySelector('.mo-no-scrollbar.overflow-y-auto');
        const hero = sc?.querySelector('div > div > div');
        return JSON.stringify({
          scrollHeight: sc?.scrollHeight ?? -1,
          clientHeight: sc?.clientHeight ?? -1,
          scrollTop: sc?.scrollTop ?? -1,
        });
      })()`,
      returnByValue: true,
    });
    const m = JSON.parse(r.result.value);
    results.push({ ...size, ...m, fits: m.scrollHeight >= 0 && m.scrollHeight <= m.clientHeight });
  }
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  console.log(JSON.stringify({ sizes: results }, null, 2));
  cdp.close();
  process.exit(results.every((r) => r.fits) ? 0 : 2);
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
```

- [ ] **Step 2: 实跑一次确认输出（预期 Phase A 后 fits=false，这就是 Phase B 的基线）**

Run: `node scripts/measure-home.cjs --port 9223`

- [ ] **Step 3: 提交**

```bash
git add scripts/measure-home.cjs
git commit -m "test(home): 新增 CDP 一屏实测脚本（900/700 双档）"
```

---

### Task 6: 结构压缩到一屏预算

**Files:**
- Modify: `src/renderer/worlds/WaveHome.tsx`

**Interfaces:**
- Consumes: Task 5 脚本的实测数字做校准依据。
- Produces: 压缩后的各带高度（供 Task 7 标定）。

- [ ] **Step 1: 高度压缩（起始值，实测后允许 ±8px 微调）**

| 位置 | 现值 | 新值 |
|---|---|---|
| 滚动容器顶部 padding | `Math.max(78, 64 * s)` | `Math.max(64, 56 * s)` |
| hero 外层 marginBottom | `18 * s` | `14 * s` |
| hero 左卡 minHeight | `130 * s` | `118 * s` |
| NowPlayingCard 内边距 | `16 * s / 22 * s` | `12 * s / 20 * s` |
| MosaicGrid height | `134 * s` | `124 * s` |
| SectionHead marginBottom / 分隔线 marginTop | `14 * s` / `9 * s` | `10 * s` / `7 * s` |
| 三区块 marginBottom | `16 * s`（Task 3 后） | `12 * s` |
| DailyCard size | `108 * s`（Task 3 后） | `100 * s` |
| 每日推荐渲染张数 | `dailyTracks.map(...)` | `dailyTracks.slice(0, 6).map(...)` |

- [ ] **Step 2: 空态分支检查——每日推荐 slice(0,6) 不影响 `dailyTracks.length > 0` 条件渲染**
- [ ] **Step 3: `npm run build:renderer`**
- [ ] **Step 4: 提交**

```bash
git add src/renderer/worlds/WaveHome.tsx
git commit -m "refactor(home): 各带高度压缩至一屏预算（每日推荐收敛 6 张）"
```

---

### Task 7: useStageScale 重标定（实测驱动）

**Files:**
- Modify: `src/renderer/hooks/useStageScale.ts`

**Interfaces:**
- Consumes: Task 5 脚本 + Task 6 压缩后的实际高度。
- Produces: 新的 `FIXED_HEIGHT / SCALED_HEIGHT / RESERVED_HEIGHT` 常量（注释更新实测依据）。

- [ ] **Step 1: 跑 `node scripts/measure-home.cjs --port 9223` 记录 900/700 两档差值**
- [ ] **Step 2: 按实测调整三常量（目标：900 档 `fits:true` 且 scale≥0.9；700 档 `fits:true` 且 scale≥0.62）**
- [ ] **Step 3: 重复 Step 1-2 直到两档全部 `fits:true`（最多 3 轮；仍不收敛则回 Task 6 再砍 8px，不得硬凑常量）**
- [ ] **Step 4: 更新 useStageScale 头注释里的实测标定说明**
- [ ] **Step 5: `npm run build:renderer` + 提交**

```bash
git add src/renderer/hooks/useStageScale.ts
git commit -m "fix(home): useStageScale 重新标定（一屏预算实测驱动）"
```

---

### Task 8: 全量回归 + 文档同步 + 收尾

- [ ] **Step 1: CDP 视觉回归四态**（home 1320×900 / home 1100×700 / 播放态沉浸 / library+memory），重点：无滚动条、文字不发虚、沉浸态整块收起、骨架与错误态不溢出
- [ ] **Step 2: `npx eslint src/renderer/worlds/WaveHome.tsx src/renderer/ui/NowPlayingCard.tsx src/renderer/hooks/useStageScale.ts`（不新增 error）**
- [ ] **Step 3: 设计文档同步 `docs/design-language-v2.md` 3.1**：一屏纪律回归（无滚动条）、hero 45/55、每日推荐 6 张、SectionHead 无 count；README「当前状态」首页描述同步
- [ ] **Step 4: 提交**

```bash
git add docs/design-language-v2.md README.md
git commit -m "docs(home): 一屏编排落地后的设计语言与 README 同步"
```

- [ ] **Step 5: `git add out/renderer && git commit -m "build: 同步首页重排与一屏编排产物"`；`git push origin main`**

---

## Self-Review 记录

- 规格覆盖：A 方向 4 项（hero/SectionHead/卡片层级/底部节奏）→ Task 1-3；B 方向（一屏、每日推荐 6、排行榜维持 6）→ Task 6-7；文档 → Task 8。无缺口。
- 占位符：无 TBD；Task 7 常量数值以实测驱动并给出收敛规则（非占位）。
- 类型一致性：SectionHead 新签名在 Task 1 定义、Task 6/8 沿用；measure 脚本输出字段与 Task 7 使用一致。
- Review Focus 五项：矮窗口→Task 5/7 实测；内容波动→Task 6 Step 2；文字清晰度→Task 4/8 截图；沉浸态→Task 8；无内容首屏→Task 8 人工分支目检。
