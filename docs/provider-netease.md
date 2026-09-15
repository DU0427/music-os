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

## 错误映射（不伪造播放能力）

- 无播放地址且**未登录** → `AUTH_REQUIRED`（提示登录）。
- 无播放地址且**已登录** → `UNAVAILABLE`（版权/付费/试听限制）。
- 网络或解析失败 → `UNAVAILABLE` / `INVALID_RESPONSE`（可重试）。

## 合规声明（必须遵守）

- 使用网易云 Web 接口，**非官方开放 API**；仅用于个人学习与本地客户端体验。
- 不绕过付费、会员、音质限制，不重新分发音乐内容；可用性取决于平台版权与账号权益。
- 发版或公开分发前必须重新评估平台协议（ToS）与版权风险。

## 下一步

1. 内容优先首页：推荐歌单 / 排行榜封面网格 + 登录入口（扫码面板）。
2. 歌单详情 → 曲目列表 → 点击播放（复用 `playTrack` 的 provider 分支）。
3. 每日推荐（需登录）与搜索 UI 切换到 netease。
