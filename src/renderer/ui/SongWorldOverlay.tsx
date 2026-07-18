import { useAudioStore } from '../audio/store';
import { useRuntimeStore } from '../store/runtime';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

export default function SongWorldOverlay() {
  const currentSpace = useRuntimeStore((state) => state.currentSpace);
  const track = useAudioStore((state) => state.track);
  const currentTime = useAudioStore((state) => state.currentTime);
  const duration = useAudioStore((state) => state.duration);
  const canPlay = useAudioStore((state) => state.canPlay);

  const worldLabel = track?.worldContext?.worldLabel ?? 'Midnight City';
  const trackArtist = track?.artist ?? 'Local audio';
  const moodLine = track?.worldContext?.moodTags?.join(' / ') ?? 'Night / Dream';

  if (currentSpace !== 'midnight') {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 28,
        right: 28,
        zIndex: 5,
        maxWidth: 'min(320px, calc(100vw - 56px))',
        color: 'rgba(255,255,255,0.86)',
        textAlign: 'right',
        pointerEvents: 'none',
        textShadow: '0 2px 20px rgba(0,0,0,0.55)',
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9fc3ff' }}>Song World</div>
      <div style={{ marginTop: 8, fontSize: 24, fontWeight: 500, letterSpacing: '-0.03em' }}>{worldLabel}</div>
      <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.52)', fontSize: 13 }}>
        {track?.title ?? 'Track pending'} - {trackArtist} - {moodLine}
      </div>
      <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.42)', fontSize: 12 }}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
      {!canPlay && track ? (
        <div style={{ marginTop: 8, color: '#7f93b8', fontSize: 11 }}>
          Session restored from history. Select a local file to resume playback.
        </div>
      ) : null}
    </div>
  );
}

