import type {
  MusicProvider,
  PlayableSource,
  ProviderSearchQuery,
  ProviderSearchResult,
  ProviderTrack,
  ProviderTrackDetail,
  ProviderTrackReference,
} from '../../../src/shared/music/providers';

const MOCK_TRACKS: ProviderTrack[] = [
  {
    reference: { providerId: 'mock', platformTrackId: 'midnight-city-design-reference' },
    title: 'Midnight City',
    artist: { id: 'mock-m83', name: 'M83 (design reference)' },
    album: { id: 'mock-hurry-up', title: 'Hurry Up, We\'re Dreaming (reference)', artworkUrl: null },
    durationSeconds: 0,
    artworkUrl: null,
  },
];

export class MockMusicProvider implements MusicProvider {
  readonly id = 'mock' as const;
  readonly source = 'mock' as const;
  readonly capabilities = {
    search: true,
    trackDetails: true,
    playableSource: false,
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
    const track = MOCK_TRACKS.find((candidate) => candidate.reference.platformTrackId === reference.platformTrackId);
    return track ? { ...track, playableSource: null } : null;
  }

  async getPlayableSource(_reference: ProviderTrackReference): Promise<PlayableSource | null> {
    return null;
  }
}
