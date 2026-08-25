import { useAudioStore } from '../audio/store';
import { useRuntimeStore } from '../store/runtime';

export default function SongWorldOverlay() {
  const currentSpace = useRuntimeStore((s) => s.currentSpace);
  const track = useAudioStore((s) => s.track);
  const canPlay = useAudioStore((s) => s.canPlay);

  const worldLabel = track?.worldContext?.worldLabel ?? '午夜城市';
  const trackArtist = track?.artist ?? '本地音频';
  const moodLine = track?.worldContext?.moodTags?.join(' / ') ?? '夜晚 / 梦境';

  if (currentSpace !== 'midnight') return null;

  return (
    <div
      id="song-world-overlay"
      style={{
        position: 'absolute',
        top: 76,
        right: 20,
        zIndex: 5,
        maxWidth: 'min(300px, calc(100vw - 40px))',
        textAlign: 'right',
        pointerEvents: 'none',
        opacity: 0.92,
        animation: 'mo-fade-in var(--mo-duration) var(--mo-ease)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--mo-text-muted)',
          lineHeight: 1,
        }}
      >
        歌曲世界
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: 'var(--mo-text)',
          textShadow: '0 1px 16px rgba(0,0,0,0.45)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {worldLabel}
      </div>
      <div
        style={{
          marginTop: 4,
          color: 'var(--mo-text-faint)',
          fontSize: 11,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {track?.title ?? '曲目待加载'} — {trackArtist} · {moodLine}
      </div>
      {!canPlay && track ? (
        <div style={{ marginTop: 6, color: 'var(--mo-portal-soft)', fontSize: 10, opacity: 0.9 }}>
          {track.providerId === 'local-file' ? '已恢复会话，请选择本地文件继续' : '已恢复会话，请重选来源继续'}
        </div>
      ) : null}
    </div>
  );
}
