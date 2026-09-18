"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNeteaseSession = getNeteaseSession;
exports.neteaseRequest = neteaseRequest;
exports.clearNeteaseSession = clearNeteaseSession;
const electron_1 = require("electron");
/**
 * 网易云请求层：使用专用持久化分区（persist:music-os-netease），
 * Cookie 由 Chromium 会话自动保存与携带（Windows 上由系统凭据加密），主进程之外不可见。
 */
const NETEASE_SESSION_PARTITION = 'persist:music-os-netease';
const NETEASE_BASE_URL = 'https://music.163.com';
const NETEASE_REFERER = 'https://music.163.com/';
const NETEASE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
let cachedSession = null;
let directProxyConfigured = false;
function getNeteaseSession() {
    if (!cachedSession) {
        cachedSession = electron_1.session.fromPartition(NETEASE_SESSION_PARTITION);
    }
    return cachedSession;
}
/**
 * 网易云流量走直连：全局代理/VPN 出口会触发账号风控（8821 请切换其他登录方式、-462 网络环境风险），
 * 导致扫码登录被拒。这里只让 netease 分区绕开系统代理，其它流量不受影响。
 * 若网络本身必须经由代理才能访问网易云（罕见），会退化为请求失败，此时应改回跟随系统代理。
 */
async function ensureDirectProxy(target) {
    if (directProxyConfigured) {
        return;
    }
    directProxyConfigured = true;
    try {
        await target.setProxy({ mode: 'direct' });
    }
    catch {
        // 设置失败则沿用系统代理，不阻塞请求
    }
}
/** 发起网易云 Web API 请求并解析 JSON。路径以 / 开头时拼到 music.163.com。 */
async function neteaseRequest(pathOrUrl, init = {}) {
    const targetSession = getNeteaseSession();
    await ensureDirectProxy(targetSession);
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${NETEASE_BASE_URL}${pathOrUrl}`;
    const method = init.method ?? 'GET';
    const formBody = init.form ? new URLSearchParams(init.form).toString() : null;
    return new Promise((resolve, reject) => {
        const request = electron_1.net.request({
            url,
            session: targetSession,
            method,
            useSessionCookies: true,
        });
        request.setHeader('Referer', NETEASE_REFERER);
        request.setHeader('User-Agent', NETEASE_USER_AGENT);
        if (formBody) {
            request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        const chunks = [];
        request.on('response', (response) => {
            response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            response.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf8');
                try {
                    resolve(JSON.parse(text));
                }
                catch {
                    reject(new Error(`网易云返回了非 JSON 响应（HTTP ${response.statusCode}）。`));
                }
            });
        });
        request.on('error', (error) => reject(error));
        if (formBody) {
            request.write(formBody);
        }
        request.end();
    });
}
/** 退出登录：撤销服务端会话并清空该分区 Cookie。 */
async function clearNeteaseSession() {
    try {
        await neteaseRequest('/api/logout');
    }
    catch {
        // 退出登录失败不阻塞本地清理
    }
    await getNeteaseSession().clearStorageData({ storages: ['cookies'] });
}
