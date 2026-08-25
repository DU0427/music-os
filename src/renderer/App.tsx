import { useEffect, useState } from 'react';
import { useRuntimeStore } from './store/runtime';
import AudioDock from './ui/AudioDock';
import SongWorldOverlay from './ui/SongWorldOverlay';
import WorldManager from './worlds/WorldManager';
import TopBar from './ui/TopBar';
import HomeOrbital from './ui/HomeOrbital';
import LibraryGalaxyWorld from './worlds/LibraryGalaxyWorld';
import MemoryFieldWorld from './worlds/MemoryFieldWorld';
import MoodSpaceWorld from './worlds/MoodSpaceWorld';
import type { AppReadyPayload } from '../shared/ipc/channels';
import { useAudioStore } from './audio/store';

const reportStartupError = async (code: string, detail: string) => {
  if (typeof window.musicOS?.reportError === 'function') {
    try {
      await window.musicOS.reportError({ code, detail });
    } catch {
      // best effort
    }
  }
};

const showDiagnostics = import.meta.env.DEV || import.meta.env.VITE_MUSIC_OS_SHOW_DIAGNOSTICS === 'true';
const showDeveloperControls = showDiagnostics || import.meta.env.VITE_MUSIC_OS_SHOW_DEVELOPER_CONTROLS === 'true';

export default function AppShell() {
  const [status, setStatus] = useState<string>('booting...');
  const currentSpace = useRuntimeStore((s) => s.currentSpace);
  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const isTransitioning = useRuntimeStore((s) => s.isTransitioning);
  const currentTrack = useAudioStore((s) => s.track ?? null);
  const currentTrackName = currentTrack?.title ?? null;
  const canPlay = useAudioStore((s) => s.canPlay);
  const canEnterMidnight = useAudioStore((s) => Boolean(s.canPlay && s.track));
  const playbackError = useAudioStore((s) => s.error);
  const restorePlaybackSession = useAudioStore((s) => s.restorePlaybackSession);
  const prepareToClose = useAudioStore((s) => s.prepareToClose);
  const activeHistoryId = useAudioStore((s) => s.activeHistoryId);
  const activeHistoryTrackId = useAudioStore((s) => s.activeHistoryTrackId);
  const activeHistoryStartedAt = useAudioStore((s) => s.activeHistoryStartedAt);
  const activeHistoryElapsedSeconds = useAudioStore((s) => s.activeHistoryElapsedSeconds);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const currentTime = useAudioStore((s) => s.currentTime);
  const duration = useAudioStore((s) => s.duration);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestSpace('home'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestSpace]);

  useEffect(() => {
    const handler = (e: ErrorEvent | PromiseRejectionEvent) => {
      const detail = 'error' in e ? (e.error?.message || String(e.error)) : String((e as PromiseRejectionEvent).reason);
      void reportStartupError('renderer_error', detail);
    };
    window.addEventListener('error', handler);
    window.addEventListener('unhandledrejection', handler as (e: PromiseRejectionEvent) => void);
    return () => {
      window.removeEventListener('error', handler);
      window.removeEventListener('unhandledrejection', handler as (e: PromiseRejectionEvent) => void);
    };
  }, []);

  useEffect(() => {
    const h = () => void prepareToClose();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [prepareToClose]);

  useEffect(() => {
    if (typeof window.musicOS?.onPrepareToClose !== 'function') return undefined;
    const unsub = window.musicOS.onPrepareToClose(async () => { await prepareToClose(); });
    return unsub;
  }, [prepareToClose]);

  useEffect(() => {
    const ready = async () => {
      if (typeof window.musicOS?.ready !== 'function') {
        await reportStartupError('missing_bridge', 'musicOS.ready unavailable');
        setStatus('ipc bridge unavailable');
        return;
      }
      try {
        const result: AppReadyPayload = await window.musicOS.ready();
        setStatus(`ready: ${result.appName} @ ${new Date(result.startedAt).toLocaleTimeString()}`);
        await restorePlaybackSession();
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        await reportStartupError('ipc_ready_failed', detail);
        setStatus('ipc not ready');
      }
    };
    ready().catch(() => setStatus('ipc not ready'));
  }, [restorePlaybackSession]);

  useEffect(() => {
    const h = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (next === 'home' || next === 'midnight' || next === 'library' || next === 'memory' || next === 'mood' || next === 'visualizer') {
        requestSpace(next as any);
      }
    };
    window.addEventListener('music-os-set-space', h);
    return () => window.removeEventListener('music-os-set-space', h);
  }, [requestSpace]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--mo-bg)',
        color: 'var(--mo-text-soft)',
        fontFamily: 'var(--mo-font-sans)',
        userSelect: 'none',
      }}
    >
      {/* Background R3F canvas — persistent spatial layer */}
      <WorldManager />

      {/* Nebula overlay — prototype's soft fog layers */}
      <div
        aria-hidden
        className="absolute inset-[-20%] mix-blend-screen opacity-20 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 40% 60%, rgba(110,168,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 30%, rgba(181,140,255,0.10) 0%, transparent 40%)',
        }}
      />

      {/* Top navigation — prototype style */}
      <TopBar />

      {/* Home orbital DOM — only in home space */}
      {currentSpace === 'home' && <HomeOrbital />}

      {/* Library / Memory / Mood DOM worlds */}
      {currentSpace === 'library' && <LibraryGalaxyWorld />}
      {currentSpace === 'memory' && <MemoryFieldWorld />}
      {currentSpace === 'mood' && <MoodSpaceWorld />}

      {/* Midnight overlay */}
      <SongWorldOverlay />

      {/* Audio dock — mini */}
      <AudioDock mode={showDeveloperControls ? 'developer' : 'experience'} />

      {/* Diagnostics */}
      {showDiagnostics && (
        <div
          style={{
            position: 'absolute',
            top: 96,
            left: 16,
            color: 'var(--mo-text-muted)',
            textShadow: '0 1px 8px rgba(0,0,0,0.45)',
            pointerEvents: 'none',
            zIndex: 30,
            fontSize: 11,
            lineHeight: 1.6,
            maxWidth: 320,
          }}
        >
          <div style={{ color: '#fff', fontSize: 13, marginBottom: 6, fontWeight: 600 }}>music os — diagnostics</div>
          <div>{currentTrackName ? `track: ${currentTrackName}` : 'no track'}</div>
          <div>{currentTrack ? `${currentTrack.artist}${currentTrack.album ? ` — ${currentTrack.album}` : ''}` : null}</div>
          <div>{currentTrack ? `duration: ${Math.round(currentTrack.durationSeconds)}s` : null}</div>
          {playbackError ? <div style={{ color: '#ffb68c' }}>{playbackError}</div> : null}
          <div>{status}</div>
          <div>space: {currentSpace} {isTransitioning ? '(transitioning)' : ''}</div>
          <div style={{ marginTop: 4, fontSize: 10, color: 'var(--mo-text-faint)' }}>audio: {isPlaying ? 'playing' : 'paused'} · {Math.floor(currentTime)} / {Math.floor(duration)}s</div>
        </div>
      )}

      <div
        id="audio-session-debug"
        data-current-space={currentSpace}
        data-current-track-id={currentTrack?.id ?? ''}
        data-can-enter-midnight={canEnterMidnight ? '1' : '0'}
        data-has-track={currentTrack ? '1' : '0'}
        data-is-transitioning={isTransitioning ? '1' : '0'}
        data-status={status}
        data-active-history-id={activeHistoryId ?? ''}
        data-active-history-track-id={activeHistoryTrackId ?? ''}
        data-active-history-started-at={activeHistoryStartedAt ?? ''}
        data-active-history-elapsed-seconds={activeHistoryElapsedSeconds}
        data-track-id={currentTrack?.id ?? ''}
        data-track-provider-id={currentTrack?.providerId ?? ''}
        data-can-play={canPlay ? '1' : '0'}
        data-is-playing={isPlaying ? '1' : '0'}
        data-current-time={currentTime.toFixed ? currentTime.toFixed(3) : String(currentTime)}
        data-duration={duration.toFixed ? duration.toFixed(3) : String(duration)}
        style={{ display: 'none' }}
      />
    </div>
  );
}
