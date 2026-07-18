"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMainWindow = createMainWindow;
const electron_1 = require("electron");
const path = __importStar(require("node:path"));
function createMainWindow() {
    const mainWindow = new electron_1.BrowserWindow({
        width: 1320,
        height: 900,
        minWidth: 1024,
        minHeight: 680,
        backgroundColor: '#050A14',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            spellcheck: false,
        },
    });
    const rendererUrl = process.env.VITE_RENDERER_URL;
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const isAllowed = rendererUrl ? url.startsWith(rendererUrl) : url.startsWith('file://');
        if (!isAllowed) {
            event.preventDefault();
        }
    });
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
        console.error('Renderer process exited:', details.reason);
    });
    if (rendererUrl) {
        mainWindow.loadURL(rendererUrl);
    }
    else {
        const indexPath = electron_1.app.isPackaged
            ? path.join(process.resourcesPath, 'out', 'renderer', 'index.html')
            : path.join(process.cwd(), 'out', 'renderer', 'index.html');
        mainWindow.loadFile(indexPath);
    }
    return mainWindow;
}
