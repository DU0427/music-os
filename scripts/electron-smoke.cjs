const { app, BrowserWindow, ipcMain } = require('electron');
const os = require('node:os');
const path = require('node:path');

app.setPath('userData', path.join(os.tmpdir(), 'music-os-electron-smoke'));
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let smokeWindow = null;

const smokeChannels = (() => {
  try {
    const { APP_IPC_CHANNELS } = require(path.join(process.cwd(), 'dist', 'electron', 'ipc', 'channels.js'));
    return APP_IPC_CHANNELS;
  } catch (_error) {
    return {
      ready: 'app:ready',
      ping: 'app:ping',
      error: 'app:error',
      prepareToClose: 'app:prepare-close',
      prepareToCloseAck: 'app:prepare-close-ack',
      tracksList: 'music:tracks:list',
      tracksUpsert: 'music:tracks:upsert',
      historyList: 'music:history:list',
      historyAdd: 'music:history:add',
      historyUpdate: 'music:history:update',
      memoriesList: 'music:memories:list',
      memoriesAdd: 'music:memories:add',
      worldSettingsGet: 'music:world-settings:get',
      worldSettingsSet: 'music:world-settings:set',
      playbackGet: 'music:playback:get',
      playbackSave: 'music:playback:save',
      providerSearch: 'music:provider:search',
      providerTrack: 'music:provider:track',
      providerPlayable: 'music:provider:playable-source',
    };
  }
})();

function registerSmokeFallbackHandlers() {
  const fallbackMockPlayableSource = (() => {
    const sampleRate = 22050;
    const channels = 1;
    const bitsPerSample = 16;
    const durationSeconds = 2;
    const frequencyHz = 523.25;
    const sampleCount = Math.max(1, Math.floor(sampleRate * durationSeconds));
    const blockAlign = channels * (bitsPerSample / 8);
    const dataSize = sampleCount * blockAlign;
    const buffer = Buffer.alloc(44 + dataSize);

    buffer.write('RIFF', 0, 'ascii');
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8, 'ascii');
    buffer.write('fmt ', 12, 'ascii');
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * blockAlign, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36, 'ascii');
    buffer.writeUInt32LE(dataSize, 40);

    const amplitude = 0.22 * 0x7fff;
    for (let index = 0; index < sampleCount; index += 1) {
      const time = index / sampleRate;
      const sample = Math.sin(2 * Math.PI * frequencyHz * time);
      buffer.writeInt16LE(Math.floor(sample * amplitude), 44 + index * 2);
    }

    return `data:audio/wav;base64,${buffer.toString('base64')}`;
  })();

  const fallbackMockTrack = {
    reference: { providerId: 'mock', platformTrackId: 'midnight-city-design-reference' },
    title: 'Midnight City',
    artist: { id: 'mock-m83', name: 'M83 (design reference)' },
    album: { id: 'mock-hurry-up', title: "Hurry Up, We're Dreaming (reference)", artworkUrl: null },
    durationSeconds: 2,
    artworkUrl: null,
  };

  ipcMain.handle(smokeChannels.ready, () => ({
    appName: 'Music OS Smoke',
    startedAt: new Date().toISOString(),
  }));

  ipcMain.handle(smokeChannels.ping, (_event, payload) => ({
    message: `ack:${payload.message}`,
    timestamp: new Date().toISOString(),
  }));

  ipcMain.handle(smokeChannels.error, (_event, payload) => {
    console.info('Smoke error probe:', payload?.code, payload?.detail ?? '');
    return { acknowledged: true };
  });

  let playbackState = null;
  const tracks = [];
  const listeningHistory = [];
  ipcMain.handle(smokeChannels.tracksList, () => tracks);
  ipcMain.handle(smokeChannels.tracksUpsert, (_event, track) => {
    if (track?.id) {
      const filtered = tracks.filter((candidate) => candidate.id !== track.id);
      tracks.length = 0;
      tracks.push(...filtered, track);
      return track;
    }
    return track;
  });
  ipcMain.handle(smokeChannels.historyList, () => listeningHistory);
  ipcMain.handle(smokeChannels.historyAdd, (_event, record) => {
    if (record?.id) {
      const filtered = listeningHistory.filter((candidate) => candidate.id !== record.id);
      listeningHistory.length = 0;
      listeningHistory.push(...filtered, record);
    } else if (record) {
      listeningHistory.unshift(record);
    }
    return record;
  });
  ipcMain.handle(smokeChannels.historyUpdate, (_event, record) => {
    if (record?.id) {
      const index = listeningHistory.findIndex((candidate) => candidate.id === record.id);
      if (index >= 0) {
        listeningHistory[index] = record;
      } else {
        listeningHistory.unshift(record);
      }
      return record;
    }
    return record;
  });
  ipcMain.handle(smokeChannels.memoriesList, () => []);
  ipcMain.handle(smokeChannels.memoriesAdd, (_event, record) => record);
  ipcMain.handle(smokeChannels.worldSettingsGet, () => null);
  ipcMain.handle(smokeChannels.worldSettingsSet, (_event, record) => record);
  ipcMain.handle(smokeChannels.playbackGet, () => playbackState);
  ipcMain.handle(smokeChannels.playbackSave, (_event, state) => {
    playbackState = state;
    return state;
  });
  ipcMain.handle(smokeChannels.providerSearch, () => ({ providerId: 'mock', tracks: [], query: '', source: 'mock', error: null }));
  ipcMain.handle(smokeChannels.providerTrack, (_event, payload) => ({
    providerId: payload?.providerId ?? 'mock',
    reference: {
      providerId: payload?.providerId ?? 'mock',
      platformTrackId: payload?.platformTrackId ?? '',
    },
    track:
      !payload?.providerId || payload?.providerId === 'mock'
        ? { ...fallbackMockTrack, playableSource: null }
        : null,
    error: null,
  }));
  ipcMain.handle(smokeChannels.providerPlayable, (_event, payload) => ({
    providerId: payload?.providerId ?? 'mock',
    reference: {
      providerId: payload?.providerId ?? 'mock',
      platformTrackId: payload?.platformTrackId ?? '',
    },
    playableSource:
      !payload?.providerId || payload?.providerId === 'mock'
        ? {
            url: fallbackMockPlayableSource,
            mimeType: 'audio/wav',
            expiresAt: null,
            requiresAuth: false,
            licenseStatus: 'authorized',
          }
        : null,
    error: null,
  }));

  // 网易云通道桩：smoke 不访问真实平台，返回空内容避免首页误报网络错误
  ipcMain.handle('music:netease:home', () => ({ playlists: [], toplists: [] }));
  ipcMain.handle('music:netease:playlist-tracks', () => []);
  ipcMain.handle('music:netease:qr-create', () => null);
  ipcMain.handle('music:netease:qr-poll', () => ({ status: 'waiting', account: null }));
  ipcMain.handle('music:netease:auth-status', () => ({ loggedIn: false, account: null }));
  ipcMain.handle('music:netease:logout', () => true);
}

function registerSmokeDataContracts() {
  registerSmokeFallbackHandlers();

  try {
    const { openDatabase } = require(path.join(process.cwd(), 'dist', 'electron', 'database', 'connection.js'));
    const { MusicRepository } = require(path.join(process.cwd(), 'dist', 'electron', 'database', 'repositories', 'music-repository.js'));
    const { createProviderRegistry } = require(path.join(process.cwd(), 'dist', 'electron', 'providers', 'index.js'));
    const { registerAppHandlers } = require(path.join(process.cwd(), 'dist', 'electron', 'ipc', 'handlers.js'));

    const repository = new MusicRepository(openDatabase(path.join(app.getPath('userData'), 'music-os.sqlite')));
    registerAppHandlers(repository, createProviderRegistry());
    app.on('will-quit', () => repository.close());
    console.info('Smoke using persisted data handlers from Electron app modules.');
  } catch (error) {
    console.warn('Smoke using fallback in-memory IPC handlers:', error?.message || String(error));
  }
}

function finish(code) {
  smokeWindow?.destroy();
  app.exit(code);
}

app.whenReady().then(async () => {
  registerSmokeDataContracts();

  let preloadError = null;
  let consoleMessages = [];
  let failedLoad = null;
  let renderProcessGone = null;
  let prepareToCloseAcked = false;
  const closeFlushRequested =
    typeof smokeChannels?.prepareToClose === 'string' &&
    typeof smokeChannels?.prepareToCloseAck === 'string';

  smokeWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(process.cwd(), 'dist/electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  smokeWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    preloadError = {
      preloadPath,
      message: error?.message || String(error),
    };
  });

  smokeWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    consoleMessages.push({
      level,
      message,
      line,
      sourceId,
    });
  });

  smokeWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      failedLoad = {
        errorCode,
        errorDescription,
        validatedURL,
      };
    }
  });

  smokeWindow.webContents.on('render-process-gone', (_event, details) => {
    renderProcessGone = details.reason;
  });

  try {
    await smokeWindow.loadFile(path.join(process.cwd(), 'out/renderer/index.html'));
    await new Promise((resolve) => {
      let done = false;
      const finishWait = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };

      const timeout = setTimeout(() => {
        finishWait();
      }, 2000);

      smokeWindow.webContents.once('dom-ready', () => {
        clearTimeout(timeout);
        finishWait();
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 700));

    const result = await smokeWindow.webContents.executeJavaScript(`
      (async () => {
        const hasCanvas = Boolean(document.querySelector('canvas'));
        const webglFallback = Boolean(
          document.body && document.body.innerText.includes('WebGL is unavailable in this environment.')
        );
        const audioInput = Boolean(document.querySelector('input[type="file"]'));
        const title = document.title;
        const bodyText = document.body ? document.body.innerText : '';
        const readAudioSessionDebug = () => {
          const sessionNode = document.getElementById('audio-session-debug');
          if (!sessionNode) {
            return null;
          }
          const activeHistoryElapsedSeconds = Number(sessionNode.dataset?.activeHistoryElapsedSeconds ?? 0);
          const currentTime = Number(sessionNode.dataset?.currentTime ?? 0);
          const duration = Number(sessionNode.dataset?.duration ?? 0);
          return {
            activeHistoryId: sessionNode.dataset?.activeHistoryId || null,
            activeHistoryTrackId: sessionNode.dataset?.activeHistoryTrackId || null,
            activeHistoryStartedAt: sessionNode.dataset?.activeHistoryStartedAt || null,
            activeHistoryElapsedSeconds: Number.isFinite(activeHistoryElapsedSeconds)
              ? activeHistoryElapsedSeconds
              : 0,
            currentTrackId: sessionNode.dataset?.currentTrackId || null,
            currentSpace: sessionNode.dataset?.currentSpace || '',
            canEnterMidnight: sessionNode.dataset?.canEnterMidnight === '1',
            hasTrack: sessionNode.dataset?.hasTrack === '1',
            isTransitioning: sessionNode.dataset?.isTransitioning === '1',
            status: sessionNode.dataset?.status || '',
            trackId: sessionNode.dataset?.trackId || null,
            providerId: sessionNode.dataset?.trackProviderId || null,
            canPlay: sessionNode.dataset?.canPlay === '1',
            isPlaying: sessionNode.dataset?.isPlaying === '1',
            currentTime: Number.isFinite(currentTime) ? currentTime : 0,
            duration: Number.isFinite(duration) ? duration : 0,
          };
        };
        const readCurrentSpace = () => {
          const sessionState = readAudioSessionDebug();
          if (sessionState?.currentSpace) {
            return sessionState.currentSpace.toLowerCase();
          }
          const match = /Current Space:\\s*([^\\n\\r]+)/i.exec(bodyText);
          return match?.[1]?.trim().toLowerCase() || '';
        };
        const homeState = readCurrentSpace() === 'home';
        const shellVisible = Boolean(document.getElementById('root'));
        const apiType = typeof window.musicOS;
        const reportErrorAvailable = Boolean(window.musicOS && typeof window.musicOS.reportError === 'function');
        const hasTrackList = Boolean(window.musicOS && typeof window.musicOS.listTracks === 'function');
        const hasTrackUpsert = Boolean(window.musicOS && typeof window.musicOS.upsertTrack === 'function');
        const hasGetPlaybackState = Boolean(window.musicOS && typeof window.musicOS.getPlaybackState === 'function');
        const hasSavePlaybackState = Boolean(window.musicOS && typeof window.musicOS.savePlaybackState === 'function');
        const hasListeningHistory = Boolean(
          window.musicOS &&
          typeof window.musicOS.addListeningHistory === 'function' &&
          typeof window.musicOS.updateListeningHistory === 'function' &&
          typeof window.musicOS.listListeningHistory === 'function',
        );
        const hasHistoryUpdate = Boolean(window.musicOS && typeof window.musicOS.updateListeningHistory === 'function');
        const hasHistoryAdd = Boolean(window.musicOS && typeof window.musicOS.addListeningHistory === 'function');
        const hasHistoryList = Boolean(window.musicOS && typeof window.musicOS.listListeningHistory === 'function');
        const hasProviderSearch = Boolean(window.musicOS && typeof window.musicOS.searchMusic === 'function');
        const hasProviderTrack = Boolean(window.musicOS && typeof window.musicOS.getProviderTrack === 'function');
        const hasProviderPlayableSource = Boolean(
          window.musicOS && typeof window.musicOS.getProviderPlayableSource === 'function',
        );
        const hasPrepareToCloseListener = Boolean(
          window.musicOS && typeof window.musicOS.onPrepareToClose === 'function',
        );

        if (apiType !== 'object' || window.musicOS == null) {
          return {
            apiType,
            bodyText: bodyText.slice(0, 220),
            canvas: hasCanvas,
            audioInput,
            hasPrepareToCloseListener,
            reportErrorAvailable,
            title,
            homeState,
            shellVisible,
            webglFallback,
          };
        }

        let ready = null;
        let ping = null;
        let reportErrorAcknowledged = null;
        let playbackStateReadable = false;
        let playbackStateWritable = false;
        let trackListReadable = false;
        let trackDurationMetadataRoundTrip = false;
        let listeningHistoryRoundTrip = false;
        let audioSessionReadable = false;
        let audioSessionState = null;
        let providerSearchContracts = false;
        let tracksForHistory = [];
        try {
          ready = await window.musicOS.ready();
        } catch (error) {
          return {
            apiType,
            bodyText: bodyText.slice(0, 220),
            readyError: error?.message || String(error),
            canvas: hasCanvas,
            audioInput,
            hasPrepareToCloseListener,
            title,
            homeState,
            shellVisible,
            webglFallback,
          };
        }

        try {
          ping = await window.musicOS.ping('electron-smoke');
        } catch (error) {
          return {
            apiType,
            bodyText: bodyText.slice(0, 220),
            ready,
            pingError: error?.message || String(error),
            canvas: hasCanvas,
            audioInput,
            title,
            homeState,
            shellVisible,
            webglFallback,
          };
        }

        try {
          reportErrorAcknowledged = await window.musicOS.reportError({
            code: 'smoke_probe',
            detail: 'smoke contract check',
          });
        } catch {
          reportErrorAcknowledged = null;
        }
        try {
          if (hasTrackList) {
            tracksForHistory = await window.musicOS.listTracks();
            trackListReadable =
              Array.isArray(tracksForHistory) &&
              tracksForHistory.every(
                (track) =>
                  track &&
                  typeof track.id === 'string' &&
                  typeof track.title === 'string' &&
                  typeof track.artist === 'string' &&
                  (track.album === null || typeof track.album === 'string') &&
                  (typeof track.durationSeconds === 'number' || track.durationSeconds === null) &&
                  (track.worldContext === null || typeof track.worldContext === 'object'),
              );
            const durationSeed =
              'smoke-duration-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
            const seededTrack = {
              id: durationSeed,
              title: 'Smoke Duration Verification',
              artist: 'Music OS',
              album: null,
              source: null,
              durationSeconds: 0,
              createdAt: new Date().toISOString(),
              artworkUrl: null,
              providerId: 'mock',
              providerTrackId: null,
              worldContext: null,
            };
            await window.musicOS.upsertTrack(seededTrack);
            const expectedDurationSeconds = 180;
            await window.musicOS.upsertTrack({ ...seededTrack, durationSeconds: expectedDurationSeconds });
            const durationRows = await window.musicOS.listTracks();
            const persistedTrack = Array.isArray(durationRows)
              ? durationRows.find((track) => track?.id === durationSeed)
              : null;
            trackDurationMetadataRoundTrip =
              persistedTrack !== null && persistedTrack.durationSeconds === expectedDurationSeconds;
          }
          audioSessionState = readAudioSessionDebug();
          audioSessionReadable =
            audioSessionState !== null &&
            typeof audioSessionState.activeHistoryElapsedSeconds === 'number' &&
            audioSessionState.activeHistoryElapsedSeconds >= 0;

          if (hasListeningHistory && hasTrackUpsert) {
            let historyTrackId = null;
            const historySeedBase = new Date().getTime() + '-' + Math.random().toString(36).slice(2, 8);
            if (Array.isArray(tracksForHistory) && tracksForHistory.length > 0 && tracksForHistory[0]?.id) {
              historyTrackId = tracksForHistory[0].id;
            } else {
              const seededTrackId = 'smoke-track-' + historySeedBase;
              const now = new Date().toISOString();
              await window.musicOS.upsertTrack({
                id: seededTrackId,
                title: 'Smoke World Verification',
                artist: 'Music OS',
                album: null,
                source: null,
                durationSeconds: 180,
                createdAt: now,
                artworkUrl: null,
                providerId: 'mock',
                providerTrackId: null,
                worldContext: null,
              });
              historyTrackId = seededTrackId;
            }

            const seedId = 'smoke-history-' + historySeedBase;
            const baseHistory = {
              id: seedId,
              trackId: historyTrackId,
              startedAt: new Date(Date.now() - 15000).toISOString(),
              endedAt: null,
              durationSeconds: 0,
            };
            const addedHistory = await window.musicOS.addListeningHistory(baseHistory);
            const updatedHistory = {
              ...addedHistory,
              endedAt: new Date().toISOString(),
              durationSeconds: 42,
            };
            await window.musicOS.updateListeningHistory(updatedHistory);
            const historyRows = await window.musicOS.listListeningHistory();
            const foundHistory = Array.isArray(historyRows)
              ? historyRows.find((record) => record?.id === seedId)
              : null;
            listeningHistoryRoundTrip =
              foundHistory !== null &&
              foundHistory?.trackId === updatedHistory.trackId &&
              foundHistory?.endedAt === updatedHistory.endedAt &&
              foundHistory?.durationSeconds === updatedHistory.durationSeconds;
          }

          if (hasGetPlaybackState) {
            const playbackState = await window.musicOS.getPlaybackState();
            playbackStateReadable =
              playbackState === null ||
              (playbackState !== null &&
                typeof playbackState.trackId !== 'undefined' &&
                typeof playbackState.positionSeconds === 'number' &&
                typeof playbackState.isPlaying === 'boolean' &&
                typeof playbackState.updatedAt === 'string');
          }

          if (hasSavePlaybackState && hasGetPlaybackState) {
            const now = new Date().toISOString();
            const candidate = { trackId: null, positionSeconds: 0, isPlaying: false, updatedAt: now };
            await window.musicOS.savePlaybackState(candidate);
            const saved = await window.musicOS.getPlaybackState();
          playbackStateWritable =
            saved !== null &&
            saved.trackId === candidate.trackId &&
            saved.positionSeconds === candidate.positionSeconds &&
            saved.isPlaying === candidate.isPlaying;
          }

        if (hasProviderSearch && hasProviderTrack && hasProviderPlayableSource) {
            const providerResult = await window.musicOS.searchMusic('midnight', 'mock');
            const tracks = Array.isArray(providerResult?.tracks) ? providerResult.tracks : [];
            const firstTrack = tracks[0];
            if (firstTrack?.reference) {
              const trackResult = await window.musicOS.getProviderTrack(firstTrack.reference);
              const playableResult = await window.musicOS.getProviderPlayableSource(firstTrack.reference);
              const hasPlayableSource =
                playableResult?.error === null && typeof playableResult?.playableSource?.url === 'string';

              providerSearchContracts =
                providerResult?.error === null &&
                firstTrack.reference.providerId === 'mock' &&
                trackResult.providerId === 'mock' &&
                trackResult.error === null &&
                trackResult.track !== null &&
                trackResult.reference?.platformTrackId === firstTrack.reference.platformTrackId &&
                playableResult.providerId === 'mock' &&
                playableResult.reference?.platformTrackId === firstTrack.reference.platformTrackId &&
                hasPlayableSource;
            } else {
              const trackResult = await window.musicOS.getProviderTrack({
                providerId: 'mock',
                platformTrackId: 'midnight-city-design-reference',
              });
              const playableResult = await window.musicOS.getProviderPlayableSource({
                providerId: 'mock',
                platformTrackId: 'midnight-city-design-reference',
              });
              const hasPlayableSource =
                playableResult?.error === null && typeof playableResult?.playableSource?.url === 'string';
              providerSearchContracts =
                trackResult.providerId === 'mock' &&
                trackResult.error === null &&
                trackResult.track !== null &&
                hasPlayableSource;
            }
          } else {
            providerSearchContracts = false;
          }
        } catch {
          playbackStateReadable = false;
          playbackStateWritable = false;
          trackListReadable = false;
          trackDurationMetadataRoundTrip = false;
          listeningHistoryRoundTrip = false;
          providerSearchContracts = false;
        }

        return {
          apiType,
          bodyText: bodyText.slice(0, 220),
          reportErrorAvailable,
          reportErrorAcknowledged,
          hasHistoryAdd,
          hasHistoryUpdate,
          hasHistoryList,
          audioSessionReadable,
          audioSessionState,
          listeningHistoryRoundTrip,
          trackDurationMetadataRoundTrip,
          trackListReadable,
          playbackStateReadable,
          playbackStateWritable,
          listeningHistoryApiAvailable: hasListeningHistory,
          providerSearchContracts,
          hasPrepareToCloseListener,
          ready,
          ping,

          canvas: hasCanvas,
          audioInput,
          title,
          homeState,
          shellVisible,
          webglFallback,
        };
})()
    `);

    const transitionResult = await smokeWindow.webContents.executeJavaScript(`
      (async () => {
        const waitFor = async (condition, timeoutMs, intervalMs) => {
          const start = Date.now();
          while (Date.now() - start <= timeoutMs) {
            if (condition()) {
              return true;
            }
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
          }
          return false;
        };

        const startFrameSampler = () => {
          const samples = [];
          let lastTs = null;
          let stopped = false;
          const tick = (timestamp) => {
            if (lastTs !== null) {
              const delta = timestamp - lastTs;
              if (Number.isFinite(delta) && delta >= 0) {
                samples.push(delta);
              }
            }
            lastTs = timestamp;
            if (!stopped) {
              requestAnimationFrame(tick);
            }
          };
          requestAnimationFrame(tick);
          return {
            stop: () => {
              stopped = true;
            },
            getSamples: () => samples.slice(),
          };
        };

        const readBodyText = () => (document.body ? document.body.innerText : '');
        const readSessionState = () => {
          const sessionNode = document.getElementById('audio-session-debug');
          if (!sessionNode) {
            return null;
          }
          return {
            currentSpace: sessionNode.dataset?.currentSpace || '',
            isTransitioning: sessionNode.dataset?.isTransitioning === '1',
          };
        };
        const readCurrentSpace = () => {
          const sessionState = readSessionState();
          if (sessionState?.currentSpace) {
            return sessionState.currentSpace.trim().toLowerCase();
          }
          const match = /Current Space:\\s*([^\\n\\r]+)/i.exec(readBodyText());
          return match?.[1]?.trim().toLowerCase() || '';
        };
        const isIdle = () => {
          const sessionState = readSessionState();
          if (sessionState) {
            return !sessionState.isTransitioning;
          }
          return !readBodyText().toLowerCase().includes('transitioning');
        };

        const beforeText = readBodyText();
        if (readCurrentSpace() !== 'home') {
          return {
            beforeText: beforeText.slice(0, 220),
            beforeDetected: false,
          };
        }

window.dispatchEvent(
          new CustomEvent('music-os-set-space', {
            detail: 'library',
          }),
        );

        await new Promise((resolve) => setTimeout(resolve, 120));
        window.dispatchEvent(
          new CustomEvent('music-os-set-space', {
            detail: 'home',
          }),
        );

        const conflictIgnored = await waitFor(() => readCurrentSpace() === 'library', 900, 80);

        // 在 library 空间挂载期捕获断言（返回 home 后这些元素会卸载）
        const afterDetected = conflictIgnored && readCurrentSpace() === 'library';
        const libraryWorldVisible = Boolean(document.querySelector('[data-testid="library-world"]'));

        const afterTransitionText = (await waitFor(
          () => readCurrentSpace() === 'library',
          2500,
          100,
        ))
          ? readBodyText()
          : readBodyText();
        const transitionSettleDetected = await waitFor(isIdle, 2200, 100);

        if (!transitionSettleDetected) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        const returnRetryUntilHome = async () => {
          const start = Date.now();
          const timeoutMs = 4000;
          while (Date.now() - start <= timeoutMs) {
            if (isIdle()) {
              window.dispatchEvent(
                new CustomEvent('music-os-set-space', {
                  detail: 'home',
                }),
              );
            }
            if (readCurrentSpace() === 'home') {
              return true;
            }
            await new Promise((resolve) => setTimeout(resolve, 120));
          }
          return false;
        };

        const afterReturnDetected = await returnRetryUntilHome();
        const repeatedTransitionHealthy = await (async () => {
          const cycleCount = 5;
          const cycleResults = [];

          const runCycleStep = async (cycle, targetSpace) => {
            await waitFor(isIdle, 2200, 80);
            const beforeText = readBodyText().slice(0, 220);

            window.dispatchEvent(
              new CustomEvent('music-os-set-space', {
                detail: targetSpace,
              }),
            );

            const reachedTarget = await waitFor(() => {
              return readCurrentSpace() === targetSpace;
            }, 3400, 80);

            const settled = await waitFor(isIdle, 3400, 80);

            const afterText = readBodyText().slice(0, 220);
            cycleResults.push({
              cycle,
              targetSpace,
              beforeText,
              afterText,
              reachedTarget,
              settled,
              transitionSpace: readCurrentSpace(),
              transitionText: readBodyText().toLowerCase().includes('transitioning'),
            });

            return reachedTarget && settled;
          };

for (let cycle = 0; cycle < cycleCount; cycle += 1) {
            if (!(await runCycleStep(cycle, 'library'))) {
              return { ok: false, cycleResults };
            }
            if (!(await runCycleStep(cycle, 'home'))) {
              return { ok: false, cycleResults };
            }
          }

          return { ok: true, cycleResults };
        })();

        const afterText = readBodyText();

return {
          beforeDetected: true,
          afterDetected,
          conflictIgnored,
          libraryWorldVisible,
          beforeText: beforeText.slice(0, 220),
          afterText: afterText.slice(0, 260),
          afterReturnDetected,
          repeatedTransitionHealthy: repeatedTransitionHealthy.ok === true,
          repeatedTransitionDiagnostic: repeatedTransitionHealthy,
        };
      })()
    `);
        const playbackStressResult = await smokeWindow.webContents.executeJavaScript(`
      (async () => {
        const readAudioSessionDebug = () => {
          const sessionNode = document.getElementById('audio-session-debug');
          if (!sessionNode) {
            return null;
          }
          const currentTime = Number(sessionNode.dataset?.currentTime ?? 0);
          const duration = Number(sessionNode.dataset?.duration ?? 0);
          const currentSpace = sessionNode.dataset?.currentSpace || '';
          return {
            currentSpace: currentSpace.toLowerCase(),
            trackId: sessionNode.dataset?.trackId || null,
            canPlay: sessionNode.dataset?.canPlay === '1',
            isPlaying: sessionNode.dataset?.isPlaying === '1',
            currentTime: Number.isFinite(currentTime) ? currentTime : 0,
            duration: Number.isFinite(duration) ? duration : 0,
          };
        };

        const readCurrentSpace = () => {
          const session = readAudioSessionDebug();
          if (session?.currentSpace) {
            return session.currentSpace;
          }
          const text = readBodyText();
          const match = /Current Space:\\s*([^\\n\\r]+)/i.exec(text);
          return match?.[1]?.trim().toLowerCase() || '';
        };

        const waitFor = async (condition, timeoutMs, intervalMs) => {
          const start = Date.now();
          while (Date.now() - start <= timeoutMs) {
            if (condition()) {
              return true;
            }
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
          }
          return false;
        };

        const createWavBlob = () => {
          const sampleRate = 22050;
          const durationSeconds = 30;
          const frequency = 440;
          const sampleCount = Math.floor(sampleRate * durationSeconds);
          const bytesPerSample = 2;
          const frameCount = sampleCount;
          const byteRate = sampleRate * bytesPerSample;
          const dataLength = frameCount * bytesPerSample;
          const buffer = new ArrayBuffer(44 + dataLength);
          const writer = new DataView(buffer);
          const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i += 1) {
              writer.setUint8(offset + i, string.charCodeAt(i));
            }
          };

          writeString(0, 'RIFF');
          writer.setUint32(4, 36 + dataLength, true);
          writeString(8, 'WAVE');
          writeString(12, 'fmt ');
          writer.setUint32(16, 16, true);
          writer.setUint16(20, 1, true);
          writer.setUint16(22, 1, true);
          writer.setUint32(24, sampleRate, true);
          writer.setUint32(28, byteRate, true);
          writer.setUint16(32, bytesPerSample, true);
          writer.setUint16(34, 16, true);
          writeString(36, 'data');
          writer.setUint32(40, dataLength, true);

          const dataViewOffset = 44;
          for (let i = 0; i < frameCount; i += 1) {
            const time = i / sampleRate;
            const sampleValue = Math.sin(2 * Math.PI * frequency * time);
            const amplitude = Math.floor(sampleValue * 0x4fff);
            writer.setInt16(dataViewOffset + i * bytesPerSample, amplitude, true);
          }
          return new Blob([buffer], { type: 'audio/wav' });
        };

        const readBodyText = () => (document.body ? document.body.innerText : '');
        const readHeap = () => {
          const memory = typeof performance !== 'undefined' && performance ? performance.memory : null;
          if (!memory || typeof memory.usedJSHeapSize !== 'number') {
            return null;
          }
          return {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
          };
        };
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const startFrameSampler = () => {
          const samples = [];
          let lastTs = null;
          let stopped = false;
          const tick = (timestamp) => {
            if (lastTs !== null) {
              const delta = timestamp - lastTs;
              if (Number.isFinite(delta) && delta >= 0) {
                samples.push(delta);
              }
            }
            lastTs = timestamp;
            if (!stopped) {
              requestAnimationFrame(tick);
            }
          };
          requestAnimationFrame(tick);
          return {
            stop: () => {
              stopped = true;
            },
            getSamples: () => samples.slice(),
          };
        };
        const longRunCycleCount = 6;
        const cycleDiagnostics = [];
        const cycleHeapDiagnostics = [];
        const initialHeap = readHeap();
        const heapSupported = Boolean(initialHeap);
        const startMainThreadProbe = () => {
          if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
            return {
              stop: () => {},
              getSamples: () => [],
            };
          }

          const sampleMs = 30;
          let lastSampleAt = null;
          let timer = null;
          let stopped = false;
          const drifts = [];

          const tick = () => {
            if (stopped) {
              return;
            }
            const now = performance.now();
            if (lastSampleAt !== null) {
              const expected = lastSampleAt + sampleMs;
              const driftMs = Math.max(0, now - expected);
              if (Number.isFinite(driftMs) && driftMs >= 0) {
                drifts.push(driftMs);
              }
            }
            lastSampleAt = now;
            timer = window.setTimeout(tick, sampleMs);
          };

          timer = window.setTimeout(tick, sampleMs);
          return {
            stop: () => {
              stopped = true;
              if (timer !== null) {
                window.clearTimeout(timer);
              }
            },
            getSamples: () => drifts.slice(),
          };
        };

        const frameSampler = startFrameSampler();
        const mainThreadProbe = startMainThreadProbe();

        const input = document.querySelector('input[type="file"]');
        if (!input) {
          return { ok: false, reason: 'file-input-not-found', cycleDiagnostics };
        }

const candidateTrackButtons = Array.from(document.querySelectorAll('button')).filter((button) => {
          const label = button.getAttribute('aria-label');
          const text = button.textContent?.trim();
          return label === '播放' || label === '暂停' || text === '▶' || text === '‖';
        });
        const playButton = candidateTrackButtons[0];
        if (!playButton) {
          return { ok: false, reason: 'play-button-not-found', cycleDiagnostics };
        }

        if (readCurrentSpace() !== 'home') {
          return { ok: false, reason: 'not-on-home-space', cycleDiagnostics };
        }

        try {
          const blob = createWavBlob();
          const file = new File([blob], 'smoke-tone.wav', {
            type: 'audio/wav',
            lastModified: Date.now(),
          });
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        } catch (error) {
          return {
            ok: false,
            reason: 'file-injection-failed',
            error: error?.message || String(error),
            cycleDiagnostics,
          };
        }

        const loaded = await waitFor(() => {
          const state = readAudioSessionDebug();
          return Boolean(
            state && state.trackId && state.canPlay && state.duration > 0.5 && !state.isPlaying,
          );
        }, 5000, 80);

        if (!loaded) {
          return {
            ok: false,
            reason: 'load-not-ready',
            debugState: readAudioSessionDebug(),
            cycleDiagnostics,
          };
        }

        for (let cycle = 0; cycle < longRunCycleCount; cycle += 1) {
          const before = readAudioSessionDebug();
          const beforeHeap = readHeap();
          const baselineTime = before?.currentTime ?? 0;
          playButton.click();
          const played = await waitFor(() => {
            const state = readAudioSessionDebug();
            return (
              state &&
              state.isPlaying &&
              Number.isFinite(state.currentTime) &&
              state.currentTime > baselineTime + 0.06
            );
          }, 4200, 120);
          await wait(200);

          const stateBeforePause = readAudioSessionDebug();
          playButton.click();
          const paused = await waitFor(() => {
            const state = readAudioSessionDebug();
            return state && !state.isPlaying;
          }, 4200, 120);
          const after = readAudioSessionDebug();
          const afterHeap = readHeap();
          if (heapSupported) {
            cycleHeapDiagnostics.push({
              cycle,
              beforeHeap,
              afterHeap,
            });
          }

          cycleDiagnostics.push({
            cycle,
            before,
            played,
            stateBeforePause,
            paused,
            advancedBy: Number.isFinite(stateBeforePause?.currentTime)
              ? Number((stateBeforePause.currentTime - baselineTime).toFixed(4))
              : null,
            after,
          });

          if (!played || !paused) {
            return { ok: false, reason: 'cycle-' + cycle + '-failed', cycleDiagnostics };
          }

          await wait(180);
        }

        frameSampler.stop();
        mainThreadProbe.stop();
        const frameSamples = frameSampler.getSamples();
        const frameStats = (() => {
          const valid = frameSamples.filter((value) => Number.isFinite(value) && value > 0);
          if (!valid.length) {
            return {
              sampleCount: 0,
              frameProfilerSupported: false,
              frameStabilityOk: null,
              avgMs: null,
              maxMs: null,
              p95Ms: null,
            };
          }
          const sorted = [...valid].sort((a, b) => a - b);
          const avgMs = valid.reduce((sum, current) => sum + current, 0) / valid.length;
          const maxMs = sorted[sorted.length - 1];
          const p95Index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * 0.95)));
          const p95Ms = sorted[p95Index];
          const frameProfilerSupported = valid.length >= 20;
          const frameStabilityOk =
            valid.length >= 20 &&
            avgMs <= 180 &&
            p95Ms <= 450 &&
            maxMs <= 1500;
          return {
            sampleCount: valid.length,
            frameProfilerSupported,
            frameStabilityOk,
            avgMs,
            maxMs,
            p95Ms,
          };
        })();
        const eventLoopSamples = mainThreadProbe.getSamples();
        const eventLoopStats = (() => {
          const valid = eventLoopSamples.filter((value) => Number.isFinite(value) && value >= 0);
          if (!valid.length) {
            return {
              supported: false,
              sampleCount: 0,
              loopHealthOk: null,
              avgDriftMs: null,
              p95DriftMs: null,
              maxDriftMs: null,
            };
          }
          const sorted = [...valid].sort((a, b) => a - b);
          const avgDriftMs = valid.reduce((sum, value) => sum + value, 0) / valid.length;
          const maxDriftMs = sorted[sorted.length - 1];
          const p95Index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * 0.95)));
          const p95DriftMs = sorted[p95Index];
          const loopHealthOk =
            valid.length >= 30 &&
            avgDriftMs <= 18 &&
            p95DriftMs <= 80 &&
            maxDriftMs <= 300;
          return {
            supported: true,
            sampleCount: valid.length,
            loopHealthOk,
            avgDriftMs,
            p95DriftMs,
            maxDriftMs,
          };
        })();

        const finalHeap = readHeap();
        const heapBytesFromHeap = (initialHeap && finalHeap)
          ? finalHeap.usedJSHeapSize - initialHeap.usedJSHeapSize
          : null;
        const maxHeapBytes = heapSupported
          ? [
              ...(initialHeap ? [initialHeap.usedJSHeapSize] : []),
              ...cycleHeapDiagnostics.flatMap((entry) => {
                const values = [];
                if (entry.beforeHeap?.usedJSHeapSize) {
                  values.push(entry.beforeHeap.usedJSHeapSize);
                }
                if (entry.afterHeap?.usedJSHeapSize) {
                  values.push(entry.afterHeap.usedJSHeapSize);
                }
                return values;
              }),
              ...(finalHeap?.usedJSHeapSize ? [finalHeap.usedJSHeapSize] : []),
            ].reduce((max, value) => (Number.isFinite(value) ? Math.max(max, value) : max), initialHeap.usedJSHeapSize)
          : null;
        const heapStabilityOk = heapSupported && Number.isFinite(maxHeapBytes) && Number.isFinite(initialHeap.usedJSHeapSize)
          ? maxHeapBytes - initialHeap.usedJSHeapSize <= 64 * 1024 * 1024
          : null;

        const finalState = readAudioSessionDebug();
        return {
          ok: true,
          cycleCount: longRunCycleCount,
          allCyclesAdvanced:
            cycleDiagnostics.length === longRunCycleCount &&
            cycleDiagnostics.every((entry) => Number(entry.advancedBy) > 0.02),
          finalState,
          cycleDiagnostics,
          heapSupported,
          heapBytesFromStart: heapBytesFromHeap,
          heapBytesMax: maxHeapBytes,
          heapStabilityOk,
          eventLoopStats,
          frameStats,
          heapSamples: heapSupported
            ? {
                initialHeap,
                finalHeap,
                cycleHeapDiagnostics,
              }
            : null,
        };
      })()
    `);
if (playbackStressResult?.finalState) {
      result.audioSessionState = playbackStressResult.finalState;
    }

    // 音频压力测试完成后才触发 prepareToClose（renderer 会 dispose AudioEngine）
    if (closeFlushRequested && result?.apiType === 'object' && result?.hasPrepareToCloseListener) {
      prepareToCloseAcked = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 1200);

        ipcMain.once(smokeChannels.prepareToCloseAck, () => {
          clearTimeout(timeout);
          resolve(true);
        });

        try {
          smokeWindow.webContents.send(smokeChannels.prepareToClose);
        } catch {
          clearTimeout(timeout);
          resolve(false);
        }
      });
      result.prepareToCloseAcked = prepareToCloseAcked;
    } else {
      result.prepareToCloseAcked = false;
    }

    console.log(
      JSON.stringify({
        result,
        transitionResult,
        playbackStressResult,
        preloadError,
        failedLoad,
        renderProcessGone,
        consoleMessages,
      }),
    );
    const hasCspWarning = consoleMessages.some((entry) =>
      (entry.message || '').includes('Insecure Content-Security-Policy'),
    );
    finish(
      result?.apiType === 'object' &&
        result?.reportErrorAvailable &&
        result?.reportErrorAcknowledged?.acknowledged === true &&
        (result.canvas || result.webglFallback) &&
        result.audioInput &&
        result?.trackListReadable &&
        result?.trackDurationMetadataRoundTrip &&
        result?.audioSessionReadable &&
        result?.playbackStateReadable &&
        result?.playbackStateWritable &&
        result?.listeningHistoryApiAvailable &&
        result?.listeningHistoryRoundTrip &&
        result?.audioSessionState?.canPlay === true &&
        result?.hasPrepareToCloseListener &&
        result?.prepareToCloseAcked &&
        result?.hasHistoryUpdate &&
        result?.hasHistoryAdd &&
        result?.hasHistoryList &&
        result?.providerSearchContracts &&
        result.shellVisible &&
        result.homeState &&
        result.ping &&
        result.ping.message === 'ack:electron-smoke' &&
        transitionResult?.beforeDetected &&
        transitionResult?.afterDetected &&
        transitionResult?.conflictIgnored &&
transitionResult?.repeatedTransitionHealthy &&
        transitionResult?.afterReturnDetected &&
        transitionResult?.libraryWorldVisible &&
        (playbackStressResult?.frameStats?.frameProfilerSupported === false || playbackStressResult?.frameStats?.frameStabilityOk === true) &&
        playbackStressResult?.ok === true &&
        playbackStressResult?.cycleCount >= 6 &&
        playbackStressResult?.allCyclesAdvanced === true &&
        (playbackStressResult?.heapSupported === false || playbackStressResult?.heapStabilityOk === true) &&
        (playbackStressResult?.eventLoopStats?.supported === false || playbackStressResult?.eventLoopStats?.loopHealthOk === true) &&
        !hasCspWarning &&
        !preloadError &&
        !failedLoad &&
        !renderProcessGone
          ? 0
          : 1,
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        error: error?.message || String(error),
        preloadError,
        failedLoad,
        renderProcessGone,
        consoleMessages,
      }),
    );
    console.error(error);
    finish(1);
  }
});

