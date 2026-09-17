import { useCallback, useEffect, useRef, useState } from 'react';
import { useRuntimeStore } from './store/runtime';
import AudioDock from './ui/AudioDock';
import BootSplash from './ui/BootSplash';
import WorldManager from './worlds/WorldManager';
import TopBar from './ui/TopBar';
import WaveHome from './worlds/WaveHome';
import LibraryGalaxyWorld from './worlds/LibraryGalaxyWorld';
import MemoryFieldWorld from './worlds/MemoryFieldWorld';
import SearchOrbital from './ui/SearchOrbital';
import AccountPanel from './ui/AccountPanel';
import { useAccountStore } from './store/account';
import DetailOrbital from './ui/DetailOrbital';
import { useLibraryStore } from './store/library';
import { useMoodStore } from './store/mood';
import type { AppReadyPayload } from '../shared/ipc/channels';
import { useAudioStore } from './audio/store';
import { useDominantColor, withAlpha, contrastText, energyTargetFallback } from './hooks/useDominantColor';

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
  const [isSearching, setIsSearching] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  /* ——— 启动 curtain：遮住 IPC ready 与播放恢复耗时，就绪后自动退场 ——— */
  const [bootPhase, setBootPhase] = useState<'loading' | 'exiting' | 'done'>('loading');
  /* 就绪信号与最短展示时长分离：就绪再快，也让品牌动画完整播完再揭幕 */
  const [bootReady, setBootReady] = useState(false);
  const bootStartedAtRef = useRef(Date.now());
  const finishBoot = useCallback(() => {
    setBootPhase((prev) => (prev === 'loading' ? 'exiting' : prev));
  }, []);
  const markBootReady = useCallback(() => {
    setBootReady(true);
  }, []);
  useEffect(() => {
    if (!bootReady) {
      return undefined;
    }
    const elapsed = Date.now() - bootStartedAtRef.current;
    const remaining = Math.max(0, 3200 - elapsed);
    const timer = window.setTimeout(finishBoot, remaining);
    return () => window.clearTimeout(timer);
  }, [bootReady, finishBoot]);
  useEffect(() => {
    if (bootPhase !== 'exiting') {
      return undefined;
    }
    const timer = window.setTimeout(() => setBootPhase('done'), 850);
    return () => window.clearTimeout(timer);
  }, [bootPhase]);
  useEffect(() => {
    // 兜底：即使 ready/恢复异常卡住，也最多 4.2 秒后揭幕
    const timer = window.setTimeout(markBootReady, 5600);
    return () => window.clearTimeout(timer);
  }, [markBootReady]);
  const currentSpace = useRuntimeStore((s) => s.currentSpace);

  /* 空间切换时点亮过渡帘（240ms 淡入、260ms 后淡出） */
  const [spaceVeil, setSpaceVeil] = useState(false);
  const spaceVeilSkipRef = useRef(true);
  useEffect(() => {
    if (spaceVeilSkipRef.current) {
      spaceVeilSkipRef.current = false;
      return undefined;
    }
    setSpaceVeil(true);
    const timer = setTimeout(() => setSpaceVeil(false), 280);
    return () => clearTimeout(timer);
  }, [currentSpace]);

  /* 启动时同步一次网易云登录态（顶栏头像 / 账号面板） */
  useEffect(() => {
    void useAccountStore.getState().refresh();
  }, []);

  /* ⌘K / Ctrl+K 打开搜索 */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearching(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const isTransitioning = useRuntimeStore((s) => s.isTransitioning);
  const currentTrack = useAudioStore((s) => s.track ?? null);
  /* ——— 动态强调色：封面主色，全局流动（design-language-v2 #4） ——— */
  const accent = useDominantColor(currentTrack?.artworkUrl ?? null, energyTargetFallback(currentTrack?.worldContext ?? null));
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDetailOpen) setIsDetailOpen(false);
        else if (isSearching) setIsSearching(false);
        else requestSpace('home');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestSpace, isDetailOpen, isSearching]);

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
        markBootReady();
        return;
      }
      try {
        const result: AppReadyPayload = await window.musicOS.ready();
        setStatus(`ready: ${result.appName} @ ${new Date(result.startedAt).toLocaleTimeString()}`);
        await restorePlaybackSession();
        markBootReady();
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        await reportStartupError('ipc_ready_failed', detail);
        setStatus('ipc not ready');
        markBootReady();
      }
    };
    ready().catch(() => {
      setStatus('ipc not ready');
      markBootReady();
    });
  }, [restorePlaybackSession, markBootReady]);

  useEffect(() => {
    const h = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (next === 'home' || next === 'library' || next === 'memory') {
        requestSpace(next);
      }
    };
    window.addEventListener('music-os-set-space', h);
    return () => window.removeEventListener('music-os-set-space', h);
  }, [requestSpace]);

  /* ——— 首屏数据：曲库 + 情绪（原 TopBar 职责，随 TopBar 精简移入） ——— */
  const refreshLibrary = useLibraryStore((s) => s.refresh);
  const loadMood = useMoodStore((s) => s.load);
  useEffect(() => {
    void loadMood();
    void refreshLibrary();
  }, [loadMood, refreshLibrary]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      const loadFile = useAudioStore.getState().loadFile;
      try {
        await loadFile(file);
      } catch {}
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
        ['--mo-accent' as string]: accent,
        ['--mo-accent-strong' as string]: accent,
        ['--mo-accent-ghost' as string]: withAlpha(accent, 0.14),
        ['--mo-accent-contrast' as string]: contrastText(accent),
        ['--mo-home-accent' as string]: accent,
      }}
    >
      {/* Background R3F canvas — persistent spatial layer */}
      <WorldManager />

      {/* 空间切换过渡：纯透明度 + 轻模糊，不做位移（避免眩晕）；静止时不挂 backdrop-filter */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 35,
          background: 'rgba(3,3,5,0.55)',
          backdropFilter: spaceVeil ? 'blur(10px)' : 'none',
          WebkitBackdropFilter: spaceVeil ? 'blur(10px)' : 'none',
          opacity: spaceVeil ? 1 : 0,
          transition: 'opacity 240ms var(--mo-ease)',
        }}
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
          <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl px-8 py-6 text-center">
            <div className="text-white/80 font-sans text-[13px] tracking-wide">拖入音频以载入</div>
            <div className="text-white/30 font-sans text-[11px] mt-1">mp3 · wav · flac · ogg</div>
          </div>
        </div>
      )}

      {/* Top navigation — prototype style */}
      <TopBar onSearch={() => setIsSearching(true)} onAccount={() => setIsAccountOpen(true)} />

      {/* Home：走廊（内容优先，滚动推进） */}
      {currentSpace === 'home' && <WaveHome onDetail={() => setIsDetailOpen(true)} />}

      {/* Library / Memory DOM worlds */}
      {currentSpace === 'library' && <LibraryGalaxyWorld />}
      {currentSpace === 'memory' && <MemoryFieldWorld />}

      {/* Search / Detail orbitals — top-level modals */}
      <SearchOrbital isOpen={isSearching} onClose={() => setIsSearching(false)} />
      <AccountPanel isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
      <DetailOrbital isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} />

      {/* Audio dock — 仅在存在曲目时出现（空态保持干净的黑场） */}
      {currentTrack && <AudioDock mode={showDeveloperControls ? 'developer' : 'experience'} />}

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

      {/* 启动 curtain（最后渲染，覆盖全部界面；就绪后自动退场） */}
      {bootPhase !== 'done' && <BootSplash exiting={bootPhase === 'exiting'} onSkip={finishBoot} />}
    </div>
  );
}
