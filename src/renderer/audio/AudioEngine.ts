import type { TrackIdentity } from '../../shared/ipc/music';

export interface AudioPlaybackState {
  track: TrackIdentity | null;
  isPlaying: boolean;
  canPlay: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  metrics: AudioMetrics;
}

export interface AudioMetrics {
  bass: number;
  mid: number;
  treble: number;
  energy: number;
  beatPulse: number;
}

type AudioStateListener = (state: AudioPlaybackState) => void;

const INITIAL_METRICS: AudioMetrics = {
  bass: 0,
  mid: 0,
  treble: 0,
  energy: 0,
  beatPulse: 0,
};

const INITIAL_STATE: AudioPlaybackState = {
  track: null,
  isPlaying: false,
  canPlay: false,
  currentTime: 0,
  duration: 0,
  error: null,
  metrics: { ...INITIAL_METRICS },
};

export class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private frequencyData = new Uint8Array(0);
  private objectUrl: string | null = null;
  private state: AudioPlaybackState = { ...INITIAL_STATE };
  private readonly listeners = new Set<AudioStateListener>();
  private readonly metrics: AudioMetrics = { ...INITIAL_METRICS };
  private energyFloor = 0;
  private lastFrameTime = Number.NaN;

  private readonly handleTimeUpdate = () => {
    if (!this.audio) {
      return;
    }
    this.state.currentTime = this.audio.currentTime;
    this.emitState();
  };

  private readonly handleMetadata = () => {
    if (!this.audio) {
      return;
    }
    this.state.duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    if (this.state.track) {
      this.state.track = {
        ...this.state.track,
        durationSeconds: this.state.duration,
      };
    }
    this.emitState();
  };

  private readonly handlePlay = () => {
    this.state.isPlaying = true;
    this.state.error = null;
    this.emitState();
  };

  private readonly handlePause = () => {
    this.state.isPlaying = false;
    this.emitState();
  };

  private readonly handleEnded = () => {
    this.state.isPlaying = false;
    this.state.currentTime = this.state.duration;
    this.emitState();
  };

  private readonly handleError = () => {
    this.state.isPlaying = false;
    this.state.canPlay = false;
    this.state.error = '所选音频源无法播放。';
    this.emitState();
  };

  private resetWithTrack(track: TrackIdentity | null) {
    this.state.track = track;
    this.state.isPlaying = false;
    this.state.currentTime = 0;
    this.state.duration = track?.durationSeconds ?? 0;
    this.state.error = null;
  }

  private ensureAudio() {
    if (this.audio) {
      return this.audio;
    }

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.addEventListener('timeupdate', this.handleTimeUpdate);
    audio.addEventListener('loadedmetadata', this.handleMetadata);
    audio.addEventListener('play', this.handlePlay);
    audio.addEventListener('pause', this.handlePause);
    audio.addEventListener('ended', this.handleEnded);
    audio.addEventListener('error', this.handleError);
    this.audio = audio;
    return audio;
  }

  private ensureGraph() {
    const audio = this.ensureAudio();
    if (this.context && this.analyser) {
      return;
    }

    const context = new AudioContext();
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.82;

    source.connect(analyser);
    analyser.connect(context.destination);

    this.context = context;
    this.source = source;
    this.analyser = analyser;
    this.frequencyData = new Uint8Array(analyser.frequencyBinCount);
  }

  async loadTrackFromFile(file: File, track: TrackIdentity) {
    this.resetWithTrack(track);
    this.ensureGraph();
    const audio = this.ensureAudio();
    audio.pause();

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }

    this.objectUrl = URL.createObjectURL(file);
    audio.src = this.objectUrl;
    audio.load();
    this.state.canPlay = true;
    this.resetMetrics();
    this.emitState();
  }

  loadTrackFromUrl(sourceUrl: string, track: TrackIdentity) {
    if (!sourceUrl || typeof sourceUrl !== 'string') {
      this.state.error = '无效的播放源地址。';
      this.state.isPlaying = false;
      this.state.canPlay = false;
      this.emitState();
      return;
    }

    this.resetWithTrack(track);
    this.ensureGraph();
    const audio = this.ensureAudio();
    audio.pause();

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    audio.src = sourceUrl;
    audio.load();
    this.state.canPlay = true;
    this.resetMetrics();
    this.emitState();
  }

  restoreTrack(track: TrackIdentity, positionSeconds: number) {
    if (this.audio && this.audio.src && !this.audio.src.startsWith('blob:')) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    this.resetWithTrack(track);
    this.state.canPlay = false;
    this.state.currentTime = Number.isFinite(positionSeconds)
      ? Math.max(0, positionSeconds)
      : 0;
    const sourceHint = track.providerId === 'local-file' ? 'local file' : 'provider source';
    this.state.error = `恢复播放需要有效的${sourceHint}。`;
    this.resetMetrics();
    this.emitState();
  }

  async play() {
    if (!this.state.canPlay || !this.audio?.src) {
      this.state.error = '当前曲目未加载可播放源。';
      this.state.isPlaying = false;
      this.emitState();
      return;
    }

    this.ensureGraph();
    this.state.error = null;
    await this.context?.resume();

    try {
      await this.audio.play();
    } catch {
      this.state.error = '请先加载有效的本地音频源后再播放。';
      this.emitState();
    }
  }

  pause() {
    this.audio?.pause();
  }

  seek(seconds: number) {
    if (!this.audio || !Number.isFinite(seconds)) {
      return;
    }
    const duration = this.state.duration || this.audio.duration;
    this.audio.currentTime = Math.max(0, Math.min(seconds, duration || seconds));
    this.handleTimeUpdate();
  }

  getState() {
    return {
      ...this.state,
      track: this.state.track ? { ...this.state.track } : null,
      metrics: { ...this.state.metrics },
    };
  }

  getMetrics(frameTime?: number): AudioMetrics {
    if (frameTime !== undefined && frameTime === this.lastFrameTime) {
      return { ...this.metrics };
    }
    if (frameTime !== undefined) {
      this.lastFrameTime = frameTime;
    }

    if (!this.analyser || !this.context || !this.state.isPlaying) {
      this.decayMetrics();
      this.state.metrics = { ...this.metrics };
      return { ...this.metrics };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    const bass = this.averageBand(20, 180);
    const mid = this.averageBand(180, 2_000);
    const treble = this.averageBand(2_000, 8_000);
    const energy = bass * 0.45 + mid * 0.35 + treble * 0.2;
    const smoothing = 0.16;

    this.metrics.bass += (bass - this.metrics.bass) * smoothing;
    this.metrics.mid += (mid - this.metrics.mid) * smoothing;
    this.metrics.treble += (treble - this.metrics.treble) * smoothing;
    this.metrics.energy += (energy - this.metrics.energy) * smoothing;

    const beat = Math.max(0, energy - this.energyFloor - 0.04);
    this.energyFloor += (energy - this.energyFloor) * 0.04;
    this.metrics.beatPulse = Math.max(beat * 2, this.metrics.beatPulse * 0.84);
    this.state.metrics = { ...this.metrics };
    return this.state.metrics;
  }

  subscribe(listener: AudioStateListener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  dispose() {
    const audio = this.audio;
    audio?.pause();
    audio?.removeEventListener('timeupdate', this.handleTimeUpdate);
    audio?.removeEventListener('loadedmetadata', this.handleMetadata);
    audio?.removeEventListener('play', this.handlePlay);
    audio?.removeEventListener('pause', this.handlePause);
    audio?.removeEventListener('ended', this.handleEnded);
    audio?.removeEventListener('error', this.handleError);
    audio?.removeAttribute('src');
    audio?.load();

    this.source?.disconnect();
    this.analyser?.disconnect();
    void this.context?.close();

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }

    this.audio = null;
    this.context = null;
    this.source = null;
    this.analyser = null;
    this.objectUrl = null;
    this.listeners.clear();
    this.state = { ...INITIAL_STATE };
    this.resetMetrics();
  }

  private averageBand(minHz: number, maxHz: number) {
    if (!this.context || !this.analyser || this.frequencyData.length === 0) {
      return 0;
    }

    const nyquist = this.context.sampleRate / 2;
    const start = Math.max(0, Math.floor((minHz / nyquist) * this.frequencyData.length));
    const end = Math.min(this.frequencyData.length, Math.ceil((maxHz / nyquist) * this.frequencyData.length));
    if (end <= start) {
      return 0;
    }

    let total = 0;
    for (let index = start; index < end; index += 1) {
      total += this.frequencyData[index];
    }
    return total / ((end - start) * 255);
  }

  private decayMetrics() {
    this.metrics.bass *= 0.9;
    this.metrics.mid *= 0.9;
    this.metrics.treble *= 0.9;
    this.metrics.energy *= 0.9;
    this.metrics.beatPulse *= 0.78;
  }

  private resetMetrics() {
    Object.assign(this.metrics, INITIAL_METRICS);
    this.energyFloor = 0;
    this.lastFrameTime = Number.NaN;
  }

  private emitState() {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

