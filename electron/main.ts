import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import path from 'node:path';
import { APP_IPC_CHANNELS } from './ipc/channels';
import { createMainWindow } from './windows/main-window';
import { registerAppHandlers } from './ipc/handlers';
import { openDatabase } from './database/connection';
import { MusicRepository } from './database/repositories/music-repository';
import { createProviderRegistry, ProviderRegistry } from './providers';
import type {
  ListeningHistoryRecord,
  ListeningMemoryRecord,
  PlaybackStateRecord,
  TrackRecord,
  UserWorldSettingRecord,
} from '../src/shared/ipc/music';

let mainWindow: BrowserWindow | null = null;
let handlersRegistered = false;
let musicRepository: MusicRepository | null = null;
let providerRegistry: ProviderRegistry | null = null;
let isAppClosing = false;

function requestRendererCloseFlush(windowRef: BrowserWindow) {
  return new Promise<void>((resolve) => {
    if (windowRef.isDestroyed()) {
      resolve();
      return;
    }

    let settled = false;
    let timer: NodeJS.Timeout;

    const acknowledge = () => {
      finalize();
    };
    const finalize = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      ipcMain.removeListener(APP_IPC_CHANNELS.prepareToCloseAck, acknowledge);
      resolve();
    };

    timer = setTimeout(() => {
      finalize();
    }, 700);

    ipcMain.once(APP_IPC_CHANNELS.prepareToCloseAck, acknowledge);
    try {
      windowRef.webContents.send(APP_IPC_CHANNELS.prepareToClose);
    } catch {
      finalize();
    }
  });
}

function bootstrap() {
  try {
    const windowRef = createMainWindow();
    mainWindow = windowRef;
    if (!handlersRegistered) {
      const providerRegistryPath = path.join(app.getPath('userData'), 'music-os.sqlite');
      try {
        musicRepository = new MusicRepository(openDatabase(providerRegistryPath));
      } catch (error) {
        console.warn(
          'Failed to initialize SQLite repository, using in-memory fallback:',
          (error as Error)?.message ?? error,
        );
        musicRepository = createFallbackMusicRepository();
      }
      providerRegistry = createProviderRegistry();
      registerAppHandlers(musicRepository, providerRegistry);
      handlersRegistered = true;
    }
    windowRef.on('closed', () => {
      mainWindow = null;
    });
    if (!app.isPackaged) {
      windowRef.webContents.openDevTools({ mode: 'detach' });
    }

    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "img-src 'self' data:",
      "media-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "connect-src 'self' http://127.0.0.1:5173 ws://127.0.0.1:5173",
      "font-src 'self' data:",
    ].join('; ');

    windowRef.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = {
        ...details.responseHeaders,
      };
      responseHeaders['Content-Security-Policy'] = [csp];
      callback({ responseHeaders });
    });
  } catch (error) {
    console.error('Failed to create main window:', error);
    app.quit();
  }
}

app.on('ready', () => {
  nativeTheme.themeSource = 'dark';
  bootstrap();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', (event) => {
  if (isAppClosing || !mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  event.preventDefault();
  isAppClosing = true;

  void (async () => {
    try {
      await requestRendererCloseFlush(mainWindow as BrowserWindow);
    } finally {
      app.exit(0);
    }
  })();
});

app.on('will-quit', () => {
  musicRepository?.close();
  musicRepository = null;
  providerRegistry = null;
});

app.on('activate', () => {
  if (mainWindow === null) {
    bootstrap();
  }
});

function createFallbackMusicRepository(): MusicRepository {
  const tracks = new Map<string, TrackRecord>();
  const listeningHistory: ListeningHistoryRecord[] = [];
  const listeningMemories: ListeningMemoryRecord[] = [];
  const worldSettings = new Map<string, UserWorldSettingRecord>();
  let playbackState: PlaybackStateRecord | null = null;

  return {
    listTracks() {
      return [...tracks.values()];
    },
    upsertTrack(track: TrackRecord) {
      tracks.set(track.id, { ...track });
      return track;
    },
    listListeningHistory() {
      return listeningHistory;
    },
    addListeningHistory(record: ListeningHistoryRecord) {
      listeningHistory.unshift({ ...record });
      return record;
    },
    updateListeningHistory(record: ListeningHistoryRecord) {
      const index = listeningHistory.findIndex((item) => item.id === record.id);
      if (index >= 0) {
        listeningHistory[index] = { ...record };
      } else {
        listeningHistory.unshift({ ...record });
      }
      return record;
    },
    listListeningMemories() {
      return listeningMemories;
    },
    addListeningMemory(record: ListeningMemoryRecord) {
      listeningMemories.unshift({ ...record });
      return record;
    },
    getWorldSetting(key: string) {
      return worldSettings.get(key) ?? null;
    },
    setWorldSetting(record: UserWorldSettingRecord) {
      const value: UserWorldSettingRecord = { ...record };
      worldSettings.set(record.key, value);
      return value;
    },
    getPlaybackState() {
      return playbackState;
    },
    savePlaybackState(state: PlaybackStateRecord) {
      playbackState = { ...state };
      return state;
    },
    close() {
      tracks.clear();
      listeningHistory.length = 0;
      listeningMemories.length = 0;
      worldSettings.clear();
      playbackState = null;
    },
  } as MusicRepository;
}
