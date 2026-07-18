import { useEffect, useState } from 'react';
import { useRuntimeStore } from './store/runtime';
import AudioDock from './ui/AudioDock';
import SongWorldOverlay from './ui/SongWorldOverlay';
import WorldManager from './worlds/WorldManager';
import type { AppReadyPayload } from '../shared/ipc/channels';
import { useAudioStore } from './audio/store';

const reportStartupError = async (code: string, detail: string) => {
  if (typeof window.musicOS?.reportError === 'function') {
    try {
      await window.musicOS.reportError({
        code,
        detail,
      });
    } catch {
      // main process diagnostics are best-effort during bootstrap
    }
  }
};

export default function AppShell() {
  const [status, setStatus] = useState<string>('Booting...');
  const currentSpace = useRuntimeStore((state) => state.currentSpace);
  const requestSpace = useRuntimeStore((state) => state.requestSpace);
  const isTransitioning = useRuntimeStore((state) => state.isTransitioning);
  const currentTrack = useAudioStore((state) => state.track ?? null);
  const currentTrackName = currentTrack?.title ?? null;
  const canEnterMidnight = useAudioStore((state) => Boolean(state.canPlay && state.track));
  const canPlay = useAudioStore((state) => state.canPlay);
  const playbackError = useAudioStore((state) => state.error);
  const restorePlaybackSession = useAudioStore((state) => state.restorePlaybackSession);
  const prepareToClose = useAudioStore((state) => state.prepareToClose);
  const activeHistoryId = useAudioStore((state) => state.activeHistoryId);
  const activeHistoryTrackId = useAudioStore((state) => state.activeHistoryTrackId);
  const activeHistoryStartedAt = useAudioStore((state) => state.activeHistoryStartedAt);
  const activeHistoryElapsedSeconds = useAudioStore((state) => state.activeHistoryElapsedSeconds);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestSpace('home');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestSpace]);

  useEffect(() => {
    const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const detail = 'error' in event ? (event.error?.message || String(event.error)) : String(event.reason);
      void reportStartupError('renderer_error', detail);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError as (event: PromiseRejectionEvent) => void);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError as (event: PromiseRejectionEvent) => void);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      void prepareToClose();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [prepareToClose]);

  useEffect(() => {
    if (typeof window.musicOS?.onPrepareToClose !== 'function') {
      return undefined;
    }

    const unsubscribe = window.musicOS.onPrepareToClose(async () => {
      await prepareToClose();
    });

    return unsubscribe;
  }, [prepareToClose]);

  useEffect(() => {
    const ready = async () => {
      if (typeof window.musicOS?.ready !== 'function') {
        await reportStartupError('missing_bridge', 'musicOS.ready is not available during shell boot.');
        setStatus('IPC bridge unavailable.');
        return;
      }
      try {
        const result: AppReadyPayload = await window.musicOS.ready();
        setStatus(`Ready: ${result.appName} @ ${new Date(result.startedAt).toLocaleTimeString()}`);
        await restorePlaybackSession();
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        await reportStartupError('ipc_ready_failed', detail);
        setStatus('IPC not yet attached.');
      }
    };
    ready().catch(() => setStatus('IPC not yet attached.'));
  }, [restorePlaybackSession]);

  useEffect(() => {
    const handleSpaceChange = (event: Event) => {
      const nextSpace = (event as CustomEvent<string>).detail;
      if (nextSpace === 'home' || nextSpace === 'midnight') {
        requestSpace(nextSpace);
      }
    };
    window.addEventListener('music-os-set-space', handleSpaceChange);
    return () => window.removeEventListener('music-os-set-space', handleSpaceChange);
  }, [requestSpace]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <WorldManager />
      <AudioDock />
      <SongWorldOverlay />

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          color: '#9aa7bf',
          fontFamily: 'sans-serif',
          textShadow: '0 1px 8px rgba(0,0,0,0.45)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ color: '#fff', fontSize: 18, marginBottom: 4 }}>Music OS Desktop Shell</div>
        <div>{currentTrackName ? `Current Track: ${currentTrackName}` : 'No track loaded'}</div>
        <div>{currentTrack ? `${currentTrack.artist}${currentTrack.album ? ` - ${currentTrack.album}` : ''}` : null}</div>
        <div>{currentTrack ? `Duration: ${Math.round(currentTrack.durationSeconds)}s` : null}</div>
        {currentTrackName && !canPlay ? (
          <div>Recovered metadata only. Select a local source to continue this playback state.</div>
        ) : null}
        {playbackError ? <div style={{ color: '#ffb68c' }}>{playbackError}</div> : null}
        {!canEnterMidnight ? <div>Choose a local song to enter Midnight City.</div> : null}
        <div>{status}</div>
        {isTransitioning ? <div>Transitioning...</div> : null}
        <div>Current Space: {currentSpace}</div>
      </div>
      <div
        id="audio-session-debug"
        data-active-history-id={activeHistoryId ?? ''}
        data-active-history-track-id={activeHistoryTrackId ?? ''}
        data-active-history-started-at={activeHistoryStartedAt ?? ''}
        data-active-history-elapsed-seconds={activeHistoryElapsedSeconds}
        style={{ display: 'none' }}
      />

    </div>
  );
}
