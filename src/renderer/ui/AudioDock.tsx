import { useEffect, useRef, useState } from 'react';
import { useAudioStore } from '../audio/store';
import { audioEngine } from '../audio/runtime';
import type { ProviderTrack } from '../../shared/music/providers';
import { Play, Pause, Upload, Repeat, Repeat1, Volume2, VolumeX } from 'lucide-react';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

const VINYL_GRADIENT =
  'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)';

type AudioDockMode = 'developer' | 'experience';
interface AudioDockProps { mode?: AudioDockMode; immersive?: boolean; }

/* ——— 音量控制：图标点击静音，悬停展开滑条（音量存引擎单例，Dock 重挂载不丢） ——— */
function VolumeControl({ immersive }: { immersive: boolean }) {
  const [volume, setVolume] = useState(() => audioEngine.getVolumeState().volume);
  const [muted, setMuted] = useState(() => audioEngine.getVolumeState().muted);
  const [hovered, setHovered] = useState(false);
  const apply = (nextVolume: number, nextMuted: boolean) => {
    setVolume(nextVolume);
    setMuted(nextMuted);
    audioEngine.setVolume(nextVolume);
    audioEngine.setMuted(nextMuted);
  };
  const effective = muted ? 0 : volume;
  const size = immersive ? 32 : 28;
  return (
    <div
      className="flex items-center"
      style={{ gap: 4, flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={muted || effective === 0 ? '取消静音' : '静音'}
        title={muted || effective === 0 ? '取消静音' : '静音'}
        onClick={() => apply(volume, !muted)}
        style={{
          width: size, height: size, flexShrink: 0,
          border: 0, borderRadius: '50%', background: 'transparent',
          color: muted || effective === 0 ? 'var(--mo-ink-muted)' : 'var(--mo-ink-soft)',
          cursor: 'pointer', display: 'grid', placeItems: 'center',
        }}
      >
        {muted || effective === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={effective}
        aria-label="音量"
        onChange={(e) => apply(Number(e.target.value), muted)}
        style={{
          width: hovered ? 64 : 0,
          opacity: hovered ? 1 : 0,
          transition: 'width 220ms var(--mo-ease), opacity 220ms var(--mo-ease)',
          cursor: 'pointer',
          accentColor: 'var(--mo-accent)',
        }}
      />
    </div>
  );
}

/* ——— 频谱：30 条 hairline，由平滑 metrics 驱动（FFT 数据留在引擎内） ——— */
function SpectrumBars({ bars = 30 }: { bars?: number }) {
  const barRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const phases = Array.from({ length: bars }, (_, i) => i * 0.57);
    let raf = 0;
    const tick = (time: number) => {
      const m = useAudioStore.getState().metrics;
      barRefs.current.forEach((bar, i) => {
        if (!bar) return;
        const t = i / bars;
        const wave = 0.5 + 0.5 * Math.sin(phases[i] + time * 0.0028);
        const band = m.bass * (1 - t) * 0.9 + m.mid * 0.55 * (0.35 + 0.65 * wave) + m.treble * t * 0.8;
        const height = 4 + (band * 26 + m.beatPulse * 9 * wave) * (0.45 + 0.55 * wave);
        bar.style.height = `${Math.min(42, Math.max(3, height))}px`;
        bar.style.opacity = `${0.28 + band * 0.62}`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bars]);

  return (
    <div className="flex items-end gap-[3px]" style={{ height: 34, flexShrink: 0 }} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            barRefs.current[i] = el;
          }}
          className="w-[2px] rounded-full"
          style={{ background: 'var(--mo-accent)', height: 4, opacity: 0.3 }}
        />
      ))}
    </div>
  );
}

export default function AudioDock({ mode = 'experience', immersive = false }: AudioDockProps) {
  const inputRef = useRef<HTMLInputElement>(null);  const isDeveloperMode = mode === 'developer';
  const track = useAudioStore((s) => s.track);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const currentTime = useAudioStore((s) => s.currentTime);
  const duration = useAudioStore((s) => s.duration);
  const error = useAudioStore((s) => s.error);
  const canPlay = useAudioStore((s) => s.canPlay);
  const loadFile = useAudioStore((s) => s.loadFile);
  const loadProviderTrack = useAudioStore((s) => s.loadProviderTrack);
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const seek = useAudioStore((s) => s.seek);
  const loopMode = useAudioStore((s) => s.loopMode);
  const queueKind = useAudioStore((s) => s.queueKind);
  const queueTitle = useAudioStore((s) => s.queueTitle);
  const queueIndex = useAudioStore((s) => s.queueIndex);
  const queueLength = useAudioStore((s) => s.queueLength);
  const setLoopMode = useAudioStore((s) => s.setLoopMode);
  const trackLabel = track ? `${track.title} — ${track.artist}${track.album ? ` · ${track.album}` : ''}` : null;

  const [providerQuery, setProviderQuery] = useState('midnight');
  const [providerTracks, setProviderTracks] = useState<ProviderTrack[]>([]);
  const [providerSearchMessage, setProviderSearchMessage] = useState<string | null>(null);
  const [isSearchingProvider, setIsSearchingProvider] = useState(false);
  const [isLoadingProviderTrack, setIsLoadingProviderTrack] = useState(false);
  const [localLoadMessage, setLocalLoadMessage] = useState<string | null>(null);
  const [progressHover, setProgressHover] = useState(false);

  const statusText = track ? (isPlaying ? '播放中' : canPlay ? '已就绪' : '仅元数据') : '未加载曲目';

  const searchProviderTracks = async () => {
    if (typeof window.musicOS?.searchMusic !== 'function') {
      setProviderTracks([]); setProviderSearchMessage('当前版本未提供供应商搜索能力。'); return;
    }
    const q = providerQuery.trim();
    if (!q) { setProviderTracks([]); setProviderSearchMessage('请输入搜索关键字。'); return; }
    setIsSearchingProvider(true); setProviderSearchMessage(null);
    try {
      const result = await window.musicOS.searchMusic(q, 'mock');
      if (result?.error) { setProviderTracks([]); setProviderSearchMessage(result.error.message || '供应商返回错误。'); return; }
      const tracks = Array.isArray(result?.tracks) ? result.tracks : [];
      setProviderTracks(tracks); setProviderSearchMessage(tracks.length ? null : '未找到匹配的结果。');
    } catch { setProviderTracks([]); setProviderSearchMessage('供应商搜索失败，请重试。'); }
    finally { setIsSearchingProvider(false); }
  };

  const selectProviderTrack = async (ref: ProviderTrack['reference']) => {
    setIsLoadingProviderTrack(true); setProviderSearchMessage(null);
    try {
      const loaded = await loadProviderTrack(ref);
      setProviderSearchMessage(loaded ? '已加载供应商曲目，可直接播放。' : '仅加载供应商元数据，请重试。');
    } catch { setProviderSearchMessage('无法加载供应商曲目。'); }
    finally { setIsLoadingProviderTrack(false); }
  };

  const loadLocalFile = async (file: File) => {
    setLocalLoadMessage(`正在加载 ${file.name}...`);
    try { await loadFile(file); setLocalLoadMessage('已加载 · 点击核心进入世界'); setTimeout(() => setLocalLoadMessage(null), 2800); }
    catch { setLocalLoadMessage('加载失败，请更换文件'); }
  };

  const isLoaded = Boolean(track);
  const progressPct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  // ——— experience: 完整玻璃控制条 ———
  if (!isDeveloperMode) {
    return (
      <div
        style={{
          position: 'absolute',
          left: '50%', bottom: immersive ? 34 : 22, zIndex: 24,
          transform: 'translateX(-50%)',
          width: immersive ? 'min(800px, calc(100vw - 48px))' : 'min(var(--mo-dock-width), calc(100vw - 32px))',
          pointerEvents: 'auto',
          animation: 'mo-dock-in var(--mo-duration) var(--mo-ease)',
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'var(--mo-radius-pill)',
            background: 'var(--mo-bg-elevated)',
            border: '1px solid var(--mo-line)',
            backdropFilter: 'blur(22px) saturate(1.15)',
            WebkitBackdropFilter: 'blur(22px) saturate(1.15)',
            boxShadow: immersive
              ? '0 18px 56px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 44px var(--mo-accent-ghost)'
              : '0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            color: 'var(--mo-text)',
            padding: immersive ? '12px 18px' : '8px 14px',
            display: 'flex', alignItems: 'center', gap: immersive ? 18 : 14,
          }}
        >
          {/* 封面 */}
          <div
            style={{
              width: immersive ? 64 : 42, height: immersive ? 64 : 42, flexShrink: 0,
              borderRadius: immersive ? 16 : 10,
              background: track?.artworkUrl
                ? `url("${track.artworkUrl}") center / cover no-repeat`
                : VINYL_GRADIENT,
              boxShadow: `0 4px 14px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 calc(${immersive ? 8 : 4}px + var(--mo-beat, 0) * ${immersive ? 28 : 18}px) var(--mo-accent-ghost)`,
              border: '1px solid rgba(255,255,255,0.06)',
              transition: 'background var(--mo-duration) var(--mo-ease)',
            }}
          />
          {/* 播放 / 暂停 —— accent 流动 */}
          <button
            type="button"
            disabled={!isLoaded || !canPlay}
            onClick={() => (isPlaying ? pause() : void play())}
            aria-label={isPlaying ? '暂停' : '播放'}
            style={{
              width: immersive ? 50 : 38, height: immersive ? 50 : 38, flexShrink: 0,
              border: 0, borderRadius: '50%',
              background: isLoaded && canPlay ? 'var(--mo-accent)' : 'rgba(255,255,255,0.06)',
              color: isLoaded && canPlay ? 'var(--mo-accent-contrast)' : 'rgba(255,255,255,0.32)',
              cursor: isLoaded && canPlay ? 'pointer' : 'default',
              display: 'grid', placeItems: 'center',
              boxShadow: isLoaded && canPlay ? '0 0 calc(14px + var(--mo-beat, 0) * 26px) var(--mo-accent-ghost)' : 'none',
              transition: 'transform var(--mo-duration-fast) var(--mo-ease-soft), background var(--mo-duration-fast) var(--mo-ease-soft)',
            }}
            onMouseEnter={(e) => { if (isLoaded && canPlay) e.currentTarget.style.transform = 'scale(1.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {isPlaying ? <Pause className={immersive ? 'w-5 h-5' : 'w-4 h-4'} fill="currentColor" strokeWidth={0} /> : <Play className={immersive ? 'w-5 h-5 ml-0.5' : 'w-4 h-4 ml-0.5'} fill="currentColor" strokeWidth={0} />}
          </button>

          {/* 曲目信息 */}
          <div
            style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
            onClick={() => inputRef.current?.click()}
            title="选择本地音频"
          >
            <div
              style={{
                fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1,
                color: canPlay ? 'var(--mo-ink-muted)' : track ? 'var(--mo-warm)' : 'var(--mo-ink-faint)',
              }}
            >
              {statusText}
            </div>
            <div
              style={{
                fontSize: immersive ? 15 : 13, fontWeight: 500, lineHeight: 1.3, marginTop: 3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: 'var(--mo-ink)',
              }}
            >
              {trackLabel ?? '选择本地歌曲'}
            </div>
          </div>

          {/* 频谱（仅播放态） */}
          {isPlaying && canPlay && <SpectrumBars />}

          {/* 循环模式（队列存在时可用）：列表循环 → 单曲循环 → 不循环 */}
          {queueKind ? (
            <button
              type="button"
              aria-label="循环模式"
              title={`循环：${loopMode === 'list' ? '列表循环' : loopMode === 'single' ? '单曲循环' : '不循环'}（${queueTitle ?? ''} ${queueIndex + 1}/${queueLength}）`}
              onClick={() => setLoopMode(loopMode === 'list' ? 'single' : loopMode === 'single' ? 'off' : 'list')}
              style={{
                width: immersive ? 32 : 28, height: immersive ? 32 : 28, flexShrink: 0,
                border: 0, borderRadius: '50%', background: 'transparent',
                color: loopMode === 'off' ? 'rgba(255,255,255,0.32)' : 'var(--mo-ink-muted)',
                cursor: 'pointer', display: 'grid', placeItems: 'center',
              }}
            >
              {loopMode === 'single' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
            </button>
          ) : null}

          {/* 音量：图标静音切换，悬停展开滑条 */}
          <VolumeControl immersive={immersive} />

          {/* 时间 */}
          <div
            style={{
              textAlign: 'right', flexShrink: 0,
              fontSize: immersive ? 12 : 11, color: 'var(--mo-ink-muted)',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1.3,
            }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* 上传 */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="加载本地歌曲"
            title="加载本地歌曲"
            style={{
              width: immersive ? 32 : 28, height: immersive ? 32 : 28, flexShrink: 0,
              border: 0, borderRadius: '50%',
              background: 'transparent',
              color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer',
              display: 'grid', placeItems: 'center',
              opacity: 0,
              transition: 'opacity var(--mo-duration-fast) var(--mo-ease), color var(--mo-duration-fast) var(--mo-ease)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          <input ref={inputRef} type="file" accept="audio/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) await loadLocalFile(f); e.target.value=''; }} />

          {/* 进度条：可点击/拖拽 seek（命中区 16px 全在容器内，悬停/拖拽时变粗并显示 thumb） */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 16,
              display: 'flex',
              alignItems: 'flex-end',
              cursor: duration ? 'pointer' : 'default',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: progressHover ? 4 : 2,
                background: 'rgba(255,255,255,0.08)',
                transition: 'height 180ms var(--mo-ease)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, var(--mo-accent), var(--mo-accent-ghost))',
                  boxShadow: '0 0 16px var(--mo-accent-ghost)',
                  transition: 'width 120ms linear',
                }}
              />
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${progressPct}%`,
                  width: 10,
                  height: 10,
                  marginLeft: -5,
                  marginTop: -5,
                  borderRadius: '50%',
                  background: 'var(--mo-accent)',
                  boxShadow: '0 0 12px var(--mo-accent)',
                  opacity: progressHover ? 1 : 0.85,
                  transition: 'opacity 200ms var(--mo-ease)',
                }}
              />
            </div>
            {/* 透明 range 提供原生拖拽与无障碍语义 */}
            <input
              type="range"
              min={0}
              max={duration || 0.01}
              step={0.01}
              value={Math.min(currentTime, duration || 0.01)}
              disabled={!duration}
              onChange={(e) => seek(Number(e.target.value))}
              onMouseEnter={() => setProgressHover(true)}
              onMouseLeave={() => setProgressHover(false)}
              onPointerDown={() => setProgressHover(true)}
              onPointerUp={() => setProgressHover(false)}
              aria-label="播放进度"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 16,
                width: '100%',
                opacity: 0,
                cursor: duration ? 'pointer' : 'default',
                margin: 0,
              }}
            />
          </div>
        </div>

        {/* 瞬时消息 */}
        {localLoadMessage ? <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: 'var(--mo-ink-faint)' }}>{localLoadMessage}</div> : null}
        {error ? <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: 'var(--mo-warm)' }}>{error}</div> : null}
        {!canPlay && track ? <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: 'var(--mo-ink-faint)' }}>元数据已加载，请选择可播放来源。</div> : null}
      </div>
    );
  }

  // ——— developer mode（保留，作为开发工具） ———
  return (
    <div
      style={{
        position: 'absolute', left: '50%', bottom: 18, zIndex: 11, transform: 'translateX(-50%)',
        width: 'min(780px, calc(100vw - 28px))',
        background: 'var(--mo-bg-elevated-strong)',
        border: '1px solid var(--mo-line-strong)',
        borderRadius: 'var(--mo-radius-md)',
        backdropFilter: 'blur(var(--mo-blur))', WebkitBackdropFilter: 'blur(var(--mo-blur))',
        boxShadow: 'var(--mo-shadow-medium), var(--mo-shadow-hairline)',
        color: 'var(--mo-text)', display: 'grid', gap: 10, padding: 14, pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button" disabled={!isLoaded || !canPlay} onClick={() => (isPlaying ? pause() : void play())}
          style={{
            width: 36, height: 36, border: 0, borderRadius: '50%',
            background: isLoaded && canPlay ? 'var(--mo-accent-strong)' : 'rgba(255,255,255,0.08)',
            color: isLoaded && canPlay ? '#0a0a0c' : 'rgba(255,255,255,0.42)', cursor: isLoaded && canPlay ? 'pointer' : 'default',
            display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
          }}
        >
          {isPlaying ? '‖' : '▶'}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: canPlay ? 'var(--mo-success)' : 'var(--mo-text-faint)' }}>{statusText}</div>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trackLabel ?? '选择本地歌曲'}</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--mo-text-muted)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
          <div>{formatTime(currentTime)}</div><div>{formatTime(duration)}</div>
        </div>
      </div>

      <input ref={inputRef} type="file" accept="audio/*" hidden onChange={async (e) => { const f=e.target.files?.[0]; if(f) await loadLocalFile(f); e.target.value=''; }} />
      <div style={{ position: 'relative' }}>
        <div style={{ height: 2, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--mo-accent-strong)' }} />
        </div>
        <input type="range" min={0} max={duration||0.01} step={0.01} value={Math.min(currentTime,duration||0.01)} disabled={!duration} onChange={(e)=>seek(Number(e.target.value))} aria-label="播放进度" style={{ position:'absolute', inset:0, opacity:0, width:'100%', cursor: duration?'pointer':'default' }} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={()=>inputRef.current?.click()} style={{ border:'1px solid var(--mo-line)', borderRadius:999, background:'transparent', color:'var(--mo-text-muted)', padding:'5px 11px', fontSize:11, cursor:'pointer' }}>加载本地歌曲</button>
        <span style={{ marginLeft:'auto', alignSelf:'center', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color: canPlay?'var(--mo-text-faint)':'var(--mo-warm)' }}>{canPlay?'● 音频就绪':'○ 等待音频'}</span>
      </div>

      <div style={{ display:'grid', gap:8, paddingTop:8, borderTop:'1px solid var(--mo-line-subtle)' }}>
        <div style={{ display:'flex', gap:8 }}>
          <input value={providerQuery} onChange={(e)=>setProviderQuery(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); void searchProviderTracks(); }}} placeholder="搜索示例曲库（Mock）"
            style={{ flex:1, minWidth:0, borderRadius:'var(--mo-radius-sm)', border:'1px solid var(--mo-line)', padding:'8px 10px', background:'rgba(8,8,10,0.7)', color:'var(--mo-text)', fontSize:13 }} />
          <button type="button" disabled={isSearchingProvider} onClick={()=>void searchProviderTracks()} style={{ border:0, borderRadius:'var(--mo-radius-sm)', background:'var(--mo-accent-strong)', color:'#0a0a0c', padding:'8px 14px', fontSize:13, fontWeight:600, cursor: isSearchingProvider?'default':'pointer' }}>{isSearchingProvider?'…':'查找'}</button>
        </div>
        {providerSearchMessage ? <div style={{ color:'var(--mo-text-muted)', fontSize:12 }}>{providerSearchMessage}</div> : null}
        {providerTracks.length>0 ? (
          <div style={{ display:'grid', gap:6, maxHeight:150, overflowY:'auto', paddingRight:2 }}>
            {providerTracks.map((pt)=>(
              <button key={pt.reference.platformTrackId} type="button" disabled={isLoadingProviderTrack} onClick={()=>void selectProviderTrack(pt.reference)}
                style={{ textAlign:'left', border:'1px solid var(--mo-line)', background:'rgba(10,10,12,0.7)', borderRadius:'var(--mo-radius-sm)', color:'var(--mo-text)', padding:'8px 10px', cursor: isLoadingProviderTrack?'default':'pointer' }}>
                <div style={{ fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pt.title}</div>
                <div style={{ color:'var(--mo-text-faint)', fontSize:11 }}>{pt.artist.name}</div>
              </button>
            ))}
          </div>
        ):null}
      </div>
      {error ? <div style={{ color:'var(--mo-warm)', fontSize:11 }}>{error}</div> : null}
      {localLoadMessage ? <div style={{ color:'var(--mo-text-faint)', fontSize:11 }}>{localLoadMessage}</div> : null}
    </div>
  );
}