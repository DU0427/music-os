import { useRef, useState } from 'react';
import { useAudioStore } from '../audio/store';
import type { ProviderTrack } from '../../shared/music/providers';
import { Play, Pause, Upload } from 'lucide-react';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

type AudioDockMode = 'developer' | 'experience';
interface AudioDockProps { mode?: AudioDockMode; }

export default function AudioDock({ mode = 'experience' }: AudioDockProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isDeveloperMode = mode === 'developer';
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
  const trackLabel = track ? `${track.title} — ${track.artist}${track.album ? ` · ${track.album}` : ''}` : null;

  const [providerQuery, setProviderQuery] = useState('midnight');
  const [providerTracks, setProviderTracks] = useState<ProviderTrack[]>([]);
  const [providerSearchMessage, setProviderSearchMessage] = useState<string | null>(null);
  const [isSearchingProvider, setIsSearchingProvider] = useState(false);
  const [isLoadingProviderTrack, setIsLoadingProviderTrack] = useState(false);
  const [localLoadMessage, setLocalLoadMessage] = useState<string | null>(null);

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

  // ——— experience: floating capsule ———
  if (!isDeveloperMode) {
    return (
      <div
        style={{
          position: 'absolute',
          left: '50%', bottom: 24, zIndex: 11,
          transform: 'translateX(-50%)',
          width: 'min(var(--mo-dock-width), calc(100vw - 32px))',
          pointerEvents: 'auto',
          animation: 'mo-fade-in var(--mo-duration) var(--mo-ease)',
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'var(--mo-radius-pill)',
            background: 'var(--mo-bg-elevated)',
            border: '1px solid var(--mo-line)',
            backdropFilter: 'blur(var(--mo-blur))',
            WebkitBackdropFilter: 'blur(var(--mo-blur))',
            boxShadow: 'var(--mo-shadow-soft), var(--mo-shadow-hairline)',
            color: 'var(--mo-text)',
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          {/* play / pause — object-first */}
          <button
            type="button"
            disabled={!isLoaded || !canPlay}
            onClick={() => (isPlaying ? pause() : void play())}
            aria-label={isPlaying ? '暂停' : '播放'}
            style={{
              width: 38, height: 38, flexShrink: 0,
              border: 0, borderRadius: '50%',
              background: isLoaded && canPlay
                ? 'linear-gradient(135deg, var(--mo-accent), var(--mo-accent-strong))'
                : 'rgba(255,255,255,0.06)',
              color: isLoaded && canPlay ? '#07111f' : 'rgba(255,255,255,0.32)',
              cursor: isLoaded && canPlay ? 'pointer' : 'default',
              display: 'grid', placeItems: 'center',
              boxShadow: isLoaded && canPlay ? '0 0 24px rgba(110,168,255,0.28)' : 'none',
              transition: 'transform var(--mo-duration-fast) var(--mo-ease-soft), background var(--mo-duration-fast) var(--mo-ease-soft)',
            }}
            onMouseEnter={(e) => { if (isLoaded && canPlay) e.currentTarget.style.transform = 'scale(1.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" strokeWidth={0} /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" strokeWidth={0} />}
          </button>

          {/* track meta — click to load */}
          <div
            style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
            onClick={() => inputRef.current?.click()}
            title="选择本地音频"
          >
            <div
              style={{
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1,
                color: canPlay ? 'var(--mo-success)' : track ? 'var(--mo-warn)' : 'var(--mo-text-faint)',
              }}
            >
              {statusText}
            </div>
            <div
              style={{
                fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginTop: 3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {trackLabel ?? '选择本地歌曲'}
            </div>
          </div>

          {/* time — tabular */}
          <div
            style={{
              textAlign: 'right', flexShrink: 0,
              fontSize: 11, color: 'var(--mo-text-muted)',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1.3,
            }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* upload affordance — appears on hover */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="加载本地歌曲"
            title="加载本地歌曲"
            style={{
              width: 28, height: 28, flexShrink: 0,
              border: 0, borderRadius: '50%',
              background: 'transparent',
              color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer',
              display: 'grid', placeItems: 'center',
              opacity: 0,
              transition: 'opacity var(--mo-duration-fast) var(--mo-ease), color var(--mo-duration-fast) var(--mo-ease), background var(--mo-duration-fast) var(--mo-ease)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          <input ref={inputRef} type="file" accept="audio/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) await loadLocalFile(f); e.target.value=''; }} />

          {/* progress — hairline along bottom */}
          <div
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, height: 2,
              background: 'rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, var(--mo-accent-strong), var(--mo-portal-soft))',
                transition: 'width 120ms linear',
              }}
            />
          </div>
          {/* invisible seek surface */}
          <input
            type="range" min={0} max={duration || 0.01} step={0.01}
            value={Math.min(currentTime, duration || 0.01)} disabled={!duration}
            onChange={(e) => seek(Number(e.target.value))} aria-label="播放进度"
            style={{
              position: 'absolute', left: 0, right: 0, bottom: -4, height: 12,
              width: '100%', opacity: 0, cursor: duration ? 'pointer' : 'default', margin: 0,
            }}
          />
        </div>

        {/* transient messages below the capsule */}
        {localLoadMessage ? <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: 'var(--mo-text-faint)' }}>{localLoadMessage}</div> : null}
        {error ? <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: 'var(--mo-portal-soft)' }}>{error}</div> : null}
        {!canPlay && track ? <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: 'var(--mo-text-faint)' }}>元数据已加载，请选择可播放来源。</div> : null}
      </div>
    );
  }

  // ——— developer mode ———
  return (
    <div
      style={{
        position: 'absolute', left: '50%', bottom: 18, zIndex: 11, transform: 'translateX(-50%)',
        width: 'min(780px, calc(100vw - 28px))',
        background: 'var(--mo-bg-elevated-strong)',
        border: '1px solid var(--mo-line-strong)',
        borderRadius: 'var(--mo-radius-xl)',
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
            color: isLoaded && canPlay ? '#07111f' : 'rgba(255,255,255,0.42)', cursor: isLoaded && canPlay ? 'pointer' : 'default',
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
        <span style={{ marginLeft:'auto', alignSelf:'center', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color: canPlay?'var(--mo-text-faint)':'var(--mo-portal-soft)' }}>{canPlay?'● 音频就绪':'○ 等待音频'}</span>
      </div>

      <div style={{ display:'grid', gap:8, paddingTop:8, borderTop:'1px solid var(--mo-line-subtle)' }}>
        <div style={{ display:'flex', gap:8 }}>
          <input value={providerQuery} onChange={(e)=>setProviderQuery(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); void searchProviderTracks(); }}} placeholder="搜索示例曲库（Mock）"
            style={{ flex:1, minWidth:0, borderRadius:'var(--mo-radius-md)', border:'1px solid var(--mo-line)', padding:'8px 10px', background:'rgba(8,14,26,0.64)', color:'var(--mo-text)', fontSize:13 }} />
          <button type="button" disabled={isSearchingProvider} onClick={()=>void searchProviderTracks()} style={{ border:0, borderRadius:'var(--mo-radius-md)', background:'var(--mo-accent-strong)', color:'#05070d', padding:'8px 14px', fontSize:13, fontWeight:600, cursor: isSearchingProvider?'default':'pointer' }}>{isSearchingProvider?'…':'查找'}</button>
        </div>
        {providerSearchMessage ? <div style={{ color:'var(--mo-text-muted)', fontSize:12 }}>{providerSearchMessage}</div> : null}
        {providerTracks.length>0 ? (
          <div style={{ display:'grid', gap:6, maxHeight:150, overflowY:'auto', paddingRight:2 }}>
            {providerTracks.map((pt)=>(
              <button key={pt.reference.platformTrackId} type="button" disabled={isLoadingProviderTrack} onClick={()=>void selectProviderTrack(pt.reference)}
                style={{ textAlign:'left', border:'1px solid var(--mo-line)', background:'rgba(12,20,34,0.72)', borderRadius:'var(--mo-radius-md)', color:'var(--mo-text)', padding:'8px 10px', cursor: isLoadingProviderTrack?'default':'pointer' }}>
                <div style={{ fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pt.title}</div>
                <div style={{ color:'var(--mo-text-faint)', fontSize:11 }}>{pt.artist.name}</div>
              </button>
            ))}
          </div>
        ):null}
      </div>
      {error ? <div style={{ color:'var(--mo-portal-soft)', fontSize:11 }}>{error}</div> : null}
      {localLoadMessage ? <div style={{ color:'var(--mo-text-faint)', fontSize:11 }}>{localLoadMessage}</div> : null}
    </div>
  );
}
