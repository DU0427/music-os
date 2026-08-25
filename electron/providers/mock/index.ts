import type {
  MusicProvider,
  PlayableSource,
  ProviderSearchQuery,
  ProviderSearchResult,
  ProviderTrack,
  ProviderTrackDetail,
  ProviderTrackReference,
} from '../../../src/shared/music/providers';

const MOCK_TRACK_DURATION_SECONDS = 2;
const MOCK_TRACK_FREQUENCY_HZ = 523.25;
const MOCK_TRACK_SAMPLE_RATE = 22050;

function createToneDataUrl(): string {
  const sampleCount = Math.max(1, Math.floor(MOCK_TRACK_SAMPLE_RATE * MOCK_TRACK_DURATION_SECONDS));
  const channelCount = 1;
  const bitsPerSample = 16;
  const blockAlign = channelCount * (bitsPerSample / 8);
  const byteRate = MOCK_TRACK_SAMPLE_RATE * blockAlign;
  const dataSize = sampleCount * blockAlign;
  const bufferSize = 44 + dataSize;
  const wav = Buffer.alloc(bufferSize);

  const header = Buffer.from('RIFF', 'ascii');
  header.copy(wav, 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  Buffer.from('WAVE', 'ascii').copy(wav, 8);
  Buffer.from('fmt ', 'ascii').copy(wav, 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channelCount, 22);
  wav.writeUInt32LE(MOCK_TRACK_SAMPLE_RATE, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);
  Buffer.from('data', 'ascii').copy(wav, 36);
  wav.writeUInt32LE(dataSize, 40);

  const amplitude = 0.22 * 0x7fff;
  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / MOCK_TRACK_SAMPLE_RATE;
    const sample = Math.sin(2 * Math.PI * MOCK_TRACK_FREQUENCY_HZ * time);
    const value = Math.max(-1, Math.min(1, sample * amplitude));
    wav.writeInt16LE(Math.floor(value), 44 + index * 2);
  }

  return `data:audio/wav;base64,${wav.toString('base64')}`;
}

const MOCK_TONE_SOURCE = createToneDataUrl();

const MOCK_TRACKS: ProviderTrack[] = [
  {
    reference: { providerId: 'mock', platformTrackId: 'midnight-city-design-reference' },
    title: 'Midnight City',
    artist: { id: 'mock-m83', name: 'M83 (design reference)' },
    album: { id: 'mock-hurry-up', title: 'Hurry Up, We\'re Dreaming (reference)', artworkUrl: null },
    durationSeconds: MOCK_TRACK_DURATION_SECONDS,
    artworkUrl: null,
  },
];

const resolveMockTrack = (reference: ProviderTrackReference) =>
  MOCK_TRACKS.find((candidate) => candidate.reference.platformTrackId === reference.platformTrackId);

export class MockMusicProvider implements MusicProvider {
  readonly id = 'mock' as const;
  readonly source = 'mock' as const;
  readonly capabilities = {
    search: true,
    trackDetails: true,
    playableSource: true,
    requiresAuthentication: false,
  } as const;

  async search(query: ProviderSearchQuery): Promise<ProviderSearchResult> {
    const text = query.text.trim().toLowerCase();
    const tracks = text
      ? MOCK_TRACKS.filter((track) => `${track.title} ${track.artist.name}`.toLowerCase().includes(text)).slice(0, query.limit)
      : [];

    return {
      providerId: this.id,
      query: query.text,
      tracks,
      nextCursor: null,
      source: this.source,
      error: null,
    };
  }

  async getTrack(reference: ProviderTrackReference): Promise<ProviderTrackDetail | null> {
    const track = resolveMockTrack(reference);
    return track
      ? {
          ...track,
          playableSource: {
            url: MOCK_TONE_SOURCE,
            mimeType: 'audio/wav',
            expiresAt: null,
            requiresAuth: false,
            licenseStatus: 'authorized',
          },
        }
      : null;
  }

  async getPlayableSource(reference: ProviderTrackReference): Promise<PlayableSource | null> {
    const track = resolveMockTrack(reference);
    if (!track) {
      return null;
    }

    return {
      url: MOCK_TONE_SOURCE,
      mimeType: 'audio/wav',
      expiresAt: null,
      requiresAuth: false,
      licenseStatus: 'authorized',
    };
  }
}
