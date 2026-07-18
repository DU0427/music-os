import { useRef } from 'react';
import { useAudioStore } from '../audio/store';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export default function AudioDock() {
  const inputRef = useRef<HTMLInputElement>(null);
  const track = useAudioStore((state) => state.track);
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const currentTime = useAudioStore((state) => state.currentTime);
  const duration = useAudioStore((state) => state.duration);
  const error = useAudioStore((state) => state.error);
  const canPlay = useAudioStore((state) => state.canPlay);
  const loadFile = useAudioStore((state) => state.loadFile);
  const play = useAudioStore((state) => state.play);
  const pause = useAudioStore((state) => state.pause);
  const seek = useAudioStore((state) => state.seek);
  const trackLabel = track ? `${track.title} - ${track.artist}${track.album ? ` - ${track.album}` : ''}` : null;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 24,
        zIndex: 10,
        width: 'min(520px, calc(100vw - 32px))',
        transform: 'translateX(-50%)',
        display: 'grid',
        gap: 8,
        padding: '12px 16px',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 24,
        background: 'rgba(10, 18, 34, 0.64)',
        color: '#fff',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.32)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          disabled={!track || !canPlay}
          onClick={() => (isPlaying ? pause() : void play())}
          style={{
            width: 36,
            height: 36,
            border: 0,
            borderRadius: '50%',
            background: track ? '#6EA8FF' : 'rgba(255,255,255,0.12)',
            color: '#05070D',
            cursor: track ? 'pointer' : 'default',
          }}
        >
          {isPlaying ? '||' : '>'}
        </button>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            minWidth: 0,
            flex: 1,
            overflow: 'hidden',
            border: 0,
            padding: 0,
            background: 'transparent',
            color: '#fff',
            textAlign: 'left',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
        >
          {trackLabel ?? 'Choose a local song to enter its world'}
        </button>

        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) {
            await loadFile(file);
          }
          event.target.value = '';
        }}
      />

      <input
        type="range"
        min={0}
        max={duration || 0.01}
        step={0.01}
        value={Math.min(currentTime, duration || 0.01)}
        disabled={!duration}
        onChange={(event) => seek(Number(event.target.value))}
        aria-label="Song progress"
        style={{ width: '100%', accentColor: '#6EA8FF' }}
      />

      {error && <div style={{ color: '#F0B56A', fontSize: 12 }}>{error}</div>}
    </div>
  );
}

