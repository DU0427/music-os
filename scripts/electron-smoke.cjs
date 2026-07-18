const { app, BrowserWindow, ipcMain } = require('electron');
const os = require('node:os');
const path = require('node:path');

app.setPath('userData', path.join(os.tmpdir(), 'music-os-electron-smoke'));
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

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
    track: null,
    error: null,
  }));
  ipcMain.handle(smokeChannels.providerPlayable, (_event, payload) => ({
    providerId: payload?.providerId ?? 'mock',
    reference: {
      providerId: payload?.providerId ?? 'mock',
      platformTrackId: payload?.platformTrackId ?? '',
    },
    playableSource: null,
    error: null,
  }));
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
        const homeState = Boolean(bodyText.includes('Current Space: home'));
        const shellVisible = Boolean(bodyText.includes('Music OS Desktop Shell'));
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
        const readAudioSessionDebug = () => {
          const sessionNode = document.getElementById('audio-session-debug');
          if (!sessionNode) {
            return null;
          }
          const elapsedSeconds = Number(sessionNode.dataset?.activeHistoryElapsedSeconds ?? 0);
          return {
            activeHistoryId: sessionNode.dataset?.activeHistoryId || null,
            activeHistoryTrackId: sessionNode.dataset?.activeHistoryTrackId || null,
            activeHistoryStartedAt: sessionNode.dataset?.activeHistoryStartedAt || null,
            activeHistoryElapsedSeconds: Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0,
          };
        };

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
            const hasPlayableSupport = providerResult?.providerId === 'mock' ? false : true;
            if (firstTrack?.reference) {
              const trackResult = await window.musicOS.getProviderTrack(firstTrack.reference);
              const playableResult = await window.musicOS.getProviderPlayableSource(firstTrack.reference);
              const playableSupported =
                playableResult?.error === null ||
                (hasPlayableSupport && playableResult?.error?.code === 'AUTH_REQUIRED') ||
                (!hasPlayableSupport && playableResult?.error?.code === 'NOT_IMPLEMENTED');

              providerSearchContracts =
                providerResult?.error === null &&
                firstTrack.reference.providerId === 'mock' &&
                trackResult.providerId === 'mock' &&
                trackResult.error === null &&
                trackResult.reference?.platformTrackId === firstTrack.reference.platformTrackId &&
                playableResult.providerId === 'mock' &&
                playableResult.reference?.platformTrackId === firstTrack.reference.platformTrackId &&
                playableSupported;
            } else {
              const trackResult = await window.musicOS.getProviderTrack({
                providerId: 'mock',
                platformTrackId: 'midnight-city-design-reference',
              });
              const playableResult = await window.musicOS.getProviderPlayableSource({
                providerId: 'mock',
                platformTrackId: 'midnight-city-design-reference',
              });
              providerSearchContracts =
                trackResult.providerId === 'mock' &&
                trackResult.error === null &&
                (playableResult?.error === null ||
                  playableResult?.error?.code === 'NOT_IMPLEMENTED');
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

        const readBodyText = () => (document.body ? document.body.innerText : '');

        const beforeText = readBodyText();
        if (!beforeText.includes('Current Space: home')) {
          return {
            beforeText: beforeText.slice(0, 220),
            beforeDetected: false,
          };
        }

        window.dispatchEvent(
          new CustomEvent('music-os-set-space', {
            detail: 'midnight',
          }),
        );

        await new Promise((resolve) => setTimeout(resolve, 120));
        window.dispatchEvent(
          new CustomEvent('music-os-set-space', {
            detail: 'home',
          }),
        );

        const conflictIgnored = await waitFor(() => readBodyText().includes('Current Space: midnight'), 900, 80);

        const afterTransitionText = (await waitFor(
          () => readBodyText().includes('Current Space: midnight'),
          2500,
          100,
        ))
          ? readBodyText()
          : readBodyText();
        const transitionSettleDetected = await waitFor(
          () => !readBodyText().toLowerCase().includes('transitioning'),
          2200,
          100,
        );

        if (!transitionSettleDetected) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        const returnRetryUntilHome = async () => {
          const start = Date.now();
          const timeoutMs = 4000;
          while (Date.now() - start <= timeoutMs) {
            const text = readBodyText();
            if (!text.toLowerCase().includes('transitioning')) {
              window.dispatchEvent(
                new CustomEvent('music-os-set-space', {
                  detail: 'home',
                }),
              );
            }
            if (text.includes('Current Space: home')) {
              return true;
            }
            await new Promise((resolve) => setTimeout(resolve, 120));
          }
          return false;
        };

        const afterReturnDetected = await returnRetryUntilHome();
        const repeatedTransitionHealthy = await (async () => {
          const cycleCount = 3;
          const cycleResults = [];

          const isIdle = () => !readBodyText().toLowerCase().includes('transitioning');

          const runCycleStep = async (cycle, targetSpace) => {
            await waitFor(isIdle, 2200, 80);
            const beforeText = readBodyText().slice(0, 220);

            window.dispatchEvent(
              new CustomEvent('music-os-set-space', {
                detail: targetSpace,
              }),
            );

            const reachedTarget = await waitFor(() => {
              const text = readBodyText();
              return text.includes('Current Space: ' + targetSpace);
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
              transitionText: readBodyText().toLowerCase().includes('transitioning'),
            });

            return reachedTarget && settled;
          };

          for (let cycle = 0; cycle < cycleCount; cycle += 1) {
            if (!(await runCycleStep(cycle, 'midnight'))) {
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
          afterDetected: afterTransitionText.includes('Current Space: midnight'),
          conflictIgnored,
          songWorldOverlayVisible: afterTransitionText.toLowerCase().includes('song world'),
          beforeText: beforeText.slice(0, 220),
          afterText: afterText.slice(0, 260),
          afterReturnDetected,
          repeatedTransitionHealthy: repeatedTransitionHealthy.ok === true,
          repeatedTransitionDiagnostic: repeatedTransitionHealthy,
        };
      })()
    `);

    console.log(
      JSON.stringify({
        result,
        transitionResult,
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
        transitionResult?.songWorldOverlayVisible &&
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

