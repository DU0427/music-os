"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openNeteaseLoginWindow = openNeteaseLoginWindow;
const electron_1 = require("electron");
const auth_1 = require("./auth");
const http_1 = require("./http");
const LOGIN_URL = 'https://music.163.com/#/login';
const POLL_INTERVAL_MS = 1200;
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
/**
 * 打开官方登录窗口（与 Provider 共用同一持久化分区）：
 * 扫码、选择网络环境等安全验证由官方页面自己完成，登录成功（MUSIC_U 出现）后自动关窗并返回账号。
 * 这样可以避免直接调用 /api 登录接口时被服务端判定为「不支持的旧客户端」（8821）。
 */
async function openNeteaseLoginWindow(parent) {
    const neteaseSession = (0, http_1.getNeteaseSession)();
    const loginWindow = new electron_1.BrowserWindow({
        width: 520,
        height: 720,
        parent: parent ?? undefined,
        show: true,
        autoHideMenuBar: true,
        backgroundColor: '#ffffff',
        title: '登录网易云音乐',
        webPreferences: {
            partition: 'persist:music-os-netease',
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    loginWindow.setMenuBarVisibility(false);
    // 官方登录页会做一次客户端路由跳转，loadURL 常以 ERR_ABORTED(-3) 结束——此时页面其实已加载。
    void loginWindow.loadURL(LOGIN_URL).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('ERR_ABORTED')) {
            console.warn('[netease-login] loadURL failed:', message);
        }
    });
    // 官网登录是弹层：加载完成后替用户点一次「登录」，直接展示扫码界面
    loginWindow.webContents.on('did-finish-load', () => {
        setTimeout(() => {
            if (loginWindow.isDestroyed()) {
                return;
            }
            void loginWindow.webContents
                .executeJavaScript(`(() => {
             const link = Array.from(document.querySelectorAll('a, .link, span')).find((el) => (el.textContent || '').trim() === '登录');
             if (link) { link.click(); return true; }
             return false;
           })()`)
                .catch(() => undefined);
        }, 900);
    });
    return new Promise((resolve) => {
        let settled = false;
        const finish = async (account) => {
            if (settled) {
                return;
            }
            settled = true;
            clearInterval(pollTimer);
            clearTimeout(timeoutTimer);
            if (account) {
                // 给 Cookie 落盘留一点时间，避免刚登录就发请求
                await new Promise((done) => setTimeout(done, 600));
            }
            if (!loginWindow.isDestroyed()) {
                loginWindow.close();
            }
            resolve(account);
        };
        const check = async () => {
            try {
                const cookies = await neteaseSession.cookies.get({ url: 'https://music.163.com', name: 'MUSIC_U' });
                if (cookies.length > 0) {
                    const account = await (0, auth_1.fetchAccount)();
                    if (account) {
                        await finish(account);
                    }
                }
            }
            catch {
                // 轮询失败继续等待，不打断用户操作
            }
        };
        const pollTimer = setInterval(() => void check(), POLL_INTERVAL_MS);
        const timeoutTimer = setTimeout(() => void finish(null), LOGIN_TIMEOUT_MS);
        loginWindow.on('closed', () => void finish(null));
        void check();
    });
}
