import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#050A14',
    autoHideMenuBar: true,
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
  } else {
    const indexPath = app.isPackaged
      ? path.join(process.resourcesPath, 'out', 'renderer', 'index.html')
      : path.join(process.cwd(), 'out', 'renderer', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  return mainWindow;
}
