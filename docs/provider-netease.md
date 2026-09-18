# 网易云 Provider（首个真实平台接入）

> 状态：适配器 + 扫码登录 + 内容入口已实现并实网验证（2026-09）。
> 定位：**平台流媒体优先**；本地文件仅作辅助能力（测试与自有用）。

## 架构

- 请求层 `electron/providers/netease/http.ts`：Electron `net.request` + 专用持久化分区 `persist:music-os-netease`。
  Cookie 由 Chromium 会话自动保存与携带（Windows 下由系统凭据加密），不落地明文、不经过 Renderer。
- 适配器 `electron/providers/netease/index.ts`：实现 `MusicProvider`（search / getTrack / getPlayableSource）。
- 登录 `electron/providers/netease/auth.ts`：扫码登录（unikey → 二维码 → 轮询 → 会话 Cookie）。
- 内容 `electron/providers/netease/content.ts`：推荐歌单 + 排行榜。
- 注册：`electron/providers/index.ts` 中 `createProviderRegistry()` 注册 mock 与 netease。

## 已验证端点（匿名可用性）

| 能力 | 端点 | 说明 |
|---|---|---|
| 搜索 | `POST /api/cloudsearch/pc`（form: s/type/limit/offset） | 返回 `al`/`ar`/`dt`，**含专辑封面 `al.picUrl`** |
| 详情 | `GET /api/song/detail?ids=[id]` | 返回 `album`/`artists`/`duration`（老结构，含封面） |
| 播放地址 | `GET /api/song/enhance/player/url/v1?ids=[id]&level=standard&encodeType=aac` | 需登录才有完整能力；付费曲 `url=null`（`code:-110`） |
| 推荐歌单 | `GET /api/personalized/playlist?limit=N` | 匿名可用 |
| 排行榜 | `GET /api/toplist/detail` | 匿名可用 |
| 二维码 | `GET /api/login/qrcode/unikey?type=1` | 返回 `unikey`；二维码内容 `https://music.163.com/login?codekey=<key>` |
| 扫码轮询 | `GET /api/login/qrcode/client/login?key=<key>&type=1` | 800 过期 / 801 等待 / 802 已扫待确认 / 803 成功 |
| 账号 | `GET /api/nuser/account/get` | 未登录返回空 profile |
| 退出 | `/api/logout` + 清空分区 Cookie | |

## 登录（2026-09-17 更新）

- **应用内扫码登录**：走 **weapi 加密接口族**（与官方网页同一 surface）：
  - `POST /weapi/login/qrcode/unikey`（加密 body：`type=1`）→ `unikey`
  - `POST /weapi/login/qrcode/client/login`（加密 body：`key`, `type=1`）→ 800/801/802/803
  - 参数加密见 `electron/providers/netease/crypto.ts`（明文 → AES-128-CBC(nonce) → AES-128-CBC(secKey) → `params`；
    secKey → RSA → `encSecKey`）；`electron/providers/netease/http.ts` 的 `neteaseWebApi()` 负责 POST。
- **官方登录窗口（备用）**：`electron/providers/netease/login-window.ts` 打开官方登录页（同持久化分区），
  自动点开扫码弹层，检测到 `MUSIC_U` 即视为成功——用于服务端要求额外验证（如「选择网络环境」）的场景。
- **网络**：netease 分区在首个请求前设置 `setProxy({ mode: 'direct' })`，绕开系统全局代理/VPN；
  代理出口会触发风控（`-462 检测到您的网络环境存在风险`、`8821 请切换其他登录方式`）。

### 踩坑记录（务必保留）

| 现象 | 原因 | 结论 |
|---|---|---|
| 扫码确认后 `8821 请切换其他登录方式或升级新版本再试` | 明文接口族 `/api/login/qrcode/*` 被服务端判为「不支持的旧客户端」 | **必须用 weapi**；官方网页能登录就是因为它走加密 surface |
| 带上 `os=pc` Cookie 后 unikey 直接 `-462`（`verifyType:50`、`blockText:检测到您的网络环境存在风险`） | 该 Cookie 会让服务端认为请求来自网页客户端，进而要求安全验证 | 不要手工加 `os=pc`；保持默认请求头 |
| 登录窗口 `loadURL` 报 `ERR_ABORTED(-3)` 且显示首页 | 官方登录页做 hash 路由跳转；`/login` 会重定向到 `#/login` 且只显示首页 | 忽略 `ERR_ABORTED`；加载后自动点一次「登录」打开扫码弹层 |

## 错误映射（不伪造播放能力）

- 无播放地址且**未登录** → `AUTH_REQUIRED`（提示登录）。
- 无播放地址且**已登录** → `UNAVAILABLE`（版权/付费/试听限制）。
- 网络或解析失败 → `UNAVAILABLE` / `INVALID_RESPONSE`（可重试）。

## 合规声明（必须遵守）

- 使用网易云 Web 接口，**非官方开放 API**；仅用于个人学习与本地客户端体验。
- 不绕过付费、会员、音质限制，不重新分发音乐内容；可用性取决于平台版权与账号权益。
- 发版或公开分发前必须重新评估平台协议（ToS）与版权风险。

## 下一步

1. 歌单详情 → 曲目列表 → 点击播放：面板与 `playTrack` provider 分支已就绪，待完成实网回归（含付费曲的 `UNAVAILABLE` 文案）。
2. 每日推荐（需登录）与搜索 UI 切换到 netease。
3. 首页内容刷新策略（缓存与失败重试）与账号态可视化（登录/退出入口）。

> 已完成：内容优先首页（推荐歌单 4 张内容卡 + 排行榜 12 张榜单卡，见 `docs/design-language-v2.md` 3.6）与扫码登录面板。
