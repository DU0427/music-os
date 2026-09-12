# Music OS Agent Rules

本文件是 `music-os` 项目的协作规则。根目录规则适用于整个仓库；如果未来新增更深层目录规则，子目录规则可以补充但不能违背本文件的安全要求。

## 项目基线

- 活动运行时是 `Electron + Vite + React + React Three Fiber + Zustand + Web Audio + SQLite`。
- 活动前端代码位于 `src/renderer`；旧版 `src/app`、`src/components`、`src/hooks`、`src/lib`、`src/server` 仅作为历史原型参考。
- Renderer 不得直接访问 Node.js、SQLite、Provider API、密钥或平台私有接口；跨进程能力必须通过 typed IPC + preload。
- 当前视觉语言是：纯黑舞台、封面作为光源、动态 accent、克制玻璃材质、三档灰排版、播放态跟随节拍接管。
- 不复制 Mineradio 的代码、素材、图片或独特视觉资产；只借鉴公开理念和交互手法。

## 当前产品下一步

当前 v2 视觉重设计和本地内嵌封面提取已经完成，最近提交包括：

- `40f81c6`：空间收敛为 `home/library/memory`。
- `77c5c10`：封面粒子场双模式，无封面时使用散点星尘。
- `c64e6b1`：本地封面提取和 beat/bass 驱动的粒子弹跳。

下一步按以下顺序推进：

1. **人工回归**：连续验证本地文件的载入、播放、暂停、切换、返回、关闭、重启恢复，至少 30 分钟。
2. **本地封面兜底**：当音频没有内嵌封面时，按 `cover.*`、`folder.*`、同名图片的优先级读取同目录图片；不要覆盖已经提取到的内嵌封面。
3. **视觉调参**：使用真实有节拍的本地曲目，调粒子弹跳幅度、密度、点径和透明度；目标是动感但不抖屏、不形成粗糙噪点。
4. **性能验证**：检查长时间播放下的 GPU/CPU、内存、帧稳定性；优先保持单 Canvas 和当前粒子数量预算。
5. **真实 Provider**：本地体验稳定后，再做合法的网易云/QQ 授权与 Provider 接入；不得为了 smoke 或演示伪造真实平台播放能力。

## 设计约束

- Home 是黑场舞台，不恢复旧的轨道环、抽象行星、蓝色 nebula 或密集 Dashboard。
- 关键入口必须承载真实内容；不重新引入六卡网格、推荐 rail、歌词舞台或 Spotify 式后台布局。
- 有封面时：粒子颜色来自封面；无封面时：使用干净散点星尘，不使用暗色密网格噪点。
- 粒子动效必须主要由 `beatPulse`、`bass`、`mid`、`treble` 等音频指标驱动；禁止用缓慢固定正弦动画冒充音乐律动。
- 情绪是全局滤镜，不重新恢复为独立空间；播放态视觉舞台不应依赖用户手动进入另一个世界。
- 动效应服务于节拍、方向感和状态变化；避免持续旋转、过度 bloom、抖屏和抢夺封面焦点。

## 提交规范

所有提交必须使用 Conventional Commits 风格：

```text
<type>(<scope>): <简短、明确的改动摘要>

- 具体改动 1
- 具体改动 2
- 验证方式或行为影响
```

### 允许的 type

- `feat`：新增用户可见能力。
- `fix`：修复错误或回归。
- `refactor`：不改变外部行为的结构调整。
- `perf`：性能优化。
- `docs`：文档或规则变更。
- `test`：测试或 smoke contract 变更。
- `build`：构建、依赖或打包变更。
- `chore`：不属于以上类别的维护。
- `style`：不改变逻辑的格式或视觉样式调整。

### 提交要求

- 摘要使用动词，简短描述结果；推荐包含 scope，例如 `feat(audio): 提取本地音频内嵌封面`。
- 标题必须是 `type:` 或 `type(scope):` 开头，不使用 `update`、`change`、`修改一下`、`WIP` 等模糊标题。
- 标题下面必须写具体改动，不能只写一句空泛的总结。
- 如果有验证，正文必须写明实际执行过的命令及结果，例如 `npm run build:renderer`、`npm run smoke:electron`。
- 一个提交只表达一个可独立回滚的逻辑单元；跨目录且无强依赖的改动拆成多个提交。
- 不得擅自 amend、rebase、force-push 或提交到远端；除非用户明确要求。

示例：

```text
feat(audio): 提取本地音频内嵌封面

- 主进程通过 music-metadata 读取 ID3/FLAC picture
- preload 暴露 getAudioCover，renderer 写入 artworkUrl
- 验证：build:renderer、build:electron、smoke:electron
```

## 脏工作区与构建产物

- 永远不要覆盖、还原或删除用户已有的未提交改动。
- `dist/`、`out/`、`*.tsbuildinfo` 是构建产物，默认不提交。
- `.omo/run-continuation/`、`.omo/boulder.json`、历史 draft 和临时计划默认不提交，除非用户明确要求沉淀。
- `README.md` 的历史乱码或连续性附录改动必须单独审查，不要和功能提交混在一起。
- 提交前必须先看 `git status` 和 `git diff`，只暂存本次明确完成的文件。

## 验证门

代码改动后根据影响范围执行：

```powershell
npm run build:renderer
npm run build:electron
$env:ELECTRON_RUN_AS_NODE=$null
npm run smoke:electron
```

- 前端改动至少运行 `build:renderer`；Electron/preload/IPC 改动必须运行 `build:electron`。
- 播放、转场、IPC、数据持久化改动必须运行 `smoke:electron`。
- 可见 UI 改动需要实际启动 Electron 检查空态、播放态、窄窗口和错误态；不能只依赖编译通过。
- 依赖 LSP 时，如果项目没有配置对应服务器，使用项目实际 build/typecheck 验证，不得用类型忽略注释掩盖错误。
- 报告失败时区分本次改动引入的问题和既有问题，不得删除或弱化 smoke/test 来让它通过。

## 安全与代码质量

- 不使用 `as any`、`@ts-ignore`、`@ts-expect-error`、空 catch 或无依据的 fallback。
- 边界输入（文件路径、IPC payload、Provider 返回值）必须在边界验证；内部已由类型保证的路径不要添加重复防御代码。
- 音频帧循环避免每帧创建数组、对象、纹理或正则；粒子位置和颜色 buffer 应复用。
- 封面 data URL 可能较大，新增存储或缓存策略时必须评估 SQLite 体积和长期播放内存占用。
- 不引入与当前需求无关的重构、功能或视觉装饰。

## 会话连续性

- 开始工作前先检查根目录 `AGENTS.md`、`README.md`、`docs/`、最近提交和当前 `git status`。
- 需要回忆历史决策时，优先查 OpenCode 会话和 `.omo/plans/`，不要凭记忆重造设计。
- 计划文档和实现必须保持一致；如果方向改变，先更新计划或记录新的决策，再继续编码。
